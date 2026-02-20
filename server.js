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
    }
}, { timestamps: true });   // 👈 THIS enables createdAt & updatedAt

const Booking = mongoose.model('Booking', BookingSchema);


const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true }, // e.g., 'CREATE_PARCEL', 'DELETE_USER'
    module: { type: String, required: true }, // e.g., 'Parcels', 'Users', 'Bookings'
    performed_by: { type: String, required: true }, // User email or Name
    details: { type: mongoose.Schema.Types.Mixed }, // Flexible object for IDs or changes
    timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

const logActivity = async (action, module, performedBy, details = {}) => {
    try {
        const log = new AuditLog({
            action,
            module,
            performed_by: performedBy || 'System/Unknown',
            details
        });

        await log.save();
        console.log("Audit log saved:", action);
    } catch (err) {
        console.error("Audit Log Error:", err);
    }
};

// --- ROUTES ---
app.get('/api/bookings/today', async (req, res) => {
    const start = new Date();
    start.setHours(0,0,0,0);

    const end = new Date();
    end.setHours(23,59,59,999);

    const bookings = await Booking.find({
        createdAt: {
            $gte: start,
            $lte: end
        }
    });

    res.json(bookings);
});

// CREATE
app.post('/api/bookings', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();

        // 🔥 AUDIT LOG
        await logActivity(
            'CREATE_BOOKING',
            'Bookings',
            req.body.fullName || 'Unknown User',
            {
                bookingId: newBooking._id,
                origin: newBooking.origin,
                destination: newBooking.destination,
                amountPaid: newBooking.amountPaid
            }
        );

        res.status(201).json(newBooking);

    } catch (err) {
        res.status(400).send(err);
    }
});


// READ (All)
app.get('/api/bookings', async (req, res) => {
    const bookings = await Booking.find();
    res.json(bookings);
});

// UPDATE
app.put('/api/bookings/:id', async (req, res) => {
    try {
        const updated = await Booking.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // 🔥 AUDIT LOG
        await logActivity(
            'UPDATE_BOOKING',
            'Bookings',
            req.body.fullName || 'Unknown User',
            {
                bookingId: updated._id,
                updatedFields: req.body
            }
        );

        res.json(updated);

    } catch (err) {
        res.status(400).send(err);
    }
});


// DELETE
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        await Booking.findByIdAndDelete(req.params.id);

        // 🔥 AUDIT LOG
        await logActivity(
            'DELETE_BOOKING',
            'Bookings',
            booking.fullName || 'Unknown User',
            {
                bookingId: booking._id,
                origin: booking.origin,
                destination: booking.destination,
                amountPaid: booking.amountPaid
            }
        );

        res.json({ message: "Deleted successfully" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// backend/routes/bookings.js (or server.js)
app.get('/api/bookings/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: "Not found" });
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// EDIT USER (General details)
app.put('/api/users/:id', async (req, res) => {
    try {
        const { full_name, email, station, role } = req.body;

        const oldUser = await User.findById(req.params.id);
        if (!oldUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { full_name, email, station, role },
            { new: true }
        );

        // 🔥 AUDIT LOG
        await logActivity(
            'UPDATE_USER',
            'Users',
            full_name || 'System',
            {
                userId: updatedUser._id,
                changes: {
                    full_name: { old: oldUser.full_name, new: full_name },
                    email: { old: oldUser.email, new: email },
                    station: { old: oldUser.station, new: station },
                    role: { old: oldUser.role, new: role }
                }
            }
        );

        res.status(200).json(updatedUser);

    } catch (err) {
        res.status(500).json({ error: "Failed to update user" });
    }
});


// TRANSFER USER (Specific to Station)
app.patch('/api/users/:id/transfer', async (req, res) => {
    try {
        const { station } = req.body;

        const oldUser = await User.findById(req.params.id);
        if (!oldUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { station },
            { new: true }
        );

        // 🔥 AUDIT LOG
        await logActivity(
            'TRANSFER_USER',
            'Users',
            updatedUser.full_name || 'System',
            {
                userId: updatedUser._id,
                from: oldUser.station,
                to: station
            }
        );

        res.status(200).json(updatedUser);

    } catch (err) {
        res.status(500).json({ error: "Transfer failed" });
    }
});


// PUT: Update a parcel by ID
app.put('/api/parcels/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        const oldParcel = await Parcel.findById(id);
        if (!oldParcel) {
            return res.status(404).json({ error: "Parcel not found" });
        }

const updatedParcel = await Parcel.findByIdAndUpdate(
    id,
    updateObject,
    { new: true, runValidators: true }
);

if (!updatedParcel) {
    return res.status(404).json({ error: "Parcel not found" });
}

// 🔥 AUDIT LOG
await logActivity(
    'UPDATE_WAYBILL',
    'Parcels',
    updateData.recorded_by || 'System',
    {
        parcelId: updatedParcel._id,
        updatedFields: updateData
    }
);

res.json(updatedParcel);


    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 1. ADD ITEM TO EXISTING WAYBILL
app.post('/api/parcels/:id/add-item', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid ID format." });
    }

    try {
        const parcel = await Parcel.findById(req.params.id);
        if (!parcel) return res.status(404).json({ error: "Waybill not found" });

        const newItem = req.body;

        parcel.items.push(newItem);
        parcel.total_amount += newItem.subtotal;
        parcel.balance = parcel.total_amount - parcel.amount_paid;

        if (parcel.amount_paid <= 0) parcel.payment_status = 'Unpaid';
        else if (parcel.amount_paid < parcel.total_amount) parcel.payment_status = 'Partial';
        else parcel.payment_status = 'Paid';

        await parcel.save();

        // 🔥 AUDIT LOG
        await logActivity(
            'ADD_ITEM_TO_WAYBILL',
            'Parcels',
            req.body.recorded_by || 'System',
            {
                parcelId: parcel._id,
                itemAdded: {
                    description: newItem.description,
                    quantity: newItem.quantity,
                    rate: newItem.rate,
                    subtotal: newItem.subtotal
                },
                newTotal: parcel.total_amount,
                newBalance: parcel.balance
            }
        );

        res.json(parcel);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. ADD PAYMENT TO EXISTING WAYBILL
app.post('/api/parcels/:id/add-payment', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid ID format." });
    }

    try {
        const parcel = await Parcel.findById(req.params.id);
        if (!parcel) return res.status(404).json({ error: "Waybill not found" });

        const { amount_paid, payment_method } = req.body;

        const oldPaid = parcel.amount_paid;

        parcel.amount_paid += Number(amount_paid);
        parcel.payment_method = payment_method;
        parcel.balance = parcel.total_amount - parcel.amount_paid;

        if (parcel.amount_paid >= parcel.total_amount) {
            parcel.payment_status = 'Paid';
        } else if (parcel.amount_paid > 0) {
            parcel.payment_status = 'Partial';
        }

        await parcel.save();

        // 🔥 AUDIT LOG
        await logActivity(
            'ADD_PAYMENT',
            'Parcels',
            req.body.recorded_by || 'System',
            {
                parcelId: parcel._id,
                previousAmountPaid: oldPaid,
                paymentAdded: amount_paid,
                newAmountPaid: parcel.amount_paid,
                paymentMethod: payment_method,
                newBalance: parcel.balance,
                paymentStatus: parcel.payment_status
            }
        );

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
// PUT: Update an existing parcel
app.put('/api/parcels/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // 1. Recalculate Financials ONLY if amount_paid is actually provided
        if (updateData["financials.amount_paid"] !== undefined) {
            const currentParcel = await Parcel.findById(id);
            if (!currentParcel) return res.status(404).json({ error: "Parcel not found" });

            const total = currentParcel.financials.total_amount;
            const paid = updateData["financials.amount_paid"];
            updateData["financials.balance"] = total - paid;
            
            if (updateData["financials.balance"] <= 0) {
                updateData["financials.payment_status"] = 'Paid';
            } else if (paid > 0) {
                updateData["financials.payment_status"] = 'Partial';
            }
        }

        // 2. Build the update object carefully
        const updateObject = { $set: updateData };

        // 3. ONLY push to history if we have status info to avoid 500 errors
        if (updateData.status) {
            updateObject.$push = { 
                status_history: {
                    status: updateData.status,
                    station: updateData.last_station || "Unknown",
                    updated_by: updateData.recorded_by || "Staff",
                    timestamp: new Date()
                }
            };
        }

        const updatedParcel = await Parcel.findByIdAndUpdate(
            id,
            updateObject,
            { new: true, runValidators: true }
        );

        res.json(updatedParcel);
    } catch (err) {
        console.error("Update Error:", err); // Log the real error to your Render console
        res.status(500).json({ error: err.message });
    }
});
// Check your server.js for these exact paths
// Route to handle auto-saving/updating customers
app.post('/api/customers', async (req, res) => {
    try {
        const { full_name, phone, station } = req.body;

        // findOneAndUpdate with 'upsert' means:
        // If phone exists, update the name/station. 
        // If phone doesn't exist, create a new record.
        const customer = await Customer.findOneAndUpdate(
            { phone: phone }, 
            { full_name, phone, station }, 
            { upsert: true, new: true, runValidators: true }
        );

        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to get all customers for your search datalists
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
// --- Login Logic with Audit Logging ---
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find user
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        // 2. Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // OPTIONAL: You can even log failed login attempts here for security
            // await logActivity('LOGIN_FAILED', 'Auth', null, email, { reason: 'Invalid password' });
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // 3. LOG SUCCESSFUL LOGIN
        // We use user.full_name as the performer and record their email in details
        await logActivity(
    'LOGIN',
    'Authentication',
    user.full_name,   // 👈 String
    {
        email: user.email,
        role: user.role,
        station: user.station
    }
);


        // 4. Return user data (excluding password)
        const { password: _, ...userData } = user._doc;
        res.json(userData);

    } catch (err) {
        console.error("Login Error:", err);
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
app.get('/api/stats/financial', async (req, res) => {
    try {
        const stats = await Parcel.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount_paid" },
                    totalBalance: { $sum: "$balance" },
                    countPaid: { $sum: { $cond: [{ $eq: ["$payment_status", "Paid"] }, 1, 0] } },
                    countPartial: { $sum: { $cond: [{ $eq: ["$payment_status", "Partial"] }, 1, 0] } },
                    countUnpaid: { $sum: { $cond: [{ $eq: ["$payment_status", "Unpaid"] }, 1, 0] } },
                    totalCount: { $sum: 1 }
                }
            }
        ]);

        const result = stats[0] || { totalRevenue: 0, totalBalance: 0, countPaid: 0, countPartial: 0, countUnpaid: 0, totalCount: 0 };
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/audit-logs', async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
