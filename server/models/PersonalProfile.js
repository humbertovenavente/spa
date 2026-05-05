import mongoose from 'mongoose';

const { Schema } = mongoose;

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

export const PersonalProfile = mongoose.model('PersonalProfile', PersonalProfileSchema);
