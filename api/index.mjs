import { connectDB } from './_lib/db.mjs';
import { app } from './_lib/app.mjs';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('DB connect failed:', err);
    res.status(500).json({ error: 'DB connect failed: ' + err.message });
    return;
  }
  return app(req, res);
}
