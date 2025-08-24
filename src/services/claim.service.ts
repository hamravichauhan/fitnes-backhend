import { Types } from "mongoose";
import Territory from "../adapters/mongo/models/Territory";
import Activity from "../adapters/mongo/models/Activity";
import Season from "../adapters/mongo/models/Season";
import User from "../adapters/mongo/models/User"; // ✅ Import User directly
import { z } from "zod";

// ✅ Schema validation with Zod
const claimSchema = z.object({
  userId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
  seasonId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Invalid season ID")
    .optional()
    .nullable(),
  cells: z
    .array(z.string().regex(/^h3:[0-9a-f]+$/, "Invalid H3 cell ID"))
    .min(1, "Cells array must not be empty"),
});

/**
 * Upserts H3 cells for a user in a given season.
 * @param userId - User ID as string
 * @param seasonId - Season ID as string or null
 * @param cells - Array of H3 cell IDs
 * @throws Error if validation fails or references are invalid
 */
export async function upsertCells(
  userId: string,
  seasonId: string | null,
  cells: string[]
): Promise<void> {
  // ✅ Validate input
  const { userId: validatedUserId, seasonId: validatedSeasonId, cells: validatedCells } =
    claimSchema.parse({ userId, seasonId, cells });

  // ✅ Check if user exists
  const user = await User.findById(validatedUserId).lean();
  if (!user) throw new Error("User not found");

  // ✅ Validate season if provided
  if (validatedSeasonId) {
    const season = await Season.findById(validatedSeasonId).lean();
    if (!season || !season.isActive) {
      throw new Error("Invalid or inactive season");
    }
  }

  // ✅ Batch insert/update for performance
  const BATCH_SIZE = 1000;
  for (let i = 0; i < validatedCells.length; i += BATCH_SIZE) {
    const batch = validatedCells.slice(i, i + BATCH_SIZE).map((h3) => ({
      updateOne: {
        filter: {
          h3,
          seasonId: validatedSeasonId ? new Types.ObjectId(validatedSeasonId) : null,
        },
        update: {
          $set: {
            ownerUserId: new Types.ObjectId(validatedUserId),
            claimedAt: new Date(),
            seasonId: validatedSeasonId ? new Types.ObjectId(validatedSeasonId) : null,
          },
        },
        upsert: true,
      },
    }));

    await Territory.bulkWrite(batch, { ordered: false });
  }

  // ✅ Log activity for auditing
  await Activity.create({
    userId: new Types.ObjectId(validatedUserId),
    seasonId: validatedSeasonId ? new Types.ObjectId(validatedSeasonId) : null,
    type: "CLAIM_CELLS",
    details: {
      count: validatedCells.length,
      cells: validatedCells,
    },
    createdAt: new Date(),
  });
}
