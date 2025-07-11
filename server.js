require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
// const bodyParser = require('body-parser'); // <-- Can be removed
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json()); // Use built-in Express JSON parser

// CORS config - allow your frontend origin
app.use(cors({
  origin: 'https://endearing-toffee-c8a2aa.netlify.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// app.use(bodyParser.json()); // <-- REMOVE THIS LINE, express.json() is sufficient

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

// Schemas (Defined here for clarity, order doesn't strictly matter if all are defined before use)
const CashJournal = mongoose.model('CashJournal', new mongoose.Schema({
    cashAtHand: Number, // Amount of physical cash currently on hand
    cashBanked: Number, // Amount of cash deposited into the bank
    bankReceiptId: String, // ID from the bank deposit slip
    responsiblePerson: String, // Person responsible for this cash entry
    date: { type: Date, default: Date.now } // Date of the cash entry
}));

const Inventory = mongoose.model('Inventory', new mongoose.Schema({
  item: String,
  opening: Number,
  purchases: Number,
  sales: Number, // This will now reflect transactional sales
  spoilage: Number,
  closing: Number, // This will automatically decrease
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
      to: process.env.EMAIL_USER, // You might want to change this to an admin email
      subject: `Low stock alert: ${item}`,
      text: `Stock for ${item} is now ${current}, below threshold! Please reorder.`
    });
    console.log(`Low stock email sent for ${item}. Current stock: ${current}`);
  } catch (err) {
    console.error('Error sending low stock email:', err);
  }
}

// --- Cash Management Endpoints ---
app.post('/cash-journal', auth, async (req, res) => {
    try {
        const { cashAtHand, cashBanked, bankReceiptId, responsiblePerson, date } = req.body;
        const newEntry = await CashJournal.create({
            cashAtHand,
            cashBanked,
            bankReceiptId,
            responsiblePerson,
            date: date ? new Date(date) : new Date()
        });
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/cash-journal', auth, async (req, res) => {
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

app.put('/cash-journal/:id', auth, async (req, res) => {
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
        res.json(updatedEntry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/cash-journal/:id', auth, async (req, res) => {
    try {
        const deletedEntry = await CashJournal.findByIdAndDelete(req.params.id);
        if (!deletedEntry) {
            return res.status(404).json({ error: 'Cash journal entry not found' });
        }
        res.sendStatus(204);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Inventory Endpoints ---
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
    // 1. Find the existing inventory document
    const existingDoc = await Inventory.findById(req.params.id);

    if (!existingDoc) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    // 2. Create an object with potentially updated values
    // Use values from req.body if they exist, otherwise use existing values
    const updatedValues = {
      item: req.body.item !== undefined ? req.body.item : existingDoc.item,
      opening: req.body.opening !== undefined ? req.body.opening : existingDoc.opening,
      purchases: req.body.purchases !== undefined ? req.body.purchases : existingDoc.purchases,
      sales: req.body.sales !== undefined ? req.body.sales : existingDoc.sales,
      spoilage: req.body.spoilage !== undefined ? req.body.spoilage : existingDoc.spoilage,
    };

    // 3. Recalculate the closing stock based on the updated values
    const newClosing = updatedValues.opening + updatedValues.purchases - updatedValues.sales - updatedValues.spoilage;

    // 4. Update the document in the database with all fields, including the new closing
    const doc = await Inventory.findByIdAndUpdate(
      req.params.id,
      { ...updatedValues, closing: newClosing }, // Merge updated fields with the recalculated closing
      { new: true } // Return the updated document
    );

    // 5. Low stock check (remains the same)
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

// --- Sales endpoints ---
app.post('/sales', auth, async (req, res) => {
  try {
    const { item, number } = req.body; // Extract item and number from the sale request
    
    // 1. Create the Sale Record
    const sale = await Sale.create({ ...req.body, date: new Date() });

    // 2. Perform Automatic Inventory Deduction
    if (item && typeof number === 'number' && number > 0) { // Basic validation
      try {
        const updatedInventoryItem = await Inventory.findOneAndUpdate(
          { item: item }, // Find the inventory item by its name
          {
            $inc: {
              closing: -number, // Decrease closing stock by the sold quantity
              sales: number     // Increment the 'sales' counter in the Inventory record
            }
          },
          { new: true } // Return the updated document
        );

        if (updatedInventoryItem) {
          console.log(`Inventory updated for "${item}". New closing stock: ${updatedInventoryItem.closing}.`);
          // 3. Check for low stock after deduction
          if (updatedInventoryItem.closing < Number(process.env.LOW_STOCK_THRESHOLD)) {
            notifyLowStock(updatedInventoryItem.item, updatedInventoryItem.closing);
          }
        } else {
          // If the item was sold but not found in Inventory
          console.warn(`Warning: Sold item "${item}" not found in Inventory. Inventory not updated.`);
          // You might choose to send a different status code for the sale or
          // include a warning in the response, but the sale itself is still recorded.
        }
      } catch (inventoryError) {
        console.error(`Error updating inventory for item "${item}":`, inventoryError);
        // Log the inventory update error, but allow the sale record to be created
        // so the financial transaction is not lost.
      }
    } else {
      console.warn("Warning: Sale request missing valid 'item' or 'number' for inventory deduction. Inventory not updated.");
    }

    res.status(201).json(sale); // Respond with the created sale record
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
    // IMPORTANT: If you allow editing sales that affects quantity, you would need
    // to adjust inventory here too. For simplicity, we're assuming sales edits
    // don't change quantity for inventory purposes, or inventory is adjusted manually.
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

// --- NEW: Login Endpoint for Frontend Validation ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Validate credentials against your hardcoded ones (or a database in a real app)
    if (username === 'admin' && password === '123') {
        res.status(200).json({ message: 'Login successful' });
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
