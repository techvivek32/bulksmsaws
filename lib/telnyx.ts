import axios from 'axios';
import { connectDB } from './mongodb';
import Settings from '@/models/Settings';

// Fetch settings from DB (with env fallback)
async function getTelnyxConfig() {
  await connectDB();
  const settings = await Settings.findOne();
  return {
    apiKey: settings?.apiKey || process.env.TELNYX_API_KEY || '',
    senderNumber: settings?.senderNumber || process.env.TELNYX_SENDER_NUMBER || '',
    dailyLimit: settings?.dailyLimit || Number(process.env.DAILY_SMS_LIMIT) || 2000,
  };
}

export interface SendSMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Send a single SMS via Telnyx REST API
export async function sendSMS(to: string, text: string): Promise<SendSMSResult> {
  try {
    const { apiKey, senderNumber } = await getTelnyxConfig();

    if (!apiKey || !senderNumber) {
      return { success: false, error: 'Telnyx API key or sender number not configured' };
    }

    const response = await axios.post(
      'https://api.telnyx.com/v2/messages',
      {
        from: senderNumber,
        to,
        text,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true, messageId: response.data?.data?.id };
  } catch (err: any) {
    const errorMsg =
      err?.response?.data?.errors?.[0]?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      'Unknown error';
    return { success: false, error: errorMsg };
  }
}

// Delay helper
export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// Random delay between min and max ms
export const randomDelay = (min = 200, max = 300) =>
  delay(Math.floor(Math.random() * (max - min + 1)) + min);

export { getTelnyxConfig };
