import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { hashPassword } from '../utils/password';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Category } from '../models/Category';
import { Match } from '../models/Match';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/blog_battle';
  await mongoose.connect(uri);

  await Promise.all([User.deleteMany({}), Post.deleteMany({}), Match.deleteMany({}), Category.deleteMany({})]);
  const cats = await Category.insertMany([
    { name: 'Genel', slug: 'genel' },
    { name: 'Teknoloji', slug: 'teknoloji' },
    { name: 'Yaşam', slug: 'yasam' },
  ]);

  const passwordHash = await hashPassword('Password123');
  const user = await User.create({ email: 'demo@example.com', passwordHash, displayName: 'Demo User', role: 'user' });
  const admin = await User.create({ email: 'admin@example.com', passwordHash, displayName: 'Admin', role: 'admin', level: 'Usta Kalem' });

  const posts = await Post.insertMany([
    { title: 'Yazı 1', content: 'İçerik 1...', category: cats[0].name, authorId: user._id },
    { title: 'Yazı 2', content: 'İçerik 2...', category: cats[0].name, authorId: user._id },
    { title: 'Yazı 3', content: 'İçerik 3...', category: cats[1].name, authorId: user._id },
    { title: 'Yazı 4', content: 'İçerik 4...', category: cats[1].name, authorId: user._id },
  ]);

  await Match.insertMany([
    { postAId: posts[0]._id, postBId: posts[1]._id, category: 'Genel', round: 1, status: 'ongoing' },
    { postAId: posts[2]._id, postBId: posts[3]._id, category: 'Teknoloji', round: 1, status: 'ongoing' },
  ]);

  console.log('Seed completed');
  console.log('Admin -> admin@example.com / Password123');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


