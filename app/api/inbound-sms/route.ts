import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Inbound from '@/models/Inbound';

// Telnyx webhook for inbound SMS
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // Telnyx webhook payload structure
    const event = body?.data;
    if (event?.event_type !== 'message.received') {
      return NextResponse.json({ received: true });
    }

    const payload = event?.payload;
    const from = payload?.from?.phone_number || payload?.from || '';
    const to = payload?.to?.[0]?.phone_number || payload?.to || '';
    const text = payload?.text || '';
    const messageId = payload?.id || '';

    if (!from || !text) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await Inbound.create({
      from,
      to,
      message: text,
      telnyxMessageId: messageId,
      timestamp: new Date(),
    });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Inbound SMS error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Get all inbound messages (authenticated)
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const messages = await Inbound.find().sort({ timestamp: -1 }).limit(100);
    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
