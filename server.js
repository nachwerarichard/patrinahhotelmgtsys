require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');


const app = express();
app.use(cors());
app.use(express.json());


app.use(bodyParser.json());

// Basic Auth Middleware
const auth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="admin area"');
    return res.status(401).send('Authentication required');
  }
  const [user, pass] = Buffer.from(authHeader.split(' ')[1], 'base64')
                          .toString().split(':');
  if (user === 'admin' && pass === '123') return next();
  res.set('WWW-Authenticate', 'Basic realm="admin area"');
  return res.status(401).send('Invalid credentials');
};

mongoose.connect(process.env.MONGO_URI).then(() => console.log('MongoDB connected'));

// Schemas
const Inventory = mongoose.model('Inventory', new mongoose.Schema({
  item: String,
  opening: Number,
  purchases: Number,
  sales: Number,
  spoilage: Number,
  closing: Number,
}));
const Sale = mongoose.model('Sale', new mongoose.Schema({ item: String, number: Number, bp: Number, sp: Number, date: Date }));
const Expense = mongoose.model('Expense', new mongoose.Schema({ description: String, amount: Number, date: Date, receiptId: String, source: String, responsible: String }));

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Low-stock notifier
async function notifyLowStock(item, current) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: `Low stock alert: ${item}`,
    text: `Stock for ${item} is now ${current}, below threshold!`
  });
}

// 📦 Inventory Endpoints
app.post('/inventory', auth, async (req, res) => {
  const { item, opening, purchases, sales, spoilage } = req.body;
  const total = opening + purchases - sales - spoilage;
  const doc = await Inventory.create({ item, opening, purchases, sales, spoilage, closing: total });
  if (total < Number(process.env.LOW_STOCK_THRESHOLD)) notifyLowStock(item, total);
  res.json(doc);
});

app.get('/inventory', auth, async (req, res) => {
  const { item, low } = req.query;
  const filter = {};
  if (item) filter.item = new RegExp(item, 'i');
  if (low) filter.closing = { $lt: Number(low) };
  res.json(await Inventory.find(filter));
});

app.put('/inventory/:id', auth, async (req, res) => {
  const doc = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (doc.closing < Number(process.env.LOW_STOCK_THRESHOLD)) notifyLowStock(doc.item, doc.closing);
  res.json(doc);
});

app.delete('/inventory/:id', auth, async (req, res) => {
  await Inventory.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});

// 🛒 Sales & Expenses Endpoints
app.post('/sales', auth, async (req, res) => {
  const sale = await Sale.create({ ...req.body, date: new Date() });
  res.json(sale);
});
app.get('/sales', auth, (req, res) => res.json(Sale.find()));

app.post('/expenses', auth, async (req, res) => {
  const exp = await Expense.create({ ...req.body, date: new Date() });
  res.json(exp);
});
app.get('/expenses', auth, (req, res) => res.json(Expense.find()));


// ✅ CASH MODEL
const cashSchema = new mongoose.Schema({
  atHand: Number,
  banked: Number,
  receiptId: String,
  responsible: String,
  date: { type: Date, default: Date.now }
});
const Cash = mongoose.model('Cash', cashSchema);

// ✅ POST /cash - Save cash record
app.post('/cash', auth, async (req, res) => {
  try {
    const { atHand, banked, receiptId, responsible } = req.body;
    const cash = new Cash({ atHand, banked, receiptId, responsible });
    await cash.save();
    res.status(201).json(cash);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET /cash - Get all records
app.get('/cash', basicAuth, async (req, res) => {
  try {
    const records = await Cash.find().sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Server Start
app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
