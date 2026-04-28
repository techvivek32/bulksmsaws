import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';
import { sendSMS, randomDelay, getTelnyxConfig } from '@/lib/telnyx';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const { campaign } = await req.json().catch(() => ({}));

    // Load settings: daily limit + message template
    const { dailyLimit } = await getTelnyxConfig();
    const Settings = (await import('@/models/Settings')).default;
    const settings = await Settings.findOne();
    const template = settings?.messageTemplate?.trim();

    if (!template) {
      return NextResponse.json(
        { error: 'No message template configured. Please set one in Settings.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const sentToday = await SMS.countDocuments({
      status: 'sent',
      createdAt: { $gte: startOfDay(now), $lte: endOfDay(now) },
    });

    if (sentToday >= dailyLimit) {
      return NextResponse.json({ error: `Daily limit of ${dailyLimit} reached` }, { status: 429 });
    }

    const remaining = dailyLimit - sentToday;

    // Fetch pending messages (up to remaining limit)
    const query: any = { status: 'pending' };
    if (campaign) query.campaign = campaign;

    const messages = await SMS.find(query).limit(remaining);

    if (!messages.length) {
      return NextResponse.json({ message: 'No pending messages', sent: 0, failed: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      // Build message from template — {name} is replaced with patient name
      const text = template.replace(/\{name\}/gi, msg.patientName || '').trim();
      const result = await sendSMS(msg.phone, text);

      if (result.success) {
        msg.status = 'sent';
        msg.telnyxMessageId = result.messageId;
        msg.error = undefined;
        sent++;
      } else {
        msg.status = 'failed';
        msg.error = result.error;
        failed++;
      }

      await msg.save();
      await randomDelay(200, 300);
    }

    return NextResponse.json({ success: true, sent, failed, total: messages.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
