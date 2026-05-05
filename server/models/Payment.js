import mongoose from 'mongoose';

const { Schema } = mongoose;

const PaymentSchema = new Schema(
  {
    memberId: { type: String, required: true, index: true },
    budgetId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    method: { type: String, default: 'Otro' },
    photoDataUrl: { type: String },
    note: { type: String }
  },
  { timestamps: true }
);

PaymentSchema.set('toJSON', {
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.updatedAt;
    delete ret.createdAt;
  }
});

export const Payment = mongoose.model('Payment', PaymentSchema);
