require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

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
  'Nachwera Richard': { password: '123', role: 'Nachwera Richard' },
  'Nelson': { password: '123', role: 'Nelson' },
  'Florence': { password: '123', role: 'Florence' },
  'Martha': { password: '456', role: 'Martha' },
  'Joshua': { password: '456', role: 'Joshua' }
};
// --- !!! END OF WARNING !!! ---


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
  action: { type: String, required: true },
  user: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: mongoose.Schema.Types.Mixed }
}));

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
  date: { type: Date, default: Date.now }
}));

const Sale = mongoose.model('Sale', new mongoose.Schema({
  item: String,
  number: Number,
  bp: Number,
  sp: Number,
  profit: Number,
  percentageprofit: Number,
  date: { type: Date, default: Date.now }
}));

const Expense = mongoose.model('Expense', new mongoose.Schema({
  description: String,
  amount: Number,
  receiptId: String,
  date: { type: Date, default: Date.now },
  source: String,
  recordedBy: String,
}));


// --- Helper Functions ---
async function logAction(action, user, details = {}) {
  try {
    await AuditLog.create({ action, user, details });
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}

// Nodemailer setup
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

// --- Middleware ---
async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Malformed authorization header' });

  try {
    const credentials = Buffer.from(token, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');
    const user = HARDCODED_USERS[username];

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.user = { username: username, role: user.role, id: username };
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Forbidden: You do not have the required permissions.' });
    }
    next();
  };
}

// --- Date Helper Function (Corrected) ---
// This function calculates the correct start and end of a day in UTC
// for a given EAT date string ('YYYY-MM-DD').
function getStartAndEndOfDayInUTC(dateString) {
  const selectedDate = new Date(dateString);
  if (isNaN(selectedDate.getTime())) {
    return { error: 'Invalid date format. Use YYYY-MM-DD.' };
  }
  
  // Set the date to midnight UTC (00:00:00.000) to create a consistent reference point.
  selectedDate.setUTCHours(0, 0, 0, 0);

  // EAT is UTC+3. To find the start of the EAT day in UTC,
  // we must subtract 3 hours from the UTC midnight time.
  // For example, EAT 00:00 is UTC 21:00 of the previous day.
  const utcStart = new Date(selectedDate.getTime() - 3 * 60 * 60 * 1000);

  // The end of the EAT day is exactly 24 hours after its start.
  const utcEnd = new Date(utcStart.getTime() + 24 * 60 * 60 * 1000);
  
  return { utcStart, utcEnd };
}


// --- INVENTORY HELPERS (CORRECTED) ---
// This helper function correctly finds or creates today's inventory record.
async function getTodayInventory(itemName, initialOpening = 0) {
  // Ensure the initial opening value is not negative.
  initialOpening = Math.max(0, initialOpening);
  
  const { utcStart, utcEnd } = getStartAndEndOfDayInUTC(new Date().toISOString().slice(0, 10));
  
  // Find a record for today within the correct EAT date range
  let record = await Inventory.findOne({ item: itemName, date: { $gte: utcStart, $lt: utcEnd } });

  if (!record) {
    // If no record exists, get yesterday's closing
    const latest = await Inventory.findOne({ item: itemName }).sort({ date: -1 });
    const opening = latest ? latest.closing : initialOpening;
    
    // Create the new record for today
    record = await Inventory.create({
      item: itemName,
      opening,
      purchases: 0,
      sales: 0,
      spoilage: 0,
      closing: opening,
      date: new Date()
    });
  }

  return record;
}


// --- ROUTES ---
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = HARDCODED_USERS[username];

  if (!user || user.password !== password) {
    console.warn(`Login failed for username: ${username}. Invalid credentials.`);
    await logAction('Login Attempt Failed', username, { reason: 'Invalid credentials provided.' });
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  console.log(`Login successful for username: ${username}, role: ${user.role}`);
  await logAction('Login Successful', username);
  res.status(200).json({ username: user.username, role: user.role });
});

app.post('/logout', auth, async (req, res) => {
  await logAction('Logout', req.user.username);
  res.status(200).json({ message: 'Logged out successfully' });
});

// --- Inventory Endpoints (Corrected) ---
app.post('/inventory', auth, authorize(['Nachwera Richard', 'Nelson', 'Florence', 'Martha', 'Joshua']), async (req, res) => {
  try {
    const { item, opening, purchases = 0, sales = 0, spoilage = 0 } = req.body;
    
    // Validation to prevent negative values
    if (opening < 0 || purchases < 0 || sales < 0 || spoilage < 0) {
      return res.status(400).json({ error: 'Inventory values cannot be negative.' });
    }

    // Find today's inventory record or create a new one
    let record = await getTodayInventory(item, opening);
    
    // Update the record with new values
    const newClosing = record.opening + record.purchases + purchases - record.sales - sales - record.spoilage - spoilage;

    if (newClosing < 0) {
      return res.status(400).json({ error: 'Action would result in negative inventory.' });
    }
    
    record.purchases += purchases;
    record.sales += sales;
    record.spoilage += spoilage;
    record.closing = newClosing;

    await record.save();

    // Check if the item name starts with 'rest' before sending a notification
    if (record.closing < Number(process.env.LOW_STOCK_THRESHOLD) && !record.item.toLowerCase().startsWith('rest')) {
      notifyLowStock(record.item, record.closing);
    }
    
    await logAction('Inventory Updated/Created', req.user.username, { item: record.item, closing: record.closing });
    res.status(200).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**
 * Handles PUT requests to update an existing inventory item.
 * This version of the route has the date check removed, allowing for
 * the modification of past inventory records.
 */
app.put('/inventory/:id', auth, authorize(['Nachwera Richard', 'Nelson', 'Florence']), async (req, res) => {
    try {
        const record = await Inventory.findById(req.params.id);
        if (!record) {
            return res.status(404).json({ error: 'Inventory item not found' });
        }

        // The date check to prevent editing past records has been removed
        // to fulfill the request to allow editing of historical data.

        // Update fields and recalculate closing stock
        const { item, opening, purchases, sales, spoilage } = req.body;
        
        // Validation to prevent negative values
        if (
            (opening !== undefined && opening < 0) || 
            (purchases !== undefined && purchases < 0) || 
            (sales !== undefined && sales < 0) || 
            (spoilage !== undefined && spoilage < 0)
        ) {
            return res.status(400).json({ error: 'Inventory values cannot be negative.' });
        }

        record.item = item ?? record.item;
        record.opening = opening ?? record.opening;
        record.purchases = purchases ?? record.purchases;
        record.sales = sales ?? record.sales;
        record.spoilage = spoilage ?? record.spoilage;
        
        // Recalculate closing stock based on the updated values
        const newClosing = record.opening + record.purchases - record.sales - record.spoilage;
        
        if (newClosing < 0) {
            return res.status(400).json({ error: 'Action would result in negative inventory.' });
        }

        record.closing = newClosing;

        await record.save();

        // Check if the item name starts with 'rest' before sending a notification
        if (record.closing < Number(process.env.LOW_STOCK_THRESHOLD) && !record.item.toLowerCase().startsWith('rest')) {
            notifyLowStock(record.item, record.closing);
        }

        await logAction('Inventory Updated', req.user.username, { itemId: record._id, item: record.item, newClosing: record.closing });
        res.json(record);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/inventory', auth, authorize(['Nachwera Richard', 'Florence', 'Nelson', 'Joshua', 'Martha']), async (req, res) => {
    try {
        const { item, low, date, page = 1, limit = 50 } = req.query;
        let filter = {};
        
        // Validate numeric parameters
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const lowNum = low !== undefined ? parseInt(low) : undefined;
        
        if (pageNum < 1 || limitNum < 1 || (lowNum !== undefined && lowNum < 0)) {
            return res.status(400).json({ error: 'Numeric query parameters (page, limit, low) cannot be negative or zero.' });
        }

        if (date) {
            const { utcStart, utcEnd, error } = getStartAndEndOfDayInUTC(date);
            if (error) {
                return res.status(400).json({ error });
            }

            const allItems = await Inventory.distinct('item');
            const dailyRecords = await Inventory.find({
                date: { $gte: utcStart, $lt: utcEnd }
            });

            const recordsMap = new Map();
            dailyRecords.forEach(record => {
                recordsMap.set(record.item, record);
            });

            const report = await Promise.all(allItems.map(async (singleItem) => {
                const record = recordsMap.get(singleItem);

                if (record) {
                    // Item had activity on this day, use its record
                    return {
                        _id: record._id, // Add the _id field here
                        item: singleItem,
                        opening: record.opening,
                        purchases: record.purchases,
                        sales: record.sales,
                        spoilage: record.spoilage,
                        closing: record.closing
                    };
                } else {
                    // Item had no activity. Find its most recent closing stock before this date.
                    const latestBeforeDate = await Inventory.findOne({
                        item: singleItem,
                        date: { $lt: utcStart }
                    }).sort({ date: -1 });

                    return {
                        // The id for this item comes from the latest record
                        _id: latestBeforeDate ? latestBeforeDate._id : null,
                        item: singleItem,
                        opening: latestBeforeDate ? latestBeforeDate.closing : 0,
                        purchases: 0,
                        sales: 0,
                        spoilage: 0,
                        closing: latestBeforeDate ? latestBeforeDate.closing : 0
                    };
                }
            }));
            
            return res.json({ date, report });
        }

        // --- Original `/inventory` logic continues below if no date is provided ---
        if (item) filter.item = new RegExp(item, 'i');
        if (low) filter.closing = { $lt: lowNum };
        
        const skip = (pageNum - 1) * limitNum;
        const [total, docs] = await Promise.all([
            Inventory.countDocuments(filter),
            Inventory.find(filter).skip(skip).limit(limitNum).sort({ item: 1 })
        ]);

        res.json({
            data: docs,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.delete('/inventory/:id', auth, authorize(['Nachwera Richard', 'Nelson', 'Florence']), async (req, res) => {
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

// --- Sales Endpoints (Corrected) ---
app.post('/sales', auth, authorize(['Nachwera Richard', 'Martha', 'Joshua', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const { item, number, bp, sp } = req.body;
    
    // Input validation
    if (number < 0) {
      return res.status(400).json({ error: 'Number of items in a sale cannot be negative.' });
    }
    
    const totalBuyingPrice = bp * number;
    const totalSellingPrice = sp * number;
    const profit = totalSellingPrice - totalBuyingPrice;
    const percentageProfit = totalBuyingPrice !== 0 ? (profit / totalBuyingPrice) * 100 : 0;

    // Check if the sale would result in negative inventory before proceeding.
    if (item && typeof number === 'number' && number > 0) {
      const todayInventory = await getTodayInventory(item);
      const newClosing = todayInventory.closing - number;
      if (newClosing < 0) {
        return res.status(400).json({ error: `Not enough stock for ${item}. Closing stock would be negative.` });
      }
      todayInventory.sales += number;
      todayInventory.closing = newClosing;
      await todayInventory.save();

      console.log(`Inventory updated for "${item}". New closing stock: ${todayInventory.closing}.`);
      if (todayInventory.closing < Number(process.env.LOW_STOCK_THRESHOLD) && !todayInventory.item.toLowerCase().startsWith('rest')) {
        notifyLowStock(item, todayInventory.closing);
      }
    } else {
      console.warn("Warning: Sale request missing valid 'item' or 'number' for inventory deduction. Inventory not updated.");
    }
    
    // Create the sale record after the inventory check
    const sale = await Sale.create({
      ...req.body,
      profit,
      percentageprofit: percentageProfit,
      date: new Date()
    });

    await logAction('Sale Created', req.user.username, { saleId: sale._id, item: sale.item, number: sale.number, sp: sale.sp });
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/sales', auth, authorize(['Nachwera Richard', 'Martha', 'Joshua', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const { date, page = 1, limit = 5 } = req.query;

    // Validate numeric parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers.' });
    }
    
    let query = {};

    if (date) {
      const { utcStart, utcEnd, error } = getStartAndEndOfDayInUTC(date);
      if (error) return res.status(400).json({ error });
      query.date = { $gte: utcStart, $lt: utcEnd };
    }

    const skip = (pageNum - 1) * limitNum;
    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query).sort({ date: -1 }).skip(skip).limit(limitNum);

    res.json({
      data: sales,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/sales/:id', auth, authorize(['Nachwera Richard', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const updated = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Sale not found' });
    await logAction('Sale Updated', req.user.username, { saleId: updated._id, item: updated.item, newNumber: updated.number });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/sales/:id', auth, authorize(['Nachwera Richard', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const deleted = await Sale.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Sale not found' });
    await logAction('Sale Deleted', req.user.username, { saleId: deleted._id, item: deleted.item });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Expenses Endpoints ---
app.post('/expenses', auth, authorize(['Nachwera Richard', 'Martha', 'Joshua', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const { description, amount, receiptId, source } = req.body;
    const exp = await Expense.create({
      description,
      amount,
      receiptId,
      source,
      recordedBy: req.user.username,
      date: new Date()
    });
    await logAction('Expense Created', req.user.username, { expenseId: exp._id, description: exp.description, amount: exp.amount });
    res.status(201).json(exp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/expenses', auth, authorize(['Nachwera Richard', 'Martha', 'Joshua', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const { date, page = 1, limit = 5 } = req.query;
    
    // Validate numeric parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers.' });
    }

    let query = {};

    if (date) {
      const { utcStart, utcEnd, error } = getStartAndEndOfDayInUTC(date);
      if (error) return res.status(400).json({ error });
      query.date = { $gte: utcStart, $lt: utcEnd };
    }

    const skip = (pageNum - 1) * limitNum;
    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query).sort({ date: -1 }).skip(skip).limit(limitNum);

    res.json({
      data: expenses,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/expenses/:id', auth, authorize(['Nachwera Richard', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    await logAction('Expense Updated', req.user.username, { expenseId: updated._id, description: updated.description, newAmount: updated.amount });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Cash Management Endpoints ---
app.post('/cash-journal', auth, authorize(['Nachwera Richard', 'Martha', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const { cashAtHand, cashBanked, bankReceiptId, date } = req.body;
    const newEntry = await CashJournal.create({
      cashAtHand,
      cashBanked,
      bankReceiptId,
      responsiblePerson: req.user.username,
      date: date ? new Date(date) : new Date()
    });
    await logAction('Cash Entry Created', req.user.username, { entryId: newEntry._id, cashAtHand: newEntry.cashAtHand, cashBanked: newEntry.cashBanked });
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/cash-journal', auth, authorize(['Nachwera Richard', 'Martha', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const { date, responsiblePerson } = req.query;
    const filter = {};
    if (date) {
      const { utcStart, utcEnd, error } = getStartAndEndOfDayInUTC(date);
      if (error) return res.status(400).json({ error });
      filter.date = { $gte: utcStart, $lt: utcEnd };
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

app.put('/cash-journal/:id', auth, authorize(['Nachwera Richard', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const { cashAtHand, cashBanked, bankReceiptId, date } = req.body;
    const updatedEntry = await CashJournal.findByIdAndUpdate(
      req.params.id,
      { cashAtHand, cashBanked, bankReceiptId, responsiblePerson: req.user.username, date: date ? new Date(date) : undefined },
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

// --- Audit Log Endpoints ---
app.get('/audit-logs', auth, authorize(['Nachwera Richard', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    // Validate numeric parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    if (pageNum < 1 || limitNum < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers.' });
    }

    const skip = (pageNum - 1) * limitNum;
    let query = {};
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { user: searchRegex },
          { action: searchRegex },
          { 'details.item': searchRegex },
          { 'details.description': searchRegex }
        ]
      };
    }
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      data: logs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Error fetching audit logs on server:', err);
    res.status(500).json({ error: err.message });
  }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
