import mongoose, { Schema, Document } from 'mongoose';

export type SMSStatus = 'pending' | 'sent' | 'failed';

export interface ISMS extends Document {
  phone: string;
  message: string;
  patientName?: string;
  email?: string;
  status: SMSStatus;
  error?: string;
  campaign?: string;
  telnyxMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SMSSchema = new Schema<ISMS>(
  {
    phone: { type: String, required: true },
    message: { type: String },
    patientName: { type: String },
    email: { type: String },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    error: { type: String },
    campaign: { type: String },
    telnyxMessageId: { type: String },
  },
  { timestamps: true }
);

// Index for fast queries
SMSSchema.index({ status: 1 });
SMSSchema.index({ createdAt: -1 });
SMSSchema.index({ campaign: 1 });

export default mongoose.models.SMS || mongoose.model<ISMS>('SMS', SMSSchema);
