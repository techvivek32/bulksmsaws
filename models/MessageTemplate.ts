import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageTemplate extends Document {
  title: string;
  body: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const MessageTemplateSchema = new Schema<IMessageTemplate>(
  {
    title: { type: String, required: true },
    body:  { type: String, required: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

MessageTemplateSchema.index({ order: 1 });

export default mongoose.models.MessageTemplate ||
  mongoose.model<IMessageTemplate>('MessageTemplate', MessageTemplateSchema);
