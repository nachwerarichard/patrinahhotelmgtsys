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
    origin: '*',
    methods: ['GET', 'POST', 'PUT','PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// MongoDB Connection

// 1. Database Connection
// Replace the URI below with your actual MongoDB Connection String
const MONGO_URI = "mongodb+srv://nachwerarichy:parcelsys@hotelbarsys.mjsul7b.mongodb.net/?appName=hotelbarsys";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ DB Connection Error:", err));
const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g., 'CREATE_PARCEL', 'DELETE_USER'
    module: { type: String, required: true }, // e.g., 'Parcels', 'Users', 'Bookings'
    performed_by: { type: String, required: true }, // User email or Name
    details: { type: mongoose.Schema.Types.Mixed }, // Flexible object for IDs or changes
    timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);


const userSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'supervisor', 'clerk'], default: 'clerk' },
    station: { type: String, enum: ['Kampala - Taxi Park', 'Mbale - Bishop Wasikye Rd',' Kampala - Aponye' ,'Mbale- -DTB'] },
    // --- ADD THESE TWO FIELDS ---
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['Active', 'Deactivated'], default: 'Active' },
    // ----------------------------
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
// Parcel Schema & Model
const parcelSchema = new mongoose.Schema({
    // ... (Your existing fields: sender_id, receiver_id, tracking_number, etc.)
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    tracking_number: { type: String, unique: true },
    client_id: { type: String }, 
    sender_name: String,
    sender_phone: String,
    receiver_name: String,
    receiver_phone: String,
    origin: { type: String, enum: ['Mbale', 'Kampala'] },
    destination: { type: String, enum: ['Mbale', 'Kampala'] },
    
    items: [{
        description: String,
        quantity: { type: Number, default: 1 },
        weight: { type: Number, default: 0 },
        rate: { type: Number, default: 0 },
        subtotal: { type: Number, default: 0 }
    }],

        total_amount: { type: Number, default: 0 },
        amount_paid: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
        payment_status: { type: String, enum: ['Unpaid', 'Paid', 'Partial'], default: 'Unpaid' },
        payment_method: { type: String, enum: ['Cash', 'MTN Momo','Airtel Pay', 'Bank'], default: 'Cash' },
    

    // --- TRACKING STATUS ---
    status: { 
        type: String, 
        enum: ['At Dispatch', 'In Transit', 'Ready for Pickup', 'Delivered','Partially received'],
        default: 'At Dispatch'
    },

    // 1. SIMPLE TRACKING: Last station and last update time
    last_updated_at: { type: Date, default: Date.now },
    last_station: { type: String, enum: ['Kampala - Taxi Park', 'Mbale - Bishop Wasikye Rd',' Kampala - Aponye' ,'Mbale - DTB'] },

    // 2. DETAILED TRACKING: A history log of every move
    status_history: [{
        status: String,
        station: String,
        updated_by: String, // Name of the clerk/courier
        timestamp: { type: Date, default: Date.now }
    }],

    recorded_by: { type: String, default: 'System' },
    created_at: { type: Date, default: Date.now }
});
// 1. THE SCHEMA & MODEL
const Parcel = mongoose.model('Parcel', parcelSchema);


                 const customerSchema = new mongoose.Schema({
    full_name: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    id_number: { type: String }, 
    station: { type: String, enum: ['Kampala', 'Mbale'], required: true },
    created_at: { type: Date, default: Date.now }
});

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
// server.js


// Schema Definition
const BookingSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    idNumber: String,
    origin: { 
        type: String, 
        enum: ['Mbale', 'Kampala', 'Jinja', 'Iganga', 'Mukono'],
        required: true 
    },
    destination: { 
        type: String, 
        enum: ['Mbale', 'Kampala', 'Jinja', 'Iganga', 'Mukono'],
        required: true 
    },
    departureTime: { 
        type: String, 
        enum: ['3:00am', '6:00am', '10:00am', '2:00pm', '6:00pm', '10:00pm'],
        required: true 
    },
    amountPaid: { type: Number, required: true },
    paymentMethod: { 
        type: String, 
        enum: ['cash', 'Airtel Pay', 'MTN Momo', 'Bank'],
        default: 'cash' 
    },
    status: { 
        type: String, 
        enum: ['Booked', 'Travelled', 'Cancelled', 'No Show'],
        default: 'Booked' 
    },
    bookingDate: { type: Date, default: Date.now } // Automatically gets the current time
});
const Booking = mongoose.model('Booking', BookingSchema);

const logActivity = async (action, module, user, details = {}) => {
    try {
        const log = new AuditLog({
            action,
            module,
            performed_by: user || 'System/Unknown',
            details
        });
        await log.save();
    } catch (err) {
        console.error("Audit Log Error:", err);
    }
};
// --- ROUTES ---
// CREATE BOOKING
app.post('/api/bookings', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();
        
        await logActivity('CREATE', 'Bookings', newBooking._id, req.body.recorded_by, { fullName: newBooking.fullName });
        
        res.status(201).json(newBooking);
    } catch (err) { res.status(400).send(err); }
});

// UPDATE BOOKING
app.put('/api/bookings/:id', async (req, res) => {
    try {
        const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
        
        await logActivity('UPDATE', 'Bookings', updated._id, req.body.recorded_by, { status: updated.status });
        
        res.json(updated);
    } catch (err) { res.status(400).send(err); }
});

// DELETE BOOKING
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        await logActivity('DELETE', 'Bookings', req.params.id, 'Admin', { message: "Permanent deletion" });
        res.json({ message: "Deleted successfully" });
    } catch (err) { res.status(500).json(err); }
});

// EDIT USER
app.put('/api/users/:id', async (req, res) => {
    try {
        const { full_name, email, station, role, recorded_by } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { full_name, email, station, role },
            { new: true }
        );
        await logActivity('UPDATE_USER_DETAILS', 'Users', updatedUser._id, recorded_by, { email });
        res.status(200).json(updatedUser);
    } catch (err) { res.status(500).json({ error: "Failed to update user" }); }
});

// TRANSFER USER
app.patch('/api/users/:id/transfer', async (req, res) => {
    try {
        const { station, recorded_by } = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.params.id, { station }, { new: true });
        await logActivity('TRANSFER_STATION', 'Users', updatedUser._id, recorded_by, { new_station: station });
        res.status(200).json(updatedUser);
    } catch (err) { res.status(500).json({ error: "Transfer failed" }); }
});
// CREATE PARCEL
app.post('/api/parcels', async (req, res) => {
    try {
        const trackingNum = "TRK-" + Math.random().toString(36).substr(2, 7).toUpperCase();
        const parcelData = { ...req.body, tracking_number: trackingNum };
        const newParcel = new Parcel(parcelData);
        await newParcel.save();

        await logActivity('CREATE', 'Parcels', newParcel._id, req.body.recorded_by, { tracking_number: trackingNum });

        res.status(201).json(newParcel);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// ADD ITEM TO WAYBILL
app.post('/api/parcels/:id/add-item', async (req, res) => {
    try {
        const parcel = await Parcel.findById(req.params.id);
        if (!parcel) return res.status(404).json({ error: "Waybill not found" });

        const newItem = req.body; 
        parcel.items.push(newItem);
        parcel.total_amount += newItem.subtotal;
        parcel.balance = parcel.total_amount - parcel.amount_paid;

        // Status Logic...
        await parcel.save();

        await logActivity('ADD_ITEM', 'Parcels', parcel._id, req.body.recorded_by, { item: newItem.description });

        res.json(parcel);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADD PAYMENT
app.post('/api/parcels/:id/add-payment', async (req, res) => {
    try {
        const parcel = await Parcel.findById(req.params.id);
        if (!parcel) return res.status(404).json({ error: "Waybill not found" });

        const { amount_paid, payment_method, recorded_by } = req.body;
        parcel.amount_paid += Number(amount_paid);
        parcel.balance = parcel.total_amount - parcel.amount_paid;
        
        await parcel.save();

        await logActivity('ADD_PAYMENT', 'Parcels', parcel._id, recorded_by, { amount: amount_paid, method: payment_method });

        res.json(parcel);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CREATE PARCEL
app.post('/api/parcels', async (req, res) => {
    try {
        const trackingNum = "TRK-" + Math.random().toString(36).substr(2, 7).toUpperCase();
        const parcelData = { ...req.body, tracking_number: trackingNum };
        const newParcel = new Parcel(parcelData);
        await newParcel.save();

        await logActivity('CREATE', 'Parcels', newParcel._id, req.body.recorded_by, { tracking_number: trackingNum });

        res.status(201).json(newParcel);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// ADD ITEM TO WAYBILL
app.post('/api/parcels/:id/add-item', async (req, res) => {
    try {
        const parcel = await Parcel.findById(req.params.id);
        if (!parcel) return res.status(404).json({ error: "Waybill not found" });

        const newItem = req.body; 
        parcel.items.push(newItem);
        parcel.total_amount += newItem.subtotal;
        parcel.balance = parcel.total_amount - parcel.amount_paid;

        // Status Logic...
        await parcel.save();

        await logActivity('ADD_ITEM', 'Parcels', parcel._id, req.body.recorded_by, { item: newItem.description });

        res.json(parcel);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADD PAYMENT
app.post('/api/parcels/:id/add-payment', async (req, res) => {
    try {
        const parcel = await Parcel.findById(req.params.id);
        if (!parcel) return res.status(404).json({ error: "Waybill not found" });

        const { amount_paid, payment_method, recorded_by } = req.body;
        parcel.amount_paid += Number(amount_paid);
        parcel.balance = parcel.total_amount - parcel.amount_paid;
        
        await parcel.save();

        await logActivity('ADD_PAYMENT', 'Parcels', parcel._id, recorded_by, { amount: amount_paid, method: payment_method });

        res.json(parcel);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// AUTO-SAVE CUSTOMER
app.post('/api/customers', async (req, res) => {
    try {
        const { full_name, phone, station, recorded_by } = req.body;
        const customer = await Customer.findOneAndUpdate(
            { phone: phone }, 
            { full_name, phone, station }, 
            { upsert: true, new: true }
        );

        await logActivity('UPSERT_CUSTOMER', 'Customers', customer._id, recorded_by, { phone });

        res.json(customer);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE CUSTOMER
app.delete('/api/customers/:id', async (req, res) => {
    try {
        await Customer.findByIdAndDelete(req.params.id);
        await logActivity('DELETE', 'Customers', req.params.id, 'Admin');
        res.json({ message: "Customer deleted successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET ALL AUDIT LOGS
app.get('/api/audit-logs', async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(200);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PUT: Update an existing parcel (The Edit Endpoint)
app.put('/api/parcels/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedParcel = await Parcel.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true }
        );

        if (!updatedParcel) return res.status(404).json({ error: "Parcel not found" });

        // LOG ACTION
        await logActivity('UPDATE', 'Parcels', updatedParcel._id, req.body.recorded_by, { 
            tracking_number: updatedParcel.tracking_number,
            new_status: updatedParcel.status 
        });

        res.json(updatedParcel);
    } catch (err) {
        console.error("Update Error:", err);
        res.status(400).json({ error: err.message });
    }
}); 

// DELETE: Remove a parcel
app.delete('/api/parcels/:id', async (req, res) => {
    try {
        const parcel = await Parcel.findById(req.params.id);
        await Parcel.findByIdAndDelete(req.params.id);
        
        // LOG ACTION
        await logActivity('DELETE', 'Parcels', req.params.id, 'Admin', { 
            tracking_number: parcel ? parcel.tracking_number : "Unknown" 
        });

        res.json({ message: "Parcel deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Registration (Admin Only)
app.post('/register', async (req, res) => {
    try {
        const { full_name, email, password, role, station, recorded_by } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "Email already registered" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            full_name, email, password: hashedPassword, role, station
        });

        await newUser.save();

        // LOG ACTION
        await logActivity('REGISTER_USER', 'Users', newUser._id, recorded_by, { 
            new_user_email: email, 
            role: role 
        });

        res.status(201).json({ message: "Staff member registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login Logic
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // LOG ACTION (Login tracking)
        await logActivity('LOGIN', 'Auth', user._id, user.full_name, { email: user.email });

        const { password: _, ...userData } = user._doc;
        res.json(userData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete User
app.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        await User.findByIdAndDelete(req.params.id);

        // LOG ACTION
        await logActivity('DELETE_USER', 'Users', req.params.id, 'Admin', { 
            deleted_user: user ? user.email : "Unknown" 
        });

        res.json({ message: "User deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DEACTIVATE
app.patch('/users/:id/deactivate', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false, status: 'Deactivated' }, { new: true });
    
    // LOG ACTION
    await logActivity('DEACTIVATE', 'Users', user._id, 'Admin', { email: user.email });
    
    res.json({ message: "Deactivated" });
});

// REACTIVATE
app.patch('/users/:id/reactivate', async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true, status: 'Active' }, { new: true });
    
    // LOG ACTION
    await logActivity('REACTIVATE', 'Users', user._id, 'Admin', { email: user.email });
    
    res.json({ message: "Reactivated" });
});
// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
