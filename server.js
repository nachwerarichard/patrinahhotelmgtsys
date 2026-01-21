require('dotenv').config();
const nodemailer = require('nodemailer');


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    
    'https://hilarious-nasturtium-0d34d9.netlify.app'// Added the new link here
  ],
methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Added PATCH here
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// MongoDB Connection

// 1. Database Connection
// Replace the URI below with your actual MongoDB Connection String
const MONGO_URI = "mongodb+srv://nachwerarichy:parcelsys@hotelbarsys.mjsul7b.mongodb.net/?appName=hotelbarsys";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ DB Connection Error:", err));



const userSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'supervisor', 'clerk'], default: 'clerk' },
    station: { type: String, required: true },
    // --- ADD THESE TWO FIELDS ---
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['Active', 'Deactivated'], default: 'Active' },
    // ----------------------------
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
// Parcel Schema & Model
const parcelSchema = new mongoose.Schema({
    tracking_number: { type: String, unique: true },
    client_id: { type: String }, 
    sender_name: String,
    sender_phone: String,
    receiver_name: String,
    receiver_phone: String, // Added this to match your frontend
    origin: { type: String, enum: ['Mbale', 'Kampala'] },
    destination: { type: String, enum: ['Mbale', 'Kampala'] },
    
    // --- New Array for Multiple Items ---
    items: [{
        description: String,
        quantity: { type: Number, default: 1 },
        weight: { type: Number, default: 0 },
        rate: { type: Number, default: 0 },
        subtotal: { type: Number, default: 0 }
    }],

    // --- Financial Summary ---
    total_amount: { type: Number, default: 0 },
    amount_paid: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    payment_status: { 
        type: String, 
        enum: ['Unpaid', 'Paid', 'Partial'], 
        default: 'Unpaid' 
    },
    payment_method: { 
        type: String, 
        enum: ['Cash', 'Mobile Money', 'Bank'], 
        default: 'Cash' 
    },

    status: { 
        type: String, 
        enum: ['At Dispatch', 'In Transit', 'Ready for Pickup', 'Delivered','Partially received'],
        default: 'At Dispatch'
    },
    recorded_by: { type: String, default: 'System' }, // Add this line
    created_at: { type: Date, default: Date.now }
});

const Parcel = mongoose.model('Parcel', parcelSchema);
// 1. THE SCHEMA & MODEL


                 const customerSchema = new mongoose.Schema({
    full_name: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    id_number: { type: String }, 
    station: { type: String, enum: ['Kampala', 'Mbale'], required: true },
    created_at: { type: Date, default: Date.now }
});

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

// 1. ADD ITEM TO EXISTING WAYBILL
app.post('/api/parcels/:id/add-item', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid ID format. Please use the Database ID." });
    }
    try {
        const parcel = await Parcel.findById(req.params.id);
        if (!parcel) return res.status(404).json({ error: "Waybill not found" });

        const newItem = req.body; // Expects {description, quantity, rate, subtotal}
        
        // Add item to array
        parcel.items.push(newItem);

        // Recalculate Total and Balance
        parcel.total_amount += newItem.subtotal;
        parcel.balance = parcel.total_amount - parcel.amount_paid;

        // Update Payment Status automatically
        if (parcel.amount_paid <= 0) parcel.payment_status = 'Unpaid';
        else if (parcel.amount_paid < parcel.total_amount) parcel.payment_status = 'Partial';
        else parcel.payment_status = 'Paid';

        await parcel.save();
        res.json(parcel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. ADD PAYMENT TO EXISTING WAYBILL
app.post('/api/parcels/:id/add-payment', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid ID format. Please use the Database ID." });
    }
    try {
        const parcel = await Parcel.findById(req.params.id);
        if (!parcel) return res.status(404).json({ error: "Waybill not found" });

        const { amount_paid, payment_method } = req.body;

        // Add new payment to existing total paid
        parcel.amount_paid += Number(amount_paid);
        parcel.payment_method = payment_method;
        
        // Recalculate Balance
        parcel.balance = parcel.total_amount - parcel.amount_paid;

        // Update Payment Status
        if (parcel.amount_paid >= parcel.total_amount) {
            parcel.payment_status = 'Paid';
        } else if (parcel.amount_paid > 0) {
            parcel.payment_status = 'Partial';
        }

        await parcel.save();
        res.json(parcel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET SINGLE PARCEL BY ID
app.get('/api/parcels/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }
        const parcel = await Parcel.findById(req.params.id);
        if (!parcel) return res.status(404).json({ error: "Waybill not found" });
        
        res.json(parcel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Check your server.js for these exact paths
app.post('/api/customers', async (req, res) => {
    try {
        const newCustomer = new Customer(req.body);
        await newCustomer.save();
        res.status(201).json(newCustomer);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Also ensure your GET route is plural
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ full_name: 1 });
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DELETE: Remove a customer by ID ---
app.delete('/api/customers/:id', async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        res.json({ message: "Customer deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PUT: Update customer details ---
app.put('/api/customers/:id', async (req, res) => {
    try {
        const updatedCustomer = await Customer.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true } // Returns the modified document
        );
        res.json(updatedCustomer);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});
// GET: Fetch a single customer by ID
app.get('/api/customers/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        res.json(customer);
    } catch (err) {
        res.status(404).json({ error: "Customer not found" });
    }
});
// --- RECEIVER ROUTES ---




app.patch('/api/parcels/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        // Validate that the status is one of your allowed enum values
        const allowedStatuses = ['At Dispatch', 'In Transit', 'Ready for Pickup', 'Delivered'];
        
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const updatedParcel = await Parcel.findByIdAndUpdate(
            req.params.id, 
            { status: status }, 
            { new: true } // returns the updated document
        );

        res.json(updatedParcel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- CRUD ENDPOINTS ---

// GET: Fetch all parcels
app.get('/api/parcels', async (req, res) => {
    try {
        const parcels = await Parcel.find().sort({ created_at: -1 });
        res.json(parcels);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Create a new parcel
app.post('/api/parcels', async (req, res) => {
    try {
        const trackingNum = "TRK-" + Math.random().toString(36).substr(2, 7).toUpperCase();
        const parcelData = { ...req.body, tracking_number: trackingNum };
        const newParcel = new Parcel(parcelData);
        await newParcel.save();
        res.status(201).json(newParcel);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT: Update an existing parcel (The Edit Endpoint)
app.put('/api/parcels/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // findByIdAndUpdate takes the ID, the new data, 
        // and {new: true} returns the updated document instead of the old one
        const updatedParcel = await Parcel.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updatedParcel) {
            return res.status(404).json({ error: "Parcel not found" });
        }

        res.json(updatedParcel);
    } catch (err) {
        console.error("Update Error:", err);
        res.status(400).json({ error: err.message });
    }
}); 

// DELETE: Remove a parcel
app.delete('/api/parcels/:id', async (req, res) => {
    try {
        await Parcel.findByIdAndDelete(req.params.id);
        res.json({ message: "Parcel deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 3. ROUTES

// --- User Registration (Admin Only) ---
app.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, role, station } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already registered" });

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            full_name,
            email,
            password: hashedPassword,
            role,
            station
        });

        await newUser.save();
        res.status(201).json({ message: "Staff member registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Login Logic ---
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Return user data (excluding password)
        const { password: _, ...userData } = user._doc;
        res.json(userData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Get All Users ---
app.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Delete User ---
app.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "User deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// DEACTIVATE
app.patch('/users/:id/deactivate', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { isActive: false, status: 'Deactivated' });
    res.json({ message: "Deactivated" });
});

// REACTIVATE
app.patch('/users/:id/reactivate', async (req, res) => {
    await User.findByIdAndUpdate(req.params.id, { isActive: true, status: 'Active' });
    res.json({ message: "Reactivated" });
});

// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
