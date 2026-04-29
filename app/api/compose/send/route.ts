import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';
import { sendSMS, getTelnyxConfig } from '@/lib/telnyx';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, message } = await req.json();

    // Validation
    if (!to || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanPhone = to.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;

    // Validate phone number length
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    await connectDB();

    // Send via Telnyx
    let status: 'sent' | 'failed' = 'sent';
    let errorMessage = '';

    const result = await sendSMS(formattedPhone, message);
    
    if (!result.success) {
      status = 'failed';
      errorMessage = result.error || 'Failed to send SMS';
    }

    // Save to database
    const smsRecord = await SMS.create({
      patientName: '', // No name for manual compose
      phone: formattedPhone,
      email: '',
      message,
      status,
      campaign: 'manual-compose',
      sentBy: user.email,
      sentAt: status === 'sent' ? new Date() : null,
      error: errorMessage || undefined,
      telnyxMessageId: result.messageId,
    });

    if (status === 'failed') {
      return NextResponse.json(
        { error: errorMessage || 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: smsRecord._id,
      status,
    });
  } catch (error: any) {
    console.error('Compose send error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
