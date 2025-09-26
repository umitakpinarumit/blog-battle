import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  level?: 'Çaylak' | 'Köşe Yazarı' | 'Usta Kalem';
  stats?: {
    postCount: number;
    wins: number;
    votesGiven: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    level: { type: String, enum: ['Çaylak', 'Köşe Yazarı', 'Usta Kalem'], default: 'Çaylak' },
    stats: {
      postCount: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      votesGiven: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const User: Model<UserDocument> = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);


