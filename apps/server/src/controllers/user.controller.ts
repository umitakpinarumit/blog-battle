import { Request, Response } from 'express'
import { User } from '../models/User'
import { Post } from '../models/Post'
import { Tournament } from '../models/Tournament'

export async function recomputeLevels(_req: Request, res: Response) {
  const users = await User.find({ role: 'user' })
  for (const u of users) {
    const postCount = await Post.countDocuments({ authorId: u._id })
    // Tournament wins: finished tournaments where winner is any of user's posts' ids across rounds' last match
    // Approximation: count matches won by user's posts overall
    const userPostIds = (await Post.find({ authorId: u._id }).select('_id')).map(p=>p._id)
    const { Match } = require('../models/Match')
    const wins = await Match.countDocuments({ winnerId: { $in: userPostIds } })
    const newLevel = computeLevel(postCount, wins)
    u.stats = { ...(u.stats||{}), postCount, wins }
    u.level = newLevel
    await u.save()
  }
  return res.json({ ok: true })
}

function computeLevel(postCount: number, wins: number): 'Çaylak' | 'Köşe Yazarı' | 'Usta Kalem' {
  let score = 0
  score += Math.floor(postCount / 3) // every 3 posts -> +1 level point
  score += wins // every tournament/match win -> +1 level point
  if (score >= 6 || (postCount >= 20) || (wins >= 5)) return 'Usta Kalem'
  if (score >= 3 || (postCount >= 10) || (wins >= 2)) return 'Köşe Yazarı'
  return 'Çaylak'
}
