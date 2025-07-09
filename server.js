require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());

// CORS config - allow your frontend origin
app.use(cors({
  origin: 'https://endearing-toffee-c8a2aa.netlify.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(bodyParser.json());

// Basic Auth middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1]; // Basic <token>
  if (!token) return res.status(401).json({ error: 'Malformed authorization header' });

  const credentials = Buffer.from(token, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === 'admin' && password === '123') {
    next();
  } else {
    res.status(403).json({ error: 'Invalid credentials' });
  }
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const Inventory = mongoose.model('Inventory', new mongoose.Schema({
  item: String,
  opening: Number,
  purchases: Number,
  sales: Number,
  spoilage: Number,
  closing: Number,
}));

const Sale = mongoose.model('Sale', new mongoose.Schema({
  item: String,
  number: Number,
  bp: Number,
  sp: Number,
  date: Date
}));

const Expense = mongoose.model('Expense', new mongoose.Schema({
  description: String,
  amount: Number,
  date: Date,
  receiptId: String,
  source: String,
  responsible: String
}));

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Low-stock notifier
async function notifyLowStock(item, current) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `Low stock alert: ${item}`,
      text: `Stock for ${item} is now ${current}, below threshold!`
    });
  } catch (err) {
    console.error('Error sending low stock email:', err);
  }
}

// Inventory Endpoints
app.post('/inventory', auth, async (req, res) => {
  try {
    const { item, opening, purchases, sales, spoilage } = req.body;
    const total = opening + purchases - sales - spoilage;
    const doc = await Inventory.create({ item, opening, purchases, sales, spoilage, closing: total });
    if (total < Number(process.env.LOW_STOCK_THRESHOLD)) {
      notifyLowStock(item, total);
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/inventory', auth, async (req, res) => {
  try {
    const { item, low } = req.query;
    const filter = {};
    if (item) filter.item = new RegExp(item, 'i');
    if (low) filter.closing = { $lt: Number(low) };
    const docs = await Inventory.find(filter);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/inventory/:id', auth, async (req, res) => {
  try {
    const doc = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (doc.closing < Number(process.env.LOW_STOCK_THRESHOLD)) {
      notifyLowStock(doc.item, doc.closing);
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/inventory/:id', auth, async (req, res) => {
  try {
    await Inventory.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sales endpoints
app.post('/sales', auth, async (req, res) => {
  try {
    const sale = await Sale.create({ ...req.body, date: new Date() });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/sales', auth, async (req, res) => {
  try {
    const { date } = req.query;
    let query = {};
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    const sales = await Sale.find(query).sort({ date: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/sales/:id', auth, async (req, res) => {
  try {
    const updated = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Expenses endpoints
app.post('/expenses', auth, async (req, res) => {
  try {
    const exp = await Expense.create({ ...req.body, date: new Date() });
    res.json(exp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/expenses', auth, async (req, res) => {
  try {
    const { date } = req.query;
    let query = {};
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/expenses/:id', auth, async (req, res) => {
  try {
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/expenses/:id', auth, async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
