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

    for (const msg of messages) {
      const result = await sendSMS(msg.phone, msg.message);

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
