import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const ActivitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['RUN', 'WALK', 'RIDE'],
        message: '{VALUE} is not a valid activity type',
      },
      required: [true, 'Activity type is required'],
    },
    startTs: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    endTs: {
      type: Date,
      default: null,
      validate: {
        validator: function (this: { startTs: Date }, value: Date) {
          return !value || value > this.startTs;
        },
        message: 'End timestamp must be after start timestamp',
      },
    },
    distanceM: {
      type: Number,
      default: 0,
      min: [0, 'Distance cannot be negative'],
    },
    durationS: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
    geojson: {
      type: Schema.Types.Mixed,
      default: null,
      validate: {
        validator: (value: any) => {
          if (!value) return true;
          return (
            value.type === 'Feature' &&
            value.geometry &&
            ['LineString', 'MultiLineString'].includes(value.geometry.type)
          );
        },
        message: 'GeoJSON must be a valid Feature with LineString or MultiLineString geometry',
      },
    },
    private: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for user activities
ActivitySchema.index({ userId: 1, startTs: -1 });

// Pre-save hook to validate references and anti-cheat
ActivitySchema.pre('save', async function (next) {
  if (this.isModified('userId')) {
    const user = await model('User').findById(this.userId);
    if (!user) return next(new Error('Invalid userId'));
  }
  // Validate speed when distance or duration changes
  if (
    (this.isModified('distanceM') || this.isModified('durationS')) &&
    this.distanceM > 0 &&
    this.durationS > 0
  ) {
    const speedKmh = (this.distanceM / 1000) / (this.durationS / 3600);
    if (this.type === 'RUN' && speedKmh > 24) {
      // ~15 mph max for running
      return next(new Error('Running speed exceeds realistic limits'));
    }
    if (this.type === 'WALK' && speedKmh > 10) {
      // ~6 mph max for walking
      return next(new Error('Walking speed exceeds realistic limits'));
    }
    if (this.type === 'RIDE' && speedKmh > 60) {
      // ~37 mph max for cycling
      return next(new Error('Cycling speed exceeds realistic limits'));
    }
  }
  next();
});

// TypeScript interface
export interface ActivityDoc extends InferSchemaType<typeof ActivitySchema> {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
}

const Activity = model<ActivityDoc>('Activity', ActivitySchema);
export default Activity;
