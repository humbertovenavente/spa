import mongoose from 'mongoose';

const { Schema } = mongoose;

const AssignmentSchema = new Schema(
  {
    memberId: { type: String, required: true },
    amount: { type: Number, required: true }
  },
  { _id: false }
);

const BudgetSchema = new Schema(
  {
    month: { type: String, required: true },
    label: { type: String, required: true },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    assignments: { type: [AssignmentSchema], default: [] }
  },
  { timestamps: true }
);

BudgetSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    delete ret.updatedAt;
  }
});

export const Budget = mongoose.model('Budget', BudgetSchema);
