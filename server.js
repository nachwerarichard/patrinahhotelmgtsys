require('dotenv').config();
const nodemailer = require('nodemailer');

// MongoDB Connection
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const app = express();
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
mongoose.connect('mongodb+srv://nachwerarichy:parcelsys@hotelbarsys.mjsul7b.mongodb.net/?appName=hotelbarsys');

// User Schema
const userSchema = new mongoose.Schema({
    full_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'clerk', 'supervisor'], default: 'clerk' },
    phone: String,
    password: { type: String, required: true },
    station: { type: String, enum: ['Mbale', 'Kampala'], required: true },
    created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- API ROUTES ---

// 1. Create User (Register)
app.post('/api/users', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({ ...req.body, password: hashedPassword });
        await newUser.save();
        res.status(201).send({ message: "User created" });
    } catch (err) { res.status(400).send(err.message); }
});

// 2. Login
app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        res.send({ id: user._id, name: user.full_name, role: user.role, station: user.station });
    } else {
        res.status(401).send("Invalid credentials");
    }
});

// 3. Get All Users (Read)
app.get('/api/users', async (req, res) => {
    const users = await User.find({}, '-password');
    res.send(users);
});

// 4. Delete User
app.delete('/api/users/:id', async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    res.send({ message: "Deleted" });
});

app.listen(5000, () => console.log('Server running on port 5000'));
