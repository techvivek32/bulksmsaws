import mongoose, { Schema, Document } from 'mongoose';

// Stores admin replies sent from the chat UI
export interface IOutboundReply extends Document {
  to: string;       // patient phone
  from: string;     // sender number (our Telnyx number)
  message: string;
  telnyxMessageId?: string;
  timestamp: Date;
}

const OutboundReplySchema = new Schema<IOutboundReply>(
  {
    to:               { type: String, required: true },
    from:             { type: String, required: true },
    message:          { type: String, required: true },
    telnyxMessageId:  { type: String },
    timestamp:        { type: Date, default: Date.now },
  },
  { timestamps: true }
);

OutboundReplySchema.index({ to: 1, timestamp: 1 });

export default mongoose.models.OutboundReply ||
  mongoose.model<IOutboundReply>('OutboundReply', OutboundReplySchema);
