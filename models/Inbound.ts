import mongoose, { Schema, Document } from 'mongoose';

export interface IInbound extends Document {
  from: string;
  to: string;
  message: string;
  telnyxMessageId?: string;
  timestamp: Date;
}

const InboundSchema = new Schema<IInbound>(
  {
    from: { type: String, required: true },
    to: { type: String },
    message: { type: String, required: true },
    telnyxMessageId: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

InboundSchema.index({ timestamp: -1 });

export default mongoose.models.Inbound || mongoose.model<IInbound>('Inbound', InboundSchema);
