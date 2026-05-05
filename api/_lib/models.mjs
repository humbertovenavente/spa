import mongoose from 'mongoose';

const { Schema } = mongoose;

const MemberSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    monthlyContribution: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    paymentMethod: { type: String }
  },
  { timestamps: true }
);
MemberSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.updatedAt;
    delete ret.createdAt;
  }
});
export const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);

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
  transform: (_d, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
    delete ret.updatedAt;
  }
});
export const Budget = mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);

const PaymentSchema = new Schema(
  {
    memberId: { type: String, required: true, index: true },
    budgetId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true },
    method: { type: String, default: 'Otro' },
    photoDataUrl: { type: String },
    note: { type: String }
  },
  { timestamps: true }
);
PaymentSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.updatedAt;
    delete ret.createdAt;
  }
});
export const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

const SettingsSchema = new Schema({
  key: { type: String, default: 'global', unique: true },
  activeBudgetId: { type: String, default: null }
});
export const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

const PersonalCategorySchema = new Schema({
  name: { type: String, required: true, trim: true },
  monthlyAmount: { type: Number, default: 0 }
});
PersonalCategorySchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
  }
});

const PersonalProfileSchema = new Schema({
  key: { type: String, default: 'global', unique: true },
  income: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  categories: { type: [PersonalCategorySchema], default: [] }
});
PersonalProfileSchema.set('toJSON', {
  versionKey: false,
  transform: (_d, ret) => {
    delete ret._id;
    delete ret.key;
  }
});
export const PersonalProfile =
  mongoose.models.PersonalProfile || mongoose.model('PersonalProfile', PersonalProfileSchema);

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
export const PersonalExpense =
  mongoose.models.PersonalExpense || mongoose.model('PersonalExpense', PersonalExpenseSchema);
