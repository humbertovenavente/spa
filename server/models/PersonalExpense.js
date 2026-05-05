import mongoose from 'mongoose';

const { Schema } = mongoose;

const PersonalExpenseSchema = new Schema(
  {
    categoryId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    note: { type: String }
  },
  { timestamps: true }
);

PersonalExpenseSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.updatedAt;
    delete ret.createdAt;
  }
});

export const PersonalExpense = mongoose.model('PersonalExpense', PersonalExpenseSchema);
