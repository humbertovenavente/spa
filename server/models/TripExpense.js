import mongoose from 'mongoose';

const { Schema } = mongoose;

const ExpenseSplitSchema = new Schema(
  {
    memberId: { type: String, required: true },
    amount: { type: Number, required: true }
  },
  { _id: false }
);

const TripExpenseSchema = new Schema(
  {
    tripId: { type: String, required: true, index: true },
    payerId: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    description: { type: String },
    shared: { type: Boolean, default: false },
    splits: { type: [ExpenseSplitSchema], default: [] }
  },
  { timestamps: true }
);

TripExpenseSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    delete ret.updatedAt;
  }
});

export const TripExpense = mongoose.model('TripExpense', TripExpenseSchema);
