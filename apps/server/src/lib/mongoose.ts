import mongoose from 'mongoose';

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blog_battle';
  mongoose.set('strictQuery', true);
  return mongoose.connect(uri);
}

import mongoose from 'mongoose';

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blog_battle';
  mongoose.set('strictQuery', true);
  return mongoose.connect(uri);
}


