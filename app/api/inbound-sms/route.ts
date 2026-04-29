import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import Inbound from '@/models/Inbound';
import SMS from '@/models/SMS';
import { sendWhatsAppAlert } from '@/lib/whatsapp';

// Telnyx webhook for inbound SMS
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    // Log full payload for debugging
    console.log('Inbound webhook received:', JSON.stringify(body, null, 2));

    // Telnyx can send payload in different structures — handle all
    const event = body?.data || body;
    const eventType = event?.event_type || body?.event_type || '';

    // Accept message.received or no event type (some Telnyx versions)
    if (eventType && eventType !== 'message.received') {
      console.log('Ignoring event type:', eventType);
      return NextResponse.json({ received: true });
    }

    const payload = event?.payload || event;

    // Handle all possible from/to formats Telnyx sends
    const from =
      payload?.from?.phone_number ||
      payload?.from ||
      body?.from ||
      '';

    const to =
      payload?.to?.[0]?.phone_number ||
      payload?.to?.[0] ||
      payload?.to ||
      body?.to ||
      '';

    const text =
      payload?.text ||
      payload?.body ||
      body?.text ||
      body?.body ||
      '';

    const messageId = payload?.id || event?.id || body?.id || '';

    console.log('Parsed inbound — from:', from, 'to:', to, 'text:', text);

    if (!from && !text) {
      console.log('Empty payload, skipping');
      return NextResponse.json({ received: true });
    }

    await Inbound.create({
      from: from || 'unknown',
      to: to || '',
      message: text || '(no text)',
      telnyxMessageId: messageId,
      timestamp: new Date(),
    });

    // Look up patient name from SMS records
    const smsRecord = await SMS.findOne({ phone: from }).select('patientName').lean() as any;
    const patientName = smsRecord?.patientName || '';

    // Send WhatsApp alert to admins (non-blocking)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bulksmsaws.vercel.app';
    sendWhatsAppAlert({
      patientName,
      patientPhone: from || 'unknown',
      message: text || '(no text)',
      inboxUrl: `${appUrl}/inbox`,
    }).catch(() => {});

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Inbound SMS error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Get all inbound messages — any authenticated user
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await connectDB();
    const messages = await Inbound.find().sort({ timestamp: -1 }).limit(100);
    return NextResponse.json({ messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
