import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';
import Settings from '@/models/Settings';
import { sendSMS, randomDelay, getTelnyxConfig } from '@/lib/telnyx';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await connectDB();
    const { campaign } = await req.json().catch(() => ({}));

    // Load settings
    const { dailyLimit } = await getTelnyxConfig();
    const settings = await Settings.findOne().lean();
    const template = (settings?.messageTemplate || '').trim();

    if (!template) {
      return new Response(JSON.stringify({ 
        error: 'No message template configured. Please set one in Settings.' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = new Date();
    const sentToday = await SMS.countDocuments({
      status: 'sent',
      createdAt: { $gte: startOfDay(now), $lte: endOfDay(now) },
    });

    if (sentToday >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: `Daily limit of ${dailyLimit} reached` 
      }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const remaining = dailyLimit - sentToday;

    // Fetch pending messages
    const query: any = { status: 'pending' };
    if (campaign) query.campaign = campaign;

    const messages = await SMS.find(query).limit(remaining);

    if (!messages.length) {
      return new Response(JSON.stringify({ 
        message: 'No pending messages', 
        sent: 0, 
        failed: 0 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let sent = 0;
        let failed = 0;

        // Send initial status
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'start',
          total: messages.length
        }) + '\n'));

        for (const msg of messages) {
          // Normalize phone
          const rawPhone = msg.phone || '';
          const digits = rawPhone.replace(/\D/g, '');
          let phone = rawPhone;
          if (digits.length === 10) phone = `+1${digits}`;
          else if (digits.length === 11 && digits.startsWith('1')) phone = `+${digits}`;
          else if (!rawPhone.startsWith('+')) phone = `+${digits}`;

          // Build message from template
          const text = (template || msg.message || '')
            .replace(/\{name\}/gi, msg.patientName || '')
            .trim();

          // Send progress update - sending
          controller.enqueue(encoder.encode(JSON.stringify({
            type: 'progress',
            phone: msg.phone,
            name: msg.patientName,
            status: 'sending',
            sent,
            failed,
            total: messages.length
          }) + '\n'));

          if (!text) {
            msg.status = 'failed';
            msg.error = 'No message text available';
            await msg.save();
            failed++;

            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'progress',
              phone: msg.phone,
              name: msg.patientName,
              status: 'failed',
              error: 'No message text available',
              sent,
              failed,
              total: messages.length
            }) + '\n'));
            continue;
          }

          const result = await sendSMS(phone, text);

          if (result.success) {
            msg.status = 'sent';
            msg.telnyxMessageId = result.messageId;
            msg.error = undefined;
            sent++;

            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'progress',
              phone: msg.phone,
              name: msg.patientName,
              status: 'sent',
              sent,
              failed,
              total: messages.length
            }) + '\n'));
          } else {
            msg.status = 'failed';
            msg.error = result.error;
            failed++;

            controller.enqueue(encoder.encode(JSON.stringify({
              type: 'progress',
              phone: msg.phone,
              name: msg.patientName,
              status: 'failed',
              error: result.error,
              sent,
              failed,
              total: messages.length
            }) + '\n'));
          }

          await msg.save();
          await randomDelay(200, 300);
        }

        // Send completion
        controller.enqueue(encoder.encode(JSON.stringify({
          type: 'complete',
          sent,
          failed,
          total: messages.length
        }) + '\n'));

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
