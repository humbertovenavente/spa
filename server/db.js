import mongoose from 'mongoose';

export async function connect(uri, dbName) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName });
  console.log(`MongoDB conectado a la base "${dbName}"`);
}
