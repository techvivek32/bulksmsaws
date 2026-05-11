import mongoose, { Schema, Document } from 'mongoose';

export interface IChatFilter extends Document {
  name: string;
  color: string;
  phones: string[]; // Array of phone numbers in this filter
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChatFilterSchema = new Schema<IChatFilter>(
  {
    name:   { type: String, required: true },
    color:  { type: String, default: 'blue' },
    phones: [{ type: String }],
    order:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChatFilterSchema.index({ order: 1 });

export default mongoose.models.ChatFilter ||
  mongoose.model<IChatFilter>('ChatFilter', ChatFilterSchema);
