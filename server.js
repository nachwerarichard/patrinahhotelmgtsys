require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
// const bcrypt = require('bcryptjs'); // REMOVED: Not needed for hardcoded passwords

const app = express();
app.use(express.json());

// CORS config - allow your frontend origin
app.use(cors({
  origin: 'https://stirring-pony-fe2347.netlify.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- !!! WARNING: SERIOUS SECURITY VULNERABILITY !!! ---
// Hardcoding users for demonstration purposes only.
// DO NOT USE THIS IN PRODUCTION OR FOR ANY REAL APPLICATION.
const HARDCODED_USERS = {
    'admin': { password: '123', role: 'admin' },
    'bar_staff_user': { password: '456', role: 'bar_staff' },
    // Add more hardcoded users as needed for testing
};
// --- !!! END OF WARNING !!! ---


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- REMOVED: User Schema (Not used for hardcoded auth) ---
// const User = mongoose.model('User', new mongoose.Schema({ ... }));

// --- NEW: Audit Log Schema ---
const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
  action: { type: String, required: true }, // e.g., 'Login', 'Logout', 'Sale Created', 'Inventory Updated'
  user: { type: String, required: true }, // Username of the person performing the action
  timestamp: { type: Date, default: Date.now },
  details: { type: mongoose.Schema.Types.Mixed } // Store relevant details about the action
}));

// --- NEW: Helper function to create audit log entries ---
async function logAction(action, user, details = {}) {
  try {
    await AuditLog.create({ action, user, details });
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}

// --- MODIFIED: Authentication Middleware (Uses hardcoded users) ---
async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1]; // Expecting "Basic <base64encoded_username:password>"
  if (!token) return res.status(401).json({ error: 'Malformed authorization header' });

  try {
    const credentials = Buffer.from(token, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // --- !!! SERIOUS SECURITY RISK: PLAIN-TEXT PASSWORD COMPARISON !!! ---
    const user = HARDCODED_USERS[username];

    if (!user || user.password !== password) { // Directly comparing plain-text passwords
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Attach user object (including role) to the request
     req.user = { username: username, role: user.role, id: username };
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// --- NEW: Authorization Middleware ---
function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // req.user is populated by the 'auth' middleware
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Forbidden: You do not have the required permissions.' });
    }
    next();
  };
}

// Schemas (Existing ones)
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


// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Low-stock notifier (Existing)
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


// --- REMOVED: User Management Endpoints (No longer managing users in DB) ---
// app.post('/users', auth, authorize('admin'), async (req, res) => { ... });
// app.get('/users', auth, authorize('admin'), async (req, res) => { ... });


// --- MODIFIED: Login Endpoint (Uses hardcoded users) ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // --- !!! SERIOUS SECURITY RISK: PLAIN-TEXT PASSWORD COMPARISON !!! ---
    const user = HARDCODED_USERS[username];

    if (!user || user.password !== password) { // Directly comparing plain-text passwords
        console.warn(`Login failed for username: ${username}. Invalid credentials.`);
        await logAction('Login Attempt Failed', username, { reason: 'Invalid credentials provided.' });
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Login successful
    console.log(`Login successful for username: ${username}, role: ${user.role}`);
    await logAction('Login Successful', username);
    
    // Respond with user info, including their role
    res.status(200).json({ username: user.username, role: user.role });
});

// --- NEW: Logout Endpoint ---
app.post('/logout', auth, async (req, res) => {
    // Note: req.user is populated by the auth middleware before this route is hit
    await logAction('Logout', req.user.username);
    res.status(200).json({ message: 'Logged out successfully' });
});


// --- MODIFIED: Inventory Endpoints (Admin Only) ---
app.post('/inventory', auth, authorize('admin'), async (req, res) => {
  try {
    const { item, opening, purchases, sales, spoilage } = req.body;
    const total = opening + purchases - sales - spoilage;
    const doc = await Inventory.create({ item, opening, purchases, sales, spoilage, closing: total });
    if (total < Number(process.env.LOW_STOCK_THRESHOLD)) {
      notifyLowStock(item, total);
    }
    await logAction('Inventory Created', req.user.username, { item: doc.item, closing: doc.closing });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/inventory', auth, authorize('admin'), async (req, res) => {
  try {
    const { item, low, page = 1, limit = 5 } = req.query;

    const filter = {};
    if (item) filter.item = new RegExp(item, 'i');
    if (low) filter.closing = { $lt: Number(low) };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Inventory.countDocuments(filter);
    const docs = await Inventory.find(filter).skip(skip).limit(Number(limit));

    res.json({
      data: docs,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/inventory/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const existingDoc = await Inventory.findById(req.params.id);
    if (!existingDoc) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const updatedValues = {
      item: req.body.item !== undefined ? req.body.item : existingDoc.item,
      opening: req.body.opening !== undefined ? req.body.opening : existingDoc.opening,
      purchases: req.body.purchases !== undefined ? req.body.purchases : existingDoc.purchases,
      sales: req.body.sales !== undefined ? req.body.sales : existingDoc.sales,
      spoilage: req.body.spoilage !== undefined ? req.body.spoilage : existingDoc.spoilage,
    };
    const newClosing = updatedValues.opening + updatedValues.purchases - updatedValues.sales - updatedValues.spoilage;
    
    const doc = await Inventory.findByIdAndUpdate(
      req.params.id,
      { ...updatedValues, closing: newClosing },
      { new: true }
    );

    if (doc.closing < Number(process.env.LOW_STOCK_THRESHOLD)) {
      notifyLowStock(doc.item, doc.closing);
    }
    await logAction('Inventory Updated', req.user.username, { itemId: doc._id, item: doc.item, newClosing: doc.closing });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/inventory/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const deletedDoc = await Inventory.findByIdAndDelete(req.params.id);
    if (!deletedDoc) {
        return res.status(404).json({ error: 'Inventory item not found' });
    }
    await logAction('Inventory Deleted', req.user.username, { itemId: deletedDoc._id, item: deletedDoc.item });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MODIFIED: Sales endpoints (Admin: All, Bar Staff: POST only) ---
app.post('/sales', auth, authorize(['admin', 'bar_staff']), async (req, res) => {
  try {
    const { item, number } = req.body;
    const sale = await Sale.create({ ...req.body, date: new Date() });

    if (item && typeof number === 'number' && number > 0) {
      try {
        const updatedInventoryItem = await Inventory.findOneAndUpdate(
          { item: item },
          { $inc: { closing: -number, sales: number } },
          { new: true }
        );

        if (updatedInventoryItem) {
          console.log(`Inventory updated for "${item}". New closing stock: ${updatedInventoryItem.closing}.`);
          if (updatedInventoryItem.closing < Number(process.env.LOW_STOCK_THRESHOLD)) {
            notifyLowStock(updatedInventoryItem.item, updatedInventoryItem.closing);
          }
        } else {
          console.warn(`Warning: Sold item "${item}" not found in Inventory. Inventory not updated.`);
        }
      } catch (inventoryError) {
        console.error(`Error updating inventory for item "${item}":`, inventoryError);
      }
    } else {
      console.warn("Warning: Sale request missing valid 'item' or 'number' for inventory deduction. Inventory not updated.");
    }
    await logAction('Sale Created', req.user.username, { saleId: sale._id, item: sale.item, number: sale.number, sp: sale.sp });
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/sales', auth, authorize(['admin', 'bar_staff']), async (req, res) => {
  try {
    const { date, page = 1, limit = 5 } = req.query;

    let query = {};
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query).sort({ date: -1 }).skip(skip).limit(Number(limit));

    res.json({
      data: sales,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/sales/:id', auth, authorize('admin'), async (req, res) => { // Admin only for edit/delete
  try {
    const updated = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Sale not found' });
    await logAction('Sale Updated', req.user.username, { saleId: updated._id, item: updated.item, newNumber: updated.number });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/sales/:id', auth, authorize('admin'), async (req, res) => { // Admin only for edit/delete
  try {
    const deleted = await Sale.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Sale not found' });
    await logAction('Sale Deleted', req.user.username, { saleId: deleted._id, item: deleted.item });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MODIFIED: Expenses endpoints (Admin: All, Bar Staff: POST only) ---
app.post('/expenses', auth, authorize(['admin', 'bar_staff']), async (req, res) => {
  try {
    const exp = await Expense.create({ ...req.body, date: new Date() });
    await logAction('Expense Created', req.user.username, { expenseId: exp._id, description: exp.description, amount: exp.amount });
    res.status(201).json(exp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/expenses', auth, authorize(['admin', 'bar_staff']), async (req, res) => {
  try {
    const { date, page = 1, limit = 5 } = req.query;

    let query = {};
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query).sort({ date: -1 }).skip(skip).limit(Number(limit));

    res.json({
      data: expenses,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/expenses/:id', auth, authorize('admin'), async (req, res) => { // Admin only for edit/delete
  try {
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    await logAction('Expense Updated', req.user.username, { expenseId: updated._id, description: updated.description, newAmount: updated.amount });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/expenses/:id', auth, authorize('admin'), async (req, res) => { // Admin only for edit/delete
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Expense not found' });
    await logAction('Expense Deleted', req.user.username, { expenseId: deleted._id, description: deleted.description });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MODIFIED: Cash Management Endpoints (Admin: All, Bar Staff: POST only) ---
app.post('/cash-journal', auth, authorize(['admin', 'bar_staff']), async (req, res) => {
    try {
        const { cashAtHand, cashBanked, bankReceiptId, responsiblePerson, date } = req.body;
        const newEntry = await CashJournal.create({
            cashAtHand,
            cashBanked,
            bankReceiptId,
            responsiblePerson,
            date: date ? new Date(date) : new Date()
        });
        await logAction('Cash Entry Created', req.user.username, { entryId: newEntry._id, cashAtHand: newEntry.cashAtHand, cashBanked: newEntry.cashBanked });
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/cash-journal', auth, authorize(['admin', 'bar_staff']), async (req, res) => { // Both roles can view
    try {
        const { date, responsiblePerson } = req.query;
        const filter = {};
        if (date) {
            const start = new Date(date);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            filter.date = { $gte: start, $lte: end };
        }
        if (responsiblePerson) {
            filter.responsiblePerson = new RegExp(responsiblePerson, 'i');
        }
        const records = await CashJournal.find(filter).sort({ date: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/cash-journal/:id', auth, authorize('admin'), async (req, res) => { // Admin only for edit/delete
    try {
        const { cashAtHand, cashBanked, bankReceiptId, responsiblePerson, date } = req.body;
        const updatedEntry = await CashJournal.findByIdAndUpdate(
            req.params.id,
            { cashAtHand, cashBanked, bankReceiptId, responsiblePerson, date: date ? new Date(date) : undefined },
            { new: true }
        );
        if (!updatedEntry) {
            return res.status(404).json({ error: 'Cash journal entry not found' });
        }
        await logAction('Cash Entry Updated', req.user.username, { entryId: updatedEntry._id, newCashAtHand: updatedEntry.cashAtHand });
        res.json(updatedEntry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/cash-journal/:id', auth, authorize('admin'), async (req, res) => { // Admin only for edit/delete
    try {
        const deletedEntry = await CashJournal.findByIdAndDelete(req.params.id);
        if (!deletedEntry) {
            return res.status(404).json({ error: 'Cash journal entry not found' });
        }
        await logAction('Cash Entry Deleted', req.user.username, { entryId: deletedEntry._id });
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NEW: Audit Log Endpoints (Admin Only) ---
app.get('/audit-logs', auth, authorize('admin'), async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100); // Limit to last 100 for performance
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
