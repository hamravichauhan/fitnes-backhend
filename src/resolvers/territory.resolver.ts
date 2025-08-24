import { z } from 'zod';
import Territory from '../adapters/mongo/models/Territory';
import User from '../adapters/mongo/models/User';
import Activity from '../adapters/mongo/models/Activity';
import Season from '../adapters/mongo/models/Season';
import { listCellsForBBox, type BBox } from '../services/h3.service';
import { upsertCells } from '../services/claim.service';
import type { AppContext } from '../context';

/**
 * ✅ Input validation schemas
 */
const viewportTerritoriesSchema = z.object({
  bbox: z
    .object({
      minLat: z.number().min(-90).max(90),
      maxLat: z.number().min(-90).max(90),
      minLon: z.number().min(-180).max(180),
      maxLon: z.number().min(-180).max(180),
    })
    .refine(
      ({ minLat, maxLat, minLon, maxLon }) =>
        minLat <= maxLat && minLon <= maxLon,
      'Invalid bounding box coordinates'
    ),
  res: z
    .number()
    .int()
    .min(0)
    .max(15, 'H3 resolution must be between 0 and 15'),
});

const claimTerritorySchema = z.object({
  activityId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid activity ID'),
  seasonId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid season ID')
    .optional(),
  cells: z
    .array(z.string().regex(/^h3:[0-9a-f]+$/, 'Invalid H3 cell ID'))
    .min(1, 'Cells array must not be empty'),
});

/**
 * ✅ Types
 */
export interface TerritoryResponse {
  h3: string;
  owner?: { id: string } | null;
  claimedAt?: string | null;
  seasonId?: string | null;
}

export interface ViewportTerritoriesResponse {
  cells: TerritoryResponse[];
}

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  color: string;
  tilesOwned: number;
}

/**
 * ✅ Resolver
 */
export default {
  Query: {
    viewportTerritories: async (
      _: unknown,
      args: { bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number }; res: number },
      { user }: AppContext
    ): Promise<ViewportTerritoriesResponse> => {
      if (!user) throw new Error('Unauthorized');

      const { bbox, res } = viewportTerritoriesSchema.parse(args);

      // Convert to BBox type expected by H3
      const convertedBBox: BBox = {
        north: bbox.maxLat,
        south: bbox.minLat,
        east: bbox.maxLon,
        west: bbox.minLon,
      };

      const cells = listCellsForBBox(convertedBBox, res);
      if (!cells.length) return { cells: [] };

      const rows = await Territory.find({ h3: { $in: cells } })
        .select('h3 ownerUserId claimedAt seasonId')
        .lean();

      return {
        cells: rows.map((r) => ({
          h3: r.h3,
          owner: r.ownerUserId ? { id: r.ownerUserId.toString() } : null,
          claimedAt: r.claimedAt
            ? new Date(r.claimedAt).toISOString()
            : null,
          seasonId: r.seasonId ? r.seasonId.toString() : null,
        })),
      };
    },
  },

  Mutation: {
    claimTerritory: async (
      _: unknown,
      args: { activityId: string; seasonId?: string | null; cells: string[] },
      { user }: AppContext
    ): Promise<boolean> => {
      if (!user) throw new Error('Unauthorized');

      const { activityId, seasonId, cells } = claimTerritorySchema.parse(args);

      // ✅ Validate activity exists and belongs to user
      const activity = await Activity.findOne({
        _id: activityId,
        userId: user.id,
      }).lean();
      if (!activity) throw new Error('Activity not found or not owned by user');

      // ✅ Validate season if provided
      if (seasonId) {
        const season = await Season.findOne({
          _id: seasonId,
          isActive: true,
        }).lean();
        if (!season) throw new Error('Invalid or inactive season');
      }

      await upsertCells(user.id, seasonId ?? null, cells);
      return true;
    },
  },

  Territory: {
    owner: async (
      parent: { owner?: { id: string } | null }
    ): Promise<UserResponse | null> => {
      const id = parent?.owner?.id;
      if (!id) return null;

      const u = await User.findById(id)
        .select('email displayName color')
        .lean();
      if (!u) return null;

      const tilesOwned = await Territory.countDocuments({
        ownerUserId: u._id,
      });

      return {
        id: String(u._id),
        email: u.email,
        displayName: u.displayName,
        color: u.color,
        tilesOwned,
      };
    },
  },
};
