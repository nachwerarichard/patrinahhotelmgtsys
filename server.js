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
//const MONGO_URI = "mongodb+srv://nachwerarichy:parcelsys@hotelbarsys.mjsul7b.mongodb.net/?appName=hotelbarsys";
 const MONGO_URI=  "mongodb+srv://nachwerarichard:TQ4VX7zQZIxjCVzU@novuscloud.z4w1k8c.mongodb.net/couriersystem?appName=novuscloud";
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("❌ DB Connection Error:", err));

const userSchema = new mongoose.Schema({
    full_name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true, // Standardizes email lookups
        trim: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        enum: ['admin', 'manager', 'standard', 'finance'], 
        default: 'standard' // Defaults to normal staff member
    },
    station: { 
        type: String, 
        enum: [
            'Kampala - Taxi Park', 
            'Mbale - Bishop Wasikye Rd',
            'Kampala - Aponye',
            'Mbale - DTB' // Cleaned up double hyphen/spaces here
        ],
        required: true
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    status: { 
        type: String, 
        enum: ['Active', 'Deactivated'], 
        default: 'Active' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
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

// CREATE BOOKING
app.post('/api/bookings', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();

        // ✅ AUDIT LOG
        await logActivity(
            'CREATE_BOOKING',
            'Bookings',
            req.user?.full_name || req.body.fullName || 'Unknown User',
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

// GET SINGLE BOOKING BY ID
app.get('/api/bookings/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: "Not found" });
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE BOOKING
app.put('/api/bookings/:id', async (req, res) => {
    try {
        const oldBooking = await Booking.findById(req.params.id);
        if (!oldBooking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        const updated = await Booking.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        // Map exact structural changes
        const changes = {};
        for (const key in req.body) {
            if (req.body[key] !== oldBooking[key]) {
                changes[key] = { old: oldBooking[key], new: updated[key] };
            }
        }

        // ✅ AUDIT LOG
        await logActivity(
            'UPDATE_BOOKING',
            'Bookings',
            req.user?.full_name || req.body.fullName || 'Unknown User',
            {
                bookingId: updated._id,
                changes: changes
            }
        );

        res.json(updated);
    } catch (err) {
        res.status(400).send(err);
    }
});

// DELETE BOOKING
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        await Booking.findByIdAndDelete(req.params.id);

        // ✅ AUDIT LOG
        await logActivity(
            'DELETE_BOOKING',
            'Bookings',
            req.user?.full_name || booking.fullName || 'Unknown User',
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

// POST: Create a new parcel
// POST: Create a new parcel
app.post('/api/parcels', async (req, res) => {
    try {
        const trackingNum = "TRK-" + Math.random().toString(36).substr(2, 7).toUpperCase();

        const parcelData = {
            ...req.body,
            tracking_number: trackingNum
        };

        const newParcel = new Parcel(parcelData);
        await newParcel.save();

        // ✅ AUDIT LOG: Tracks creation with critical data snapshots
        await logActivity(
            'CREATE_WAYBILL',
            'Parcels',
            req.body.recorded_by || 'System',
            {
                parcelId: newParcel._id,
                trackingNumber: trackingNum,
                sender: newParcel.sender_name || null,
                receiver: newParcel.receiver_name || null,
                origin: newParcel.origin || null,
                destination: newParcel.destination || null,
                totalAmount: newParcel.total_amount || null
            }
        );

        res.status(201).json(newParcel);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


// PUT: Update an existing parcel (With State Change Tracking)
app.put('/api/parcels/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // 1. Validate MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid parcel ID format" });
        }

        // 2. Check if parcel exists (Keep reference for delta comparison)
        const currentParcel = await Parcel.findById(id);
        if (!currentParcel) {
            return res.status(404).json({ error: "Parcel not found" });
        }

        /* ======================================================
           3. Financial Recalculation Logic
           ====================================================== */
        if (updateData["financials.amount_paid"] !== undefined) {
            const totalAmount = currentParcel.financials?.total_amount || 0;
            const paidAmount = Number(updateData["financials.amount_paid"]);
            const balance = totalAmount - paidAmount;

            updateData["financials.balance"] = balance;

            if (balance <= 0) {
                updateData["financials.payment_status"] = "Paid";
            } else if (paidAmount > 0) {
                updateData["financials.payment_status"] = "Partial";
            } else {
                updateData["financials.payment_status"] = "Unpaid";
            }
        }

        /* ======================================================
           4. Build Safe Update Object & History
           ====================================================== */
        const updateObject = {
            $set: updateData
        };

        if (updateData.status) {
            updateObject.$push = {
                status_history: {
                    status: updateData.status,
                    station: updateData.last_station || "Unknown",
                    updated_by: updateData.recorded_by || "System",
                    timestamp: new Date()
                }
            };
        }

        /* ======================================================
           5. Capture "Before" values for deep audit logging
           ====================================================== */
        const changes = {};
        for (const key in updateData) {
            // Evaluates dots notation safely if needed, basic mapping here
            changes[key] = {
                oldValue: currentParcel[key] !== undefined ? currentParcel[key] : 'Not Set',
                newValue: updateData[key]
            };
        }

        /* ======================================================
           6. Update Parcel
           ====================================================== */
        const updatedParcel = await Parcel.findByIdAndUpdate(
            id,
            updateObject,
            {
                new: true,
                runValidators: true
            }
        );

        /* ======================================================
           7. Comprehensive Audit Logging (Old vs New states)
           ====================================================== */
        await logActivity(
            "UPDATE_PARCEL",
            "Parcels",
            updateData.recorded_by || "System",
            {
                parcelId: updatedParcel._id,
                trackingNumber: updatedParcel.tracking_number,
                changes: changes // Contains structural state changes
            }
        );

        res.json(updatedParcel);

    } catch (err) {
        console.error("Parcel Update Error:", err);
        res.status(500).json({
            error: "Failed to update parcel",
            details: err.message
        });
    }
});


// DELETE: Remove a parcel
app.delete('/api/parcels/:id', async (req, res) => {
    try {
        // 1. First find the parcel (so we know what we are deleting)
        const parcel = await Parcel.findById(req.params.id);

        if (!parcel) {
            return res.status(404).json({ error: "Parcel not found" });
        }

        // 2. Delete it
        await Parcel.findByIdAndDelete(req.params.id);

        // 3. Audit log AFTER successful delete
        await logActivity(
            'DELETE_WAYBILL',
            'Parcels',
            req.body.recorded_by || req.user?.full_name || 'System', // Fallback cascade
            {
                parcelId: parcel._id,
                trackingNumber: parcel.tracking_number,
                sender: parcel.sender_name || null,
                receiver: parcel.receiver_name || null,
                origin: parcel.origin || null,
                destination: parcel.destination || null,
                totalAmount: parcel.total_amount || null,
                statusAtDeletion: parcel.status
            }
        );

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
        if (existingUser) {
            return res.status(400).json({ message: "Email already registered" });
        }

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

        // ✅ AUDIT LOG: Safe navigation falls back if auth middleware is omitted
        await logActivity(
            'CREATE_USER',
            'Users',
            req.user?.full_name || 'System', 
            {
                createdUserId: newUser._id,
                fullName: newUser.full_name,
                email: newUser.email,
                role: newUser.role,
                station: newUser.station
            }
        );

        res.status(201).json({ message: "Staff member registered successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- User Login ---
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        console.log("--- Login Attempt ---");
        console.log("Email received:", email);
        console.log("Password provided:", password ? "[EXISTS]" : "[EMPTY]");

        // 1. Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.warn(`Login Fail: User with email ${email} not found.`);
            
            // 🛑 OPTIONAL AUDIT: Tracks malicious or failed login tracking attempts
            await logActivity(
                'FAILED_LOGIN_ATTEMPT',
                'Authentication',
                'System/Anonymous',
                { attemptedEmail: email, reason: 'User not found' }
            );

            return res.status(442 || 404).json({ message: "User not found" }); 
        }

        // 2. Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.warn(`Login Fail: Password mismatch for ${email}`);

            // 🛑 OPTIONAL AUDIT: Tracks potential brute force attacks
            await logActivity(
                'FAILED_LOGIN_ATTEMPT',
                'Authentication',
                user.full_name,
                { attemptedEmail: email, reason: 'Invalid password credentials' }
            );

            return res.status(400).json({ message: "Invalid credentials" });
        }

        // 3. LOG SUCCESSFUL LOGIN
        console.log(`Login Success: ${user.full_name} (${user.email})`);
        
        await logActivity(
            'LOGIN',
            'Authentication',
            user.full_name,
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
        console.error("CRITICAL LOGIN ERROR:", err);
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
        // 🔐 Only Admin
        if (!req.user || req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await User.findByIdAndDelete(req.params.id);

        // ✅ AUDIT LOG
        await logActivity(
            'DELETE_USER',
            'Users',
            req.user.full_name,
            {
                deletedUserId: user._id,
                fullName: user.full_name,
                email: user.email,
                role: user.role,
                station: user.station,
                previousStatus: user.status || 'Unknown'
            }
        );

        res.json({ message: "User deleted" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Deactivate User ---
app.patch('/users/:id/deactivate', async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await User.findByIdAndUpdate(req.params.id, {
            isActive: false,
            status: 'Deactivated'
        });

        // ✅ AUDIT LOG
        await logActivity(
            'DEACTIVATE_USER',
            'Users',
            req.user.full_name,
            {
                affectedUserId: user._id,
                fullName: user.full_name,
                role: user.role,
                station: user.station,
                previousStatus: user.status || 'Active'
            }
        );

        res.json({ message: "Deactivated" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- Reactivate User ---
app.patch('/users/:id/reactivate', async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'Admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        await User.findByIdAndUpdate(req.params.id, {
            isActive: true,
            status: 'Active'
        });

        // ✅ AUDIT LOG
        await logActivity(
            'REACTIVATE_USER',
            'Users',
            req.user.full_name,
            {
                affectedUserId: user._id,
                fullName: user.full_name,
                role: user.role,
                station: user.station,
                previousStatus: user.status || 'Deactivated'
            }
        );

        res.json({ message: "Reactivated" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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



const createFirstAdmin = async () => {
    try {
        // 1. Check if this specific admin already exists by email
        // We check by email because "role: admin" might find an old test user
        const userExists = await User.findOne({ email: 'richard@gmail.com' });

        if (userExists) {
            console.log('✅ Admin "richard@gmail.com" already exists. Skipping initialization.');
            return;
        }

        console.log('Creating admin user...');

        // 2. Define the plain-text password and hash it
        // This is the password you will type into the login form
        const plainPassword = 'admin'; 
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);

        // 3. Create the new User instance
        const firstAdmin = new User({
            full_name: 'Richard Admin',
            email: 'richard@gmail.com',
            password: hashedPassword, // Storing the encrypted version
            role: 'admin',
            station: 'Kampala - Taxi Park',
            isActive: true,
            status: 'Active'
        });

        // 4. Save to MongoDB
        await firstAdmin.save();
        
        console.log('-----------------------------------------------');
        console.log('🚀 First admin user created successfully!');
        console.log('Email: richard@gmail.com');
        console.log('Password: ' + plainPassword);
        console.log('-----------------------------------------------');

    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
    }
};
createFirstAdmin();
// ==========================================
// 1. MONGOOSE SCHEMA & MODEL CONFIGURATION
// ==========================================

const expenseSchema = new mongoose.Schema({
    expenseId: { 
        type: String, 
        required: true, 
        unique: true,
        default: () => "EXP-" + Math.floor(100000 + Math.random() * 900000)
    },
    date: { 
        type: Date, 
        required: true,
        default: Date.now
    },
    description: { 
        type: String, 
        required: true, 
        trim: true 
    },
    category: { 
        type: String, 
        required: true,
        enum: ['Utilities', 'Office Supplies', 'Travel & Logistics', 'Software/SaaS', 'Marketing', 'Other']
    },
    merchant: { 
        type: String, 
        required: true, 
        trim: true 
    },
    amount: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    status: { 
        type: String, 
        required: true,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    loggedBy: { 
        type: String, 
        required: true 
    }
}, { 
    timestamps: true // Automatically tracks createdAt and updatedAt
});

const Expense = mongoose.model('Expense', expenseSchema);


// ==========================================
// 2. EXPRESS API ROUTES
// ==========================================

/**
 * @route   POST /api/expenses
 * @desc    Log a brand new expense item
 */
app.post('/api/expenses', async (req, res) => {
    try {
        const { date, description, category, merchant, amount, status, loggedBy } = req.body;
        
        const newExpense = new Expense({
            date,
            description,
            category,
            merchant,
            amount,
            status,
            loggedBy
        });

        const savedExpense = await newExpense.save();

        // ✅ AUDIT LOG: Track expense creation
        await logActivity(
            'CREATE_EXPENSE',
            'Expenses',
            req.user?.full_name || loggedBy || 'System',
            {
                expenseId: savedExpense._id,
                amount: savedExpense.amount,
                category: savedExpense.category,
                merchant: savedExpense.merchant,
                description: savedExpense.description,
                status: savedExpense.status
            }
        );

        res.status(201).json({ success: true, data: savedExpense });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * @route   GET /api/expenses
 * @desc    Fetch all logged expenses (supports basic search query matching)
 */
app.get('/api/expenses', async (req, res) => {
    try {
        const { search } = req.query;
        let queryCondition = {};

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            queryCondition = {
                $or: [
                    { description: searchRegex },
                    { merchant: searchRegex },
                    { category: searchRegex }
                ]
            };
        }

        const expenses = await Expense.find(queryCondition).sort({ date: -1 });
        res.status(200).json({ success: true, count: expenses.length, data: expenses });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update status or values of an existing expense document by MongoDB Object ID
 */
app.put('/api/expenses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // 1. Fetch current expense state before making changes
        const currentExpense = await Expense.findById(id);
        if (!currentExpense) {
            return res.status(404).json({ success: false, error: "Expense entry not found" });
        }

        // 2. Map differences / historical data comparison
        const changes = {};
        for (const key in updateData) {
            if (updateData[key] !== currentExpense[key]) {
                changes[key] = {
                    oldValue: currentExpense[key] !== undefined ? currentExpense[key] : 'Not Set',
                    newValue: updateData[key]
                };
            }
        }

        // 3. Update the document
        const updatedExpense = await Expense.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true, runValidators: true }
        );

        // 4. ✅ AUDIT LOG: Log dynamic updates with state mutations
        await logActivity(
            'UPDATE_EXPENSE',
            'Expenses',
            req.user?.full_name || updateData.loggedBy || 'System',
            {
                expenseId: updatedExpense._id,
                merchant: updatedExpense.merchant,
                changes: changes
            }
        );

        res.status(200).json({ success: true, data: updatedExpense });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Remove an expense transaction log completely
 */
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        // 1. Find the item to preserve structural information for logs
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ success: false, error: "Expense entry not found" });
        }

        // 2. Execute deletion
        await Expense.findByIdAndDelete(req.params.id);

        // 3. ✅ AUDIT LOG: Record precisely what was thrown away
        await logActivity(
            'DELETE_EXPENSE',
            'Expenses',
            req.user?.full_name || 'System',
            {
                expenseId: expense._id,
                amount: expense.amount,
                category: expense.category,
                merchant: expense.merchant,
                description: expense.description,
                statusAtDeletion: expense.status
            }
        );

        res.status(200).json({ success: true, message: "Expense record removed successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
