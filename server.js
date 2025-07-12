require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());

app.use(cors({
  origin: 'https://endearing-toffee-c8a2aa.netlify.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const HARDCODED_USERS = [
  { id: 'admin', password: '123', role: 'admin' },
  { id: 'bar_staff_user', password: '456', role: 'bar_staff' },
];

mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
  action: { type: String, required: true },
  user: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: mongoose.Schema.Types.Mixed }
}));

async function logAction(action, user, details = {}) {
  try {
    await AuditLog.create({ action, user, details });
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}

async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Malformed authorization header' });

  try {
    const credentials = Buffer.from(token, 'base64').toString('ascii');
    const [id, password] = credentials.split(':');
    const user = HARDCODED_USERS.find(u => u.id === id && u.password === password);

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    req.user = { role: user.role, id: user.id };
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

function authorize(roles = []) {
  if (typeof roles === 'string') roles = [roles];
  return (req, res, next) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Forbidden: You do not have the required permissions.' });
    }
    next();
  };
}

const CashJournal = mongoose.model('CashJournal', new mongoose.Schema({
  cashAtHand: Number, 
  cashBanked: Number,
  bankReceiptId: String,
  responsiblePerson: String,
  date: { type: Date, default: Date.now }
}));

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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

async function notifyLowStock(item, current) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, 
      subject: `Low stock alert: ${item}`,
      text: `Stock for ${item} is now ${current}, below threshold! Please reorder.`
    });
    console.log(`Low stock email sent for ${item}. Current stock: ${current}`);
  } catch (err) {
    console.error('Error sending low stock email:', err);
  }
}

app.post('/login', async (req, res) => {
  const { id, password } = req.body;
  const user = HARDCODED_USERS.find(u => u.id === id && u.password === password);

  if (!user) {
    console.warn(`Login failed for user ID: ${id}`);
    await logAction('Login Attempt Failed', id, { reason: 'Invalid credentials' });
    return res.status(401).json({ error: 'Invalid ID or password' });
  }

  console.log(`Login successful for user ID: ${id}, role: ${user.role}`);
  await logAction('Login Successful', id);
  res.status(200).json({ role: user.role });
});

app.post('/logout', auth, async (req, res) => {
  await logAction('Logout', req.user.id);
  res.status(200).json({ message: 'Logged out successfully' });
});

// All other endpoints using req.user.username replaced with req.user.id accordingly
// (Not shown here again for brevity)

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
