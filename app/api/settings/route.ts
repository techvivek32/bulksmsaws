import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'master_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const settings = await Settings.findOne();
  // Mask sensitive fields for display
  const masked = settings?.apiKey
    ? settings.apiKey.slice(0, 6) + '••••••••' + settings.apiKey.slice(-4)
    : '';
  const maskedTwilioToken = settings?.twilioAuthToken
    ? settings.twilioAuthToken.slice(0, 4) + '••••••••' + settings.twilioAuthToken.slice(-4)
    : '';

  return NextResponse.json({
    apiKey:               masked,
    senderNumber:         settings?.senderNumber         || '',
    dailyLimit:           settings?.dailyLimit           || 2000,
    messageTemplate:      settings?.messageTemplate      || '',
    twilioAccountSid:     settings?.twilioAccountSid     || '',
    twilioAuthToken:      maskedTwilioToken,
    twilioWhatsappFrom:   settings?.twilioWhatsappFrom   || 'whatsapp:+14155238886',
    whatsappAlertNumbers: settings?.whatsappAlertNumbers || '',
  });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'master_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const { apiKey, senderNumber, dailyLimit, messageTemplate,
          twilioAccountSid, twilioAuthToken, twilioWhatsappFrom, whatsappAlertNumbers } = await req.json();

  const update: any = { senderNumber, dailyLimit, messageTemplate,
                        twilioWhatsappFrom, whatsappAlertNumbers };

  if (apiKey && !apiKey.includes('••••'))             update.apiKey           = apiKey;
  if (twilioAccountSid)                               update.twilioAccountSid = twilioAccountSid;
  if (twilioAuthToken && !twilioAuthToken.includes('••••')) update.twilioAuthToken = twilioAuthToken;

  const settings = await Settings.findOneAndUpdate({}, update, { upsert: true, new: true });
  return NextResponse.json({ success: true, settings });
}
