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
    'https://stirring-pony-fe2347.netlify.app',
    'https://elegant-pasca-cea136.netlify.app',
    'https://hilarious-nasturtium-0d34d9.netlify.app'// Added the new link here
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// MongoDB Connection

// 1. Database Connection
// Replace the URI below with your actual MongoDB Connection String
const MONGO_URI = "mongodb+srv://nachwerarichy:parcelsys@hotelbarsys.mjsul7b.mongodb.net/?appName=hotelbarsys";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// 2. User Schema & Model
const userSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'supervisor', 'clerk'], default: 'clerk' },
    station: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- NEW SCHEMAS ---

// Client (Sender) Schema
const clientSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    phone: { type: String, required: true },
    id_number: { type: String },
    station: { type: String, enum: ['Mbale', 'Kampala'], required: true },
    created_at: { type: Date, default: Date.now }
});

// Parcel Schema
const parcelSchema = new mongoose.Schema({
    tracking_number: { type: String, unique: true },
    client_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    receiver_name: String,
    origin: { type: String, enum: ['Mbale', 'Kampala'] },
    destination: { type: String, enum: ['Mbale', 'Kampala'] },
    description: String,
    quantity: Number,
    weight: Number,
    volume: Number,
    price: Number,
    status: { type: String, default: 'At Dispatch' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
    parcel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
    payment_status: { type: String, enum: ['Paid', 'Unpaid', 'Partial'] },
    payment_type: { type: String, enum: ['Cash', 'Mobile Money', 'Bank'] },
    total_amount: Number,
    amount_paid: Number,
    balance: Number,
    received_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    payment_date: { type: Date, default: Date.now }
});

const Client = mongoose.model('Client', clientSchema);
const Parcel = mongoose.model('Parcel', parcelSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// --- NEW ROUTES ---

// Register Client
app.post('/clients', async (req, res) => {
    const client = new Client(req.body);
    await client.save();
    res.status(201).json(client);
});

app.get('/clients', async (req, res) => {
    const clients = await Client.find();
    res.json(clients);
});

// Create Parcel and Payment Record simultaneously
app.post('/parcels', async (req, res) => {
    try {
        const { parcelData, paymentData } = req.body;
        
        // 1. Save Parcel
        const parcel = new Parcel({
            ...parcelData,
            tracking_number: "TRK-" + Date.now().toString().slice(-6)
        });
        const savedParcel = await parcel.save();

        // 2. Save Payment
        const payment = new Payment({
            ...paymentData,
            parcel_id: savedParcel._id
        });
        await payment.save();

        res.status(201).json(savedParcel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/payments', async (req, res) => {
    const payments = await Payment.find().populate('parcel_id').populate('received_by', 'full_name');
    res.json(payments);
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
