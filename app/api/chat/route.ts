import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Inbound from '@/models/Inbound';
import OutboundReply from '@/models/OutboundReply';
import SMS from '@/models/SMS';
import { sendSMS, getTelnyxConfig } from '@/lib/telnyx';

// GET /api/chat
// ?contacts=1  → returns unique contact list with last message + unread count
// ?phone=+1xxx → returns full conversation for that phone number
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  // ── Conversation for a specific phone ──
  if (phone) {
    // Mark all inbound messages from this phone as read
    await Inbound.updateMany({ from: phone, read: false }, { read: true });

    const [inbound, outbound] = await Promise.all([
      Inbound.find({ from: phone }).lean(),
      OutboundReply.find({ to: phone }).lean(),
    ]);

    // Merge and sort by timestamp
    const messages = [
      ...inbound.map((m: any) => ({
        _id: m._id.toString(),
        direction: 'inbound' as const,
        text: m.message,
        timestamp: m.timestamp,
      })),
      ...outbound.map((m: any) => ({
        _id: m._id.toString(),
        direction: 'outbound' as const,
        text: m.message,
        timestamp: m.timestamp,
      })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return NextResponse.json({ messages });
  }

  // ── Contact list ──
  const contacts = await Inbound.aggregate([
    {
      $group: {
        _id:         '$from',
        lastMessage: { $last: '$message' },
        lastTime:    { $max: '$timestamp' },
        unread:      { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } },
      },
    },
    { $sort: { lastTime: -1 } },
  ]);

  // Look up patient names from SMS records by phone number
  const phones = contacts.map((c: any) => c._id);
  const smsRecords = await SMS.find({ phone: { $in: phones } })
    .select('phone patientName')
    .lean();

  // Build phone → name map (use first match found)
  const nameMap: Record<string, string> = {};
  for (const s of smsRecords as any[]) {
    if (s.patientName && !nameMap[s.phone]) {
      nameMap[s.phone] = s.patientName;
    }
  }

  // Attach name to each contact
  const contactsWithNames = contacts.map((c: any) => ({
    ...c,
    patientName: nameMap[c._id] || '',
    unread: c.unread || 0,
  }));

  return NextResponse.json({ contacts: contactsWithNames });
}

// POST /api/chat — send a reply from admin to a patient
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { to, message } = await req.json();

  if (!to || !message?.trim()) {
    return NextResponse.json({ error: 'to and message are required' }, { status: 400 });
  }

  const { senderNumber } = await getTelnyxConfig();
  const result = await sendSMS(to, message.trim());

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Save outbound reply
  const reply = await OutboundReply.create({
    to,
    from: senderNumber,
    message: message.trim(),
    telnyxMessageId: result.messageId,
    timestamp: new Date(),
  });

  return NextResponse.json({ success: true, reply });
}
