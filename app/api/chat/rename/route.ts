import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';

// Update patientName for all SMS records matching a phone number
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { phone, name } = await req.json();

  if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

  // Update all SMS records for this phone
  await SMS.updateMany({ phone }, { patientName: name?.trim() || '' });

  return NextResponse.json({ success: true, phone, name: name?.trim() || '' });
}
