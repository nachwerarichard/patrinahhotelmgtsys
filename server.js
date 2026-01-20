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
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Parcel Schema & Model
const parcelSchema = new mongoose.Schema({
    tracking_number: { type: String, unique: true },
    client_id: { type: String }, // Backend generated (e.g., UUID or custom string)
    sender_name: String,
    sender_phone: String,
    receiver_name: String,
    origin: { type: String, enum: ['Mbale', 'Kampala'] },
    destination: { type: String, enum: ['Mbale', 'Kampala'] },
    description: String,
    quantity: Number,
    weight: Number,
    volume: Number,
    price: Number,
    
    // --- New Payment Fields ---
    payment_status: { 
        type: String, 
        enum: ['Unpaid', 'Paid', 'Partial'], 
        default: 'Unpaid' 
    },
    total_amount: { type: Number, default: 0 },
    amount_paid: { type: Number, default: 0 },
    // --------------------------

    status: { 
        type: String, 
        enum: ['At Dispatch', 'In Transit', 'Ready for Pickup', 'Delivered'],
        default: 'At Dispatch'
    },
    created_at: { type: Date, default: Date.now }
});

const Parcel = mongoose.model('Parcel', parcelSchema);
// 1. THE SCHEMA & MODEL
const senderSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    phone: { type: String, required: true },
    id_number: { type: String }, 
    station: { type: String, enum: ['Kampala', 'Mbale'], required: true },
    created_at: { type: Date, default: Date.now }
});

// We check if the model exists already to prevent errors during hot-reloading
const Sender = mongoose.models.Sender || mongoose.model('Sender', senderSchema);

// --- RECEIVER MODEL ---
const receiverSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    phone: { type: String, required: true },
    id_number: { type: String }, 
    station: { type: String, enum: ['Kampala', 'Mbale'], required: true },
    created_at: { type: Date, default: Date.now }
});

const Receiver = mongoose.models.Receiver || mongoose.model('Receiver', receiverSchema);

// --- RECEIVER ROUTES ---

// POST: Add new receiver
app.post('/api/receivers', async (req, res) => {
    try {
        const newReceiver = new Receiver(req.body);
        await newReceiver.save();
        res.status(201).json(newReceiver);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET: Fetch all receivers
app.get('/api/receivers', async (req, res) => {
    try {
        const receivers = await Receiver.find().sort({ created_at: -1 });
        res.json(receivers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Remove a receiver
app.delete('/api/receivers/:id', async (req, res) => {
    try {
        await Receiver.findByIdAndDelete(req.params.id);
        res.json({ message: "Receiver deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 2. THE ROUTES

// POST: Create a new sender
app.post('/api/senders', async (req, res) => {
    try {
        const { full_name, phone, id_number, station } = req.body;
        const newSender = new Sender({ full_name, phone, id_number, station });
        await newSender.save();
        res.status(201).json(newSender);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET: Fetch all senders
app.get('/api/senders', async (req, res) => {
    try {
        const senders = await Sender.find().sort({ created_at: -1 });
        res.json(senders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Remove a sender
app.delete('/api/senders/:id', async (req, res) => {
    try {
        await Sender.findByIdAndDelete(req.params.id);
        res.json({ message: "Sender deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


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

// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
