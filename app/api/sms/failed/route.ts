import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';

export async function GET(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const messages = await SMS.find({ status: 'failed' })
    .sort({ createdAt: -1 })
    .select('phone message status error createdAt campaign');

  return NextResponse.json({ messages });
}
