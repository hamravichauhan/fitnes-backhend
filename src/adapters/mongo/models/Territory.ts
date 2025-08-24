import { Schema, model, models, type InferSchemaType, Types } from "mongoose";

const TerritorySchema = new Schema(
  {
    h3: {
      type: String,
      required: [true, "H3 cell ID is required"],
      index: true,
      validate: {
        validator: (value: string) => /^h3:[0-9a-f]+$/i.test(value),
        message: "Invalid H3 cell ID format",
      },
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      default: null,
      index: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id?.toString();
        delete ret._id;
      },
    },
    toObject: { virtuals: true },
  }
);

// ✅ Unique compound index for H3 cell and season
TerritorySchema.index({ h3: 1, seasonId: 1 }, { unique: true });

// ✅ Pre-save hook to validate references
TerritorySchema.pre("save", async function (next) {
  try {
    if (this.ownerUserId && this.isModified("ownerUserId")) {
      const userExists = await model("User").exists({ _id: this.ownerUserId });
      if (!userExists) return next(new Error("Invalid ownerUserId"));
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

// ✅ Base inferred type
type TerritorySchemaType = InferSchemaType<typeof TerritorySchema>;

// ✅ Override fields that can be null/optional
export interface TerritoryDoc
  extends Omit<TerritorySchemaType, "seasonId" | "ownerUserId" | "claimedAt"> {
  _id: Types.ObjectId;
  seasonId?: Types.ObjectId | null;
  ownerUserId?: Types.ObjectId | null;
  claimedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ Clean JSON type (safe for API responses)
export type TerritoryJSON = Omit<TerritoryDoc, "_id" | "seasonId" | "ownerUserId"> & {
  id: string;
  seasonId?: string | null;
  ownerUserId?: string | null;
};

const Territory = models.Territory || model<TerritoryDoc>("Territory", TerritorySchema);
export default Territory;
