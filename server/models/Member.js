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
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.updatedAt;
    delete ret.createdAt;
  }
});

export const Member = mongoose.model('Member', MemberSchema);
