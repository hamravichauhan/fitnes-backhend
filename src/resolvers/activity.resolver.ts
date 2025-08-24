import { z } from 'zod';
import Activity, { ActivityDoc } from '../adapters/mongo/models/Activity';
import type { AppContext } from '../context';

const startActivitySchema = z.object({
  type: z.enum(['RUN', 'WALK', 'RIDE'], { message: 'Invalid activity type' }),
});

const endActivitySchema = z.object({
  activityId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid activity ID'),
  type: z.enum(['RUN', 'WALK', 'RIDE'], { message: 'Invalid activity type' }), // ✅ Added
  geojson: z.unknown().optional(), // looser but safe
  distanceM: z.number().min(0, 'Distance cannot be negative'),
  durationS: z.number().min(0, 'Duration cannot be negative'),
});

export interface ActivityResponse {
  id: string;
  type: 'RUN' | 'WALK' | 'RIDE';
  startTs: string;
  endTs?: string;
  distanceM: number;
  durationS: number;
  private: boolean;
  geojson?: unknown;
}

// ✅ Helper to format Mongo doc into GraphQL response
function toActivityResponse(act: ActivityDoc): ActivityResponse {
  return {
    id: act._id.toString(),
    type: act.type as 'RUN' | 'WALK' | 'RIDE',
    startTs: act.startTs.toISOString(),
    endTs: act.endTs?.toISOString(),
    distanceM: act.distanceM,
    durationS: act.durationS,
    private: act.private,
    geojson: act.geojson,
  };
}

export default {
  Mutation: {
    startActivity: async (
      _: unknown,
      args: { type: 'RUN' | 'WALK' | 'RIDE' },
      { user }: AppContext
    ): Promise<ActivityResponse> => {
      console.log('[startActivity] user=', user?.id, 'type=', args.type);
      if (!user) throw new Error('Unauthorized');

      const { type } = startActivitySchema.parse(args);
      const act = await Activity.create({
        userId: user.id,
        type,
        startTs: new Date(),
      });

      return toActivityResponse(act);
    },

    endActivity: async (
      _: unknown,
      args: { activityId: string; type: 'RUN' | 'WALK' | 'RIDE'; geojson?: unknown; distanceM: number; durationS: number },
      { user }: AppContext
    ): Promise<ActivityResponse> => {
      if (!user) throw new Error('Unauthorized');

      const { activityId, type, geojson, distanceM, durationS } = endActivitySchema.parse(args);

      // ✅ Anti-cheat: Validate speed
      const speedKmh = (distanceM / 1000) / (durationS / 3600);
      if (type === 'RUN' && speedKmh > 24) throw new Error('Running speed exceeds realistic limits');
      if (type === 'WALK' && speedKmh > 10) throw new Error('Walking speed exceeds realistic limits');
      if (type === 'RIDE' && speedKmh > 60) throw new Error('Cycling speed exceeds realistic limits');

      const act = await Activity.findOneAndUpdate(
        { _id: activityId, userId: user.id },
        { endTs: new Date(), geojson, distanceM, durationS },
        { new: true, runValidators: true }
      ).lean<ActivityDoc | null>();

      if (!act) throw new Error('Activity not found or not owned by user');

      return toActivityResponse(act);
    },
  },
};
