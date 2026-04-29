import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';

// Delete all SMS records belonging to given campaign names
export async function POST(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await connectDB();
  const { campaigns } = await req.json();
  if (!campaigns?.length) return NextResponse.json({ error: 'No campaigns provided' }, { status: 400 });

  const result = await SMS.deleteMany({ campaign: { $in: campaigns } });
  return NextResponse.json({ success: true, deleted: result.deletedCount });
}
