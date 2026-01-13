require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();
app.use(express.json());

// CORS config - allow your frontend origin
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
mongoose.connect('mongodb+srv://nachwerarichy:parcelsys@hotelbarsys.mjsul7b.mongodb.net/?appName=hotelbarsys');

// 1. Staff Schema
const StaffSchema = new mongoose.Schema({
    full_name: String,
    role: { type: String, enum: ['admin', 'clerk', 'supervisor'] },
    station: { type: String, enum: ['Mbale', 'Kampala'] },
    email: String,
    password_hash: String
});

// 2. Parcel Schema [ cite: Tables Parcel ]
const ParcelSchema = new mongoose.Schema({
    tracking_number: { type: String, unique: true },
    sender_name: String,
    sender_phone: String,
    receiver_name: String,
    origin: String,
    destination: String,
    status: { 
        type: String, 
        enum: ['At Dispatch', 'In Transit', 'Ready for Pickup', 'Delivered'],
        default: 'At Dispatch'
    },
    weight: Number,
    created_at: { type: Date, default: Date.now }
});

// 3. Payment Schema [ cite: Tables Payments ]
const PaymentSchema = new mongoose.Schema({
    parcel_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Parcel' },
    payment_status: { type: String, enum: ['Paid', 'Unpaid', 'Partial'] },
    total_amount: Number,
    amount_paid: Number,
    balance: Number,
    payment_date: { type: Date, default: Date.now }
});

const Staff = mongoose.model('Staff', StaffSchema);
const Parcel = mongoose.model('Parcel', ParcelSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

// API ROUTES
// Register Parcel & Payment [User Flow 3 & 4]
app.post('/api/parcels', async (req, res) => {
    try {
        const parcel = new Parcel(req.body.parcelData);
        await parcel.save();

        const payment = new Payment({
            parcel_id: parcel._id,
            ...req.body.paymentData,
            balance: req.body.paymentData.total_amount - req.body.paymentData.amount_paid
        });
        await payment.save();

        res.status(201).json({ parcel, payment });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update Status [User Flow 5, 6, 7]
app.patch('/api/parcels/:tracking/status', async (req, res) => {
    const { status } = req.body;
    const parcel = await Parcel.findOneAndUpdate(
        { tracking_number: req.params.tracking },
        { status: status },
        { new: true }
    );
    res.json(parcel);
});

app.listen(5000, () => console.log('Server running on port 5000'));
