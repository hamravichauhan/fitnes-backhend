import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const ClaimSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: [true, "Activity ID is required"],
      index: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      default: null,
      index: true,
    },
    cells: {
      type: [String],
      required: [true, "Cells array is required"],
      validate: {
        validator: (cells: string[]) =>
          Array.isArray(cells) &&
          cells.length > 0 &&
          cells.every((cell) => /^h3:[0-9a-f]+$/i.test(cell)),
        message: "Cells must be a non-empty array of valid H3 cell IDs",
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false, // remove __v
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        delete ret._id;
      },
    },
    toObject: { virtuals: true },
  }
);

// ✅ Compound indexes
ClaimSchema.index({ userId: 1, seasonId: 1 });
ClaimSchema.index({ activityId: 1 });
ClaimSchema.index({ cells: 1 });

// ✅ Pre-save hook: validate references
ClaimSchema.pre("save", async function (next) {
  try {
    if (this.isModified("userId")) {
      const userExists = await model("User").exists({ _id: this.userId });
      if (!userExists) return next(new Error("Invalid userId"));
    }
    if (this.isModified("activityId")) {
      const activityExists = await model("Activity").exists({ _id: this.activityId });
      if (!activityExists) return next(new Error("Invalid activityId"));
    }
    if (this.seasonId && this.isModified("seasonId")) {
      const seasonExists = await model("Season").exists({ _id: this.seasonId });
      if (!seasonExists) return next(new Error("Invalid seasonId"));
    }
    next();
  } catch (err) {
    next(err as Error);
  }
});

// ✅ Base type inferred from schema
type ClaimSchemaType = InferSchemaType<typeof ClaimSchema>;

// ✅ Fix seasonId typing issue with override
export interface ClaimDoc extends Omit<ClaimSchemaType, "seasonId"> {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  activityId: Types.ObjectId;
  seasonId?: Types.ObjectId | null; // allow null or undefined
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Clean JSON type (for API responses)
export type ClaimJSON = Omit<ClaimDoc, "_id" | "seasonId"> & {
  id: string;
  seasonId?: string | null;
};

const Claim = models.Claim || model<ClaimDoc>("Claim", ClaimSchema);
export default Claim;
