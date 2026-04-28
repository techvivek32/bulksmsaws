import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';
import SMS from '@/models/SMS';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function GET(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Summary counts
  const [total, sentToday, failed, pending] = await Promise.all([
    SMS.countDocuments(),
    SMS.countDocuments({ status: 'sent', createdAt: { $gte: todayStart, $lte: todayEnd } }),
    SMS.countDocuments({ status: 'failed' }),
    SMS.countDocuments({ status: 'pending' }),
  ]);

  // Recent 10 messages
  const recent = await SMS.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select('phone message status createdAt campaign');

  // Daily stats for last 7 days
  const dailyStats = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const day = subDays(now, 6 - i);
      return SMS.countDocuments({
        createdAt: { $gte: startOfDay(day), $lte: endOfDay(day) },
      }).then((count) => ({ date: format(day, 'MMM dd'), count }));
    })
  );

  return NextResponse.json({ total, sentToday, failed, pending, recent, dailyStats });
}
