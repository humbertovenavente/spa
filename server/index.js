import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connect } from './db.js';
import { Member } from './models/Member.js';
import { Budget } from './models/Budget.js';
import { Payment } from './models/Payment.js';
import { Settings } from './models/Settings.js';
import { PersonalProfile } from './models/PersonalProfile.js';
import { PersonalExpense } from './models/PersonalExpense.js';

const app = express();

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:4200',
  'http://localhost:3000',
  'http://127.0.0.1:4200',
  'https://spa-pink-nine.vercel.app'
];
const ENV_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = ENV_ORIGINS.length ? ENV_ORIGINS : DEFAULT_ALLOWED_ORIGINS;

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl, mobile webview, server-to-server
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origen no permitido: ${origin}`));
    }
  })
);

app.use(express.json({ limit: '12mb' }));

async function getSettings() {
  let s = await Settings.findOne({ key: 'global' });
  if (!s) s = await Settings.create({ key: 'global' });
  return s;
}

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  });

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Full state snapshot
app.get(
  '/api/state',
  wrap(async (_req, res) => {
    const [members, budgets, payments, settings] = await Promise.all([
      Member.find().sort({ createdAt: 1 }),
      Budget.find().sort({ createdAt: -1 }),
      Payment.find().sort({ createdAt: -1 }),
      getSettings()
    ]);
    res.json({
      members: members.map((m) => m.toJSON()),
      budgets: budgets.map((b) => b.toJSON()),
      payments: payments.map((p) => p.toJSON()),
      activeBudgetId: settings.activeBudgetId || undefined
    });
  })
);

// Members
app.post(
  '/api/members',
  wrap(async (req, res) => {
    const { name, monthlyContribution, currency, paymentMethod } = req.body;
    if (!name) return res.status(400).json({ error: 'Falta el nombre' });
    const m = await Member.create({ name, monthlyContribution, currency, paymentMethod });
    res.status(201).json(m.toJSON());
  })
);

app.delete(
  '/api/members/:id',
  wrap(async (req, res) => {
    const id = req.params.id;
    await Member.findByIdAndDelete(id);
    await Payment.deleteMany({ memberId: id });
    const budgets = await Budget.find({ 'assignments.memberId': id });
    for (const b of budgets) {
      b.assignments = b.assignments.filter((a) => a.memberId !== id);
      b.totalAmount = b.assignments.reduce((s, a) => s + a.amount, 0);
      await b.save();
    }
    res.status(204).end();
  })
);

// Budgets
app.post(
  '/api/budgets',
  wrap(async (req, res) => {
    const { month, label, currency, assignments } = req.body;
    if (!month || !label) return res.status(400).json({ error: 'Faltan campos' });
    const list = (assignments || []).map((a) => ({
      memberId: String(a.memberId),
      amount: Number(a.amount) || 0
    }));
    const totalAmount = list.reduce((s, a) => s + a.amount, 0);
    const b = await Budget.create({ month, label, currency, assignments: list, totalAmount });
    const s = await getSettings();
    s.activeBudgetId = b._id.toString();
    await s.save();
    res.status(201).json(b.toJSON());
  })
);

app.delete(
  '/api/budgets/:id',
  wrap(async (req, res) => {
    const id = req.params.id;
    await Budget.findByIdAndDelete(id);
    await Payment.deleteMany({ budgetId: id });
    const s = await getSettings();
    if (s.activeBudgetId === id) {
      const next = await Budget.findOne().sort({ createdAt: -1 });
      s.activeBudgetId = next?._id?.toString() || null;
      await s.save();
    }
    res.status(204).end();
  })
);

app.post(
  '/api/active-budget/:id',
  wrap(async (req, res) => {
    const s = await getSettings();
    s.activeBudgetId = req.params.id;
    await s.save();
    res.status(204).end();
  })
);

// Payments
app.post(
  '/api/payments',
  wrap(async (req, res) => {
    const { memberId, budgetId, amount, date, method, photoDataUrl, note } = req.body;
    if (!memberId || !budgetId || amount == null || !date) {
      return res.status(400).json({ error: 'Faltan campos del pago' });
    }
    const p = await Payment.create({
      memberId,
      budgetId,
      amount: Number(amount),
      date,
      method,
      photoDataUrl,
      note
    });
    res.status(201).json(p.toJSON());
  })
);

app.delete(
  '/api/payments/:id',
  wrap(async (req, res) => {
    await Payment.findByIdAndDelete(req.params.id);
    res.status(204).end();
  })
);

// ----- Personal -----

async function getPersonalProfile() {
  let p = await PersonalProfile.findOne({ key: 'global' });
  if (!p) p = await PersonalProfile.create({ key: 'global' });
  return p;
}

function profileToJSON(p) {
  return {
    income: p.income || 0,
    currency: p.currency || 'USD',
    categories: (p.categories || []).map((c) => ({
      id: c._id.toString(),
      name: c.name,
      monthlyAmount: c.monthlyAmount || 0
    }))
  };
}

app.get(
  '/api/personal',
  wrap(async (_req, res) => {
    const [profile, expenses] = await Promise.all([
      getPersonalProfile(),
      PersonalExpense.find().sort({ date: -1, createdAt: -1 })
    ]);
    res.json({
      profile: profileToJSON(profile),
      expenses: expenses.map((e) => e.toJSON())
    });
  })
);

app.put(
  '/api/personal',
  wrap(async (req, res) => {
    const { income, currency } = req.body;
    const p = await getPersonalProfile();
    if (income != null) p.income = Number(income) || 0;
    if (currency) p.currency = currency;
    await p.save();
    res.json(profileToJSON(p));
  })
);

app.post(
  '/api/personal/categories',
  wrap(async (req, res) => {
    const { name, monthlyAmount } = req.body;
    if (!name) return res.status(400).json({ error: 'Falta nombre' });
    const p = await getPersonalProfile();
    p.categories.push({ name, monthlyAmount: Number(monthlyAmount) || 0 });
    await p.save();
    const sub = p.categories[p.categories.length - 1];
    res.status(201).json({
      id: sub._id.toString(),
      name: sub.name,
      monthlyAmount: sub.monthlyAmount || 0
    });
  })
);

app.patch(
  '/api/personal/categories/:id',
  wrap(async (req, res) => {
    const id = req.params.id;
    const { name, monthlyAmount } = req.body;
    const p = await getPersonalProfile();
    const cat = p.categories.id(id);
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
    if (name != null) cat.name = String(name);
    if (monthlyAmount != null) cat.monthlyAmount = Number(monthlyAmount) || 0;
    await p.save();
    res.json({
      id: cat._id.toString(),
      name: cat.name,
      monthlyAmount: cat.monthlyAmount || 0
    });
  })
);

app.delete(
  '/api/personal/categories/:id',
  wrap(async (req, res) => {
    const id = req.params.id;
    const p = await getPersonalProfile();
    p.categories = p.categories.filter((c) => c._id.toString() !== id);
    await p.save();
    await PersonalExpense.deleteMany({ categoryId: id });
    res.status(204).end();
  })
);

app.post(
  '/api/personal/expenses',
  wrap(async (req, res) => {
    const { categoryId, amount, date, note } = req.body;
    if (!categoryId || amount == null || !date) {
      return res.status(400).json({ error: 'Faltan campos del gasto' });
    }
    const e = await PersonalExpense.create({
      categoryId,
      amount: Number(amount),
      date,
      note
    });
    res.status(201).json(e.toJSON());
  })
);

app.delete(
  '/api/personal/expenses/:id',
  wrap(async (req, res) => {
    await PersonalExpense.findByIdAndDelete(req.params.id);
    res.status(204).end();
  })
);

const PORT = process.env.PORT || 3001;
const URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'spa';

if (!URI) {
  console.error('Falta MONGODB_URI en .env');
  process.exit(1);
}

connect(URI, DB_NAME)
  .then(() => app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Error conectando a MongoDB:', err.message);
    process.exit(1);
  });
