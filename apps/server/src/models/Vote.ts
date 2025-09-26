import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface VoteDocument extends Document {
  userId: Types.ObjectId;
  matchId: Types.ObjectId;
  choice: 'A' | 'B';
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema = new Schema<VoteDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    choice: { type: String, enum: ['A', 'B'], required: true },
  },
  { timestamps: true }
);

VoteSchema.index({ userId: 1, matchId: 1 }, { unique: true });

export const Vote: Model<VoteDocument> = mongoose.models.Vote || mongoose.model<VoteDocument>('Vote', VoteSchema);


