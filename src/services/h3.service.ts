import { polygonToCells } from "h3-js";
import { z } from "zod";

export type BBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

// ✅ Strong schema validation for BBox
const bboxSchema = z
  .object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180),
  })
  .refine(
    ({ north, south, east, west }) => south <= north && west <= east,
    {
      message: "Invalid bounding box: south <= north and west <= east are required",
    }
  );

/**
 * Get H3 cells covering a bounding box.
 *
 * @param b Bounding box (north, south, east, west)
 * @param resolution H3 resolution (0–15)
 * @returns Array of H3 cell IDs
 */
export function listCellsForBBox(b: BBox, resolution: number): string[] {
  // ✅ Validate resolution
  if (!Number.isInteger(resolution) || resolution < 0 || resolution > 15) {
    throw new Error("H3 resolution must be an integer between 0 and 15");
  }

  // ✅ Validate bounding box
  const { north, south, east, west } = bboxSchema.parse(b);

  // ✅ Construct polygon in GeoJSON order: [lng, lat]
  const loop: [number, number][] = [
    [west, south],
    [west, north],
    [east, north],
    [east, south],
    [west, south], // close loop
  ];

  // ✅ polygonToCells expects [[[lng, lat], ...]]
  return polygonToCells([loop], resolution, true);
}

/**
 * Safe version with error handling.
 */
export function tryListCellsForBBox(
  b: BBox,
  resolution: number
): { success: boolean; cells: string[]; error?: string } {
  try {
    return { success: true, cells: listCellsForBBox(b, resolution) };
  } catch (err) {
    return {
      success: false,
      cells: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
