const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../src/models/User');

dotenv.config();

const createCEO = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        const username = 'ceo';
        const password = 'ceo_password_123'; // Change this manually in DB later

        const existing = await User.findOne({ role: 'super-admin' });
        if (existing) {
            console.log('CEO account already exists:', existing.username);
            process.exit();
        }

        const ceo = new User({
            name: 'Platform CEO',
            username: username,
            password: password,
            role: 'super-admin'
        });

        await ceo.save();
        console.log('CEO account created successfully!');
        console.log('Username:', username);
        console.log('Password:', password);
        process.exit();
    } catch (error) {
        console.error('Error creating CEO:', error);
        process.exit(1);
    }
};

createCEO();
