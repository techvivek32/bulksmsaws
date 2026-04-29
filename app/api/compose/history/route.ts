import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Fetch messages sent via compose (manual-compose campaign)
    // Sort by most recent first, limit to last 50
    const messages = await SMS.find({
      campaign: 'manual-compose',
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('phone patientName message status createdAt sentAt')
      .lean();

    // Format response
    const formattedMessages = messages.map((msg: any) => ({
      _id: msg._id.toString(),
      to: msg.phone,
      patientName: msg.patientName || undefined,
      message: msg.message,
      status: msg.status,
      timestamp: msg.sentAt || msg.createdAt,
    }));

    return NextResponse.json({
      messages: formattedMessages,
    });
  } catch (error: any) {
    console.error('Compose history error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
