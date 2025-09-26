import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface TournamentDocument extends Document {
  name: string;
  category?: string;
  participants: Types.ObjectId[]; // Post IDs
  rounds: Types.ObjectId[][]; // match ids by round
  byes?: Types.ObjectId[][]; // carried participants per round (no self-match)
  currentRound: number;
  status: 'draft' | 'ongoing' | 'finished' | 'cancelled';
  progressionMode?: 'time' | 'participation';
  threshold?: number; // seconds if time, percent if participation
  currentRoundStartedAt?: Date;
  winnerPostId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema = new Schema<TournamentDocument>(
  {
    name: { type: String, required: true },
    category: { type: String },
    participants: [{ type: Schema.Types.ObjectId, ref: 'Post', required: true }],
    rounds: { type: [[Schema.Types.ObjectId]], default: [] },
    byes: { type: [[Schema.Types.ObjectId]], default: [] },
    currentRound: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'ongoing', 'finished', 'cancelled'], default: 'draft', index: true },
    progressionMode: { type: String, enum: ['time', 'participation'], default: 'time' },
    threshold: { type: Number, default: 3600 },
    currentRoundStartedAt: { type: Date },
    winnerPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
  },
  { timestamps: true }
);

export const Tournament: Model<TournamentDocument> = mongoose.models.Tournament || mongoose.model<TournamentDocument>('Tournament', TournamentSchema);


