import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface MatchDocument extends Document {
  postAId: Types.ObjectId;
  postBId: Types.ObjectId;
  category: string;
  round: number;
  status: 'ongoing' | 'finished';
  winnerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<MatchDocument>(
  {
    postAId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    postBId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    category: { type: String, required: true, index: true },
    round: { type: Number, default: 1, index: true },
    status: { type: String, enum: ['ongoing', 'finished'], default: 'ongoing', index: true },
    winnerId: { type: Schema.Types.ObjectId, ref: 'Post' },
  },
  { timestamps: true }
);

export const Match: Model<MatchDocument> = mongoose.models.Match || mongoose.model<MatchDocument>('Match', MatchSchema);


