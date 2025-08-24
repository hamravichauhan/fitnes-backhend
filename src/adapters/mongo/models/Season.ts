import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const SeasonSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Season name is required'],
      trim: true,
      minlength: [3, 'Season name must be at least 3 characters'],
      maxlength: [100, 'Season name cannot exceed 100 characters'],
    },
    startTs: {
      type: Date,
      required: [true, 'Start timestamp is required'],
      index: true,
    },
    endTs: {
      type: Date,
      required: [true, 'End timestamp is required'],
      index: true,
      validate: {
        validator: function (this: { startTs: Date }, value: Date) {
          return value > this.startTs;
        },
        message: 'End timestamp must be after start timestamp',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for active seasons
SeasonSchema.index({ isActive: 1, startTs: -1 });

// Pre-save hook to ensure date consistency
SeasonSchema.pre('save', function (next) {
  if (this.startTs >= this.endTs) {
    return next(new Error('End timestamp must be after start timestamp'));
  }
  next();
});

// TypeScript interface
export interface SeasonDoc extends InferSchemaType<typeof SeasonSchema> {
  _id: Types.ObjectId;
}

const Season = model<SeasonDoc>('Season', SeasonSchema);
export default Season;