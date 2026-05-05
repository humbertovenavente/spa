import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

const cached = global._mongooseCache ?? (global._mongooseCache = { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME || 'spa';
    if (!uri) throw new Error('MONGODB_URI no está configurado');
    cached.promise = mongoose
      .connect(uri, { dbName, serverSelectionTimeoutMS: 10000 })
      .then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
