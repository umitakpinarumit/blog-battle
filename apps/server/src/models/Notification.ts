import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface NotificationDocument extends Document {
  userId: Types.ObjectId;
  type: 'match' | 'post' | 'vote' | 'tournament' | 'round' | 'system';
  message: string;
  meta?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['match','post','vote','tournament','round','system'], required: true },
    message: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Notification: Model<NotificationDocument> = mongoose.models.Notification || mongoose.model<NotificationDocument>('Notification', NotificationSchema);


