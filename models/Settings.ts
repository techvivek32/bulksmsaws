import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  apiKey: string;
  senderNumber: string;
  dailyLimit: number;
  messageTemplate: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioWhatsappFrom: string;
  whatsappAlertNumbers: string; // comma-separated
}

const SettingsSchema = new Schema<ISettings>(
  {
    apiKey:               { type: String, default: '' },
    senderNumber:         { type: String, default: '' },
    dailyLimit:           { type: Number, default: 2000 },
    messageTemplate:      { type: String, default: '' },
    twilioAccountSid:     { type: String, default: '' },
    twilioAuthToken:      { type: String, default: '' },
    twilioWhatsappFrom:   { type: String, default: 'whatsapp:+14155238886' },
    whatsappAlertNumbers: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
