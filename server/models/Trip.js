import mongoose from 'mongoose';

const { Schema } = mongoose;

const TripParticipantSchema = new Schema(
  {
    memberId: { type: String, required: true },
    budget: { type: Number, default: 0 }
  },
  { _id: false }
);

const TripSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    startDate: { type: String },
    endDate: { type: String },
    currency: { type: String, default: 'USD' },
    participants: { type: [TripParticipantSchema], default: [] }
  },
  { timestamps: true }
);

TripSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    delete ret.updatedAt;
  }
});

export const Trip = mongoose.model('Trip', TripSchema);
