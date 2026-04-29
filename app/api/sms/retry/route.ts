import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';
import Settings from '@/models/Settings';
import { sendSMS, randomDelay, getTelnyxConfig } from '@/lib/telnyx';
import { startOfDay, endOfDay } from 'date-fns';

// Normalize any phone format to E.164
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}

export async function POST(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const { ids } = await req.json().catch(() => ({}));

    // Check daily limit
    const { dailyLimit } = await getTelnyxConfig();
    const now = new Date();
    const sentToday = await SMS.countDocuments({
      status: 'sent',
      createdAt: { $gte: startOfDay(now), $lte: endOfDay(now) },
    });

    if (sentToday >= dailyLimit) {
      return NextResponse.json({ error: `Daily limit of ${dailyLimit} reached` }, { status: 429 });
    }

    // Fetch specific IDs or all failed
    const query: any = ids?.length ? { _id: { $in: ids }, status: 'failed' } : { status: 'failed' };
    const messages = await SMS.find(query).limit(dailyLimit - sentToday);

    if (!messages.length) {
      return NextResponse.json({ message: 'No failed messages to retry', sent: 0, failed: 0 });
    }

    // Reset to pending first
    await SMS.updateMany({ _id: { $in: messages.map((m) => m._id) } }, { status: 'pending', error: undefined });

    let sent = 0;
    let failed = 0;

    // Load template from settings
    const settings = await Settings.findOne().lean();
    const template = (settings?.messageTemplate || '').trim();

    for (const msg of messages) {
      const phone = normalizePhone(msg.phone || '');
      const text = (template || msg.message || '').replace(/\{name\}/gi, msg.patientName || '').trim();

      if (!text) {
        msg.status = 'failed';
        msg.error = 'No message text — check Settings template';
        await msg.save();
        failed++;
        continue;
      }

      const result = await sendSMS(phone, text);

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
