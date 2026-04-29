import axios from 'axios';
import { connectDB } from './mongodb';
import Settings from '@/models/Settings';

export interface WhatsAppAlertData {
  patientName: string;
  patientPhone: string;
  message: string;
  inboxUrl: string;
}

// Send WhatsApp alert to all configured admin numbers via Twilio
export async function sendWhatsAppAlert(data: WhatsAppAlertData): Promise<void> {
  try {
    await connectDB();
    const settings = await Settings.findOne().lean() as any;

    const accountSid     = settings?.twilioAccountSid     || '';
    const authToken      = settings?.twilioAuthToken      || '';
    const fromNumber     = settings?.twilioWhatsappFrom   || 'whatsapp:+14155238886';
    const alertNumbers   = settings?.whatsappAlertNumbers || '';

    if (!accountSid || !authToken || !alertNumbers) {
      console.log('WhatsApp alerts not configured — skipping');
      return;
    }

    // Parse comma-separated numbers
    const recipients = alertNumbers
      .split(',')
      .map((n: string) => n.trim())
      .filter(Boolean);

    const body =
      `🔔 *New Patient Reply!*\n\n` +
      `👤 *Patient:* ${data.patientName || 'Unknown'}\n` +
      `📱 *Phone:* ${data.patientPhone}\n` +
      `💬 *Message:* ${data.message}\n\n` +
      `👉 *Open Chat:* ${data.inboxUrl}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    // Send to all recipients
    await Promise.all(
      recipients.map((to: string) => {
        const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
        return axios.post(
          twilioUrl,
          new URLSearchParams({ From: fromNumber, To: toFormatted, Body: body }),
          {
            auth: { username: accountSid, password: authToken },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        ).catch((err) => {
          console.error(`WhatsApp alert failed for ${to}:`, err?.response?.data || err.message);
        });
      })
    );

    console.log(`WhatsApp alerts sent to: ${recipients.join(', ')}`);
  } catch (err: any) {
    console.error('WhatsApp alert error:', err.message);
  }
}
