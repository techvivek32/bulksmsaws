import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';

// Save parsed SMS records to DB with status "pending"
export async function POST(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const { rows, campaign } = await req.json();

    if (!rows?.length) {
      return NextResponse.json({ error: 'No records to save' }, { status: 400 });
    }

    const docs = rows.map((r: { phone: string; message?: string; patientName?: string; email?: string }) => ({
      phone: r.phone,
      message: r.message || '',
      patientName: r.patientName || '',
      email: r.email || '',
      status: 'pending',
      campaign: campaign || '',
    }));

    const inserted = await SMS.insertMany(docs);
    return NextResponse.json({ success: true, count: inserted.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
