import mongoose from 'mongoose';

const { Schema } = mongoose;

const SettingsSchema = new Schema({
  key: { type: String, default: 'global', unique: true },
  activeBudgetId: { type: String, default: null }
});

export const Settings = mongoose.model('Settings', SettingsSchema);
