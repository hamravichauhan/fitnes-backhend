import { Schema, model, type InferSchemaType } from 'mongoose';

// Define the User schema with improved validation and structure
const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value: string) => {
          // Basic email regex for validation
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Invalid email format',
      },
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Exclude passwordHash from queries by default for security
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      default: 'Anonymous',
      trim: true,
      minlength: [3, 'Display name must be at least 3 characters'],
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      required: [true, 'Color is required'],
      default: '#888888',
      validate: {
        validator: (value: string) => {
          // Validate hex color code (e.g., #FF0000)
          return /^#([0-9A-Fa-f]{6})$/.test(value);
        },
        message: 'Color must be a valid hex color code (e.g., #FF0000)',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true, // Index for queries filtering active users
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // Include virtuals in JSON output
    toObject: { virtuals: true },
  }
);

// Virtual to calculate tiles owned (assuming a Territory model reference)
UserSchema.virtual('tilesOwned', {
  ref: 'Territory', // Reference to Territory model
  localField: '_id',
  foreignField: 'ownerUserId',
  count: true, // Just count the number of territories
});

// Compound index for common queries (e.g., active users sorted by last login)
UserSchema.index({ isActive: 1, lastLogin: -1 });

// Pre-save hook to ensure passwordHash is not accidentally modified without proper hashing
UserSchema.pre('save', function (next) {
  if (this.isModified('passwordHash')) {
    // In a real app, ensure passwordHash is properly hashed (e.g., using bcrypt)
    // This is just a placeholder for validation
    if (!this.passwordHash.startsWith('$2b$')) {
      return next(new Error('Password hash must be a valid bcrypt hash'));
    }
  }
  next();
});

// TypeScript interface for the User document
export interface UserDoc extends InferSchemaType<typeof UserSchema> {
  tilesOwned?: number; // Virtual field
}

// Compile and export the model
const User = model<UserDoc>('User', UserSchema);
export default User;