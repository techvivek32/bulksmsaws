import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Inbound from '@/models/Inbound';

// DELETE selected inbound messages by IDs
export async function POST(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  await connectDB();
  const { ids } = await req.json();
  if (!ids?.length) return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
  const result = await Inbound.deleteMany({ _id: { $in: ids } });
  return NextResponse.json({ success: true, deleted: result.deletedCount });
}
