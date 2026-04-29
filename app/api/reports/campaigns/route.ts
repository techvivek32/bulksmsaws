import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';

// Returns list of campaigns with stats, supports status + date filters
export async function GET(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const from   = searchParams.get('from');
  const to     = searchParams.get('to');

  // Build match stage for filters
  const match: any = {};
  if (status && status !== 'all') match.status = status;
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to)   match.createdAt.$lte = new Date(to + 'T23:59:59');
  }

  const pipeline: any[] = [];
  if (Object.keys(match).length) pipeline.push({ $match: match });

  pipeline.push(
    {
      $group: {
        _id:       { $ifNull: ['$campaign', '(No Campaign)'] },
        total:     { $sum: 1 },
        sent:      { $sum: { $cond: [{ $eq: ['$status', 'sent'] },    1, 0] } },
        failed:    { $sum: { $cond: [{ $eq: ['$status', 'failed'] },  1, 0] } },
        pending:   { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        lastSent:  { $max: '$createdAt' },
        firstSent: { $min: '$createdAt' },
      },
    },
    { $sort: { lastSent: -1 } }
  );

  const campaigns = await SMS.aggregate(pipeline);
  return NextResponse.json({ campaigns });
}
