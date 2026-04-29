import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';

export async function GET(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const campaign = searchParams.get('campaign') || '';
  const from     = searchParams.get('from') || '';
  const to       = searchParams.get('to') || '';

  const query: any = { status: 'failed' };
  if (campaign) query.campaign = campaign;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to)   query.createdAt.$lte = new Date(to + 'T23:59:59');
  }

  const messages = await SMS.find(query)
    .sort({ createdAt: -1 })
    .select('phone patientName message status error createdAt campaign');

  return NextResponse.json({ messages });
}
