import { z } from 'zod';
import Territory from '../adapters/mongo/models/Territory';
import User, { UserDoc } from '../adapters/mongo/models/User';
import type { AppContext } from '../context';

const leaderboardSchema = z.object({
  seasonId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid season ID').optional(),
});

export interface LeaderboardEntry {
  id: string;
  email: string;
  displayName: string;
  color: string;
  tilesOwned: number;
}

export default {
  Query: {
    leaderboard: async (
      _: unknown,
      args: { seasonId?: string },
      { user }: AppContext
    ): Promise<LeaderboardEntry[]> => {
      if (!user) throw new Error('Unauthorized');

      const { seasonId } = leaderboardSchema.parse(args);

      const match: any = { ownerUserId: { $ne: null } };
      if (seasonId) match.seasonId = seasonId;

      // Optimize aggregation with lean queries
      const agg = await Territory.aggregate([
        { $match: match },
        { $group: { _id: '$ownerUserId', tilesOwned: { $sum: 1 } } },
        { $sort: { tilesOwned: -1 } },
        { $limit: 50 },
      ]).exec();

      const userIds = agg.map(a => a._id);
      const users = await User.find({ _id: { $in: userIds } })
        .select('email displayName color')
        .lean();

      const userMap = new Map(users.map(u => [String(u._id), u]));

      return agg.map(a => {
        const u = userMap.get(String(a._id));
        return {
          id: String(a._id),
          email: u?.email ?? '',
          displayName: u?.displayName ?? 'Unknown',
          color: u?.color ?? '#999999',
          tilesOwned: a.tilesOwned,
        };
      });
    },
  },
};