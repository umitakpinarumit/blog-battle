import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface PostDocument extends Document {
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  authorId: Types.ObjectId;
  status: 'approved' | 'pending' | 'rejected';
  views: number;
  interactions: number;
  engagementScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<PostDocument>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true, index: true },
    imageUrl: { type: String },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['approved', 'pending', 'rejected'], default: 'approved' },
    views: { type: Number, default: 0, index: true },
    interactions: { type: Number, default: 0, index: true },
    engagementScore: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

export const Post: Model<PostDocument> = mongoose.models.Post || mongoose.model<PostDocument>('Post', PostSchema);


