import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  apiKey: string;
  senderNumber: string;
  dailyLimit: number;
  messageTemplate: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    apiKey: { type: String, default: '' },
    senderNumber: { type: String, default: '' },
    dailyLimit: { type: Number, default: 2000 },
    messageTemplate: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
