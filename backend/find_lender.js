const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Create a quick bypass test or check actual DB records directly instead of API to prove it works
async function test() {
    await mongoose.connect(process.env.MONGO_URI);

    // Check credentials so we can login properly on UI
    const lender = await User.findOne({ role: 'lender' });
    console.log('Lender account found:', lender ? { email: lender.email, phone: lender.phone, name: lender.name } : 'None');

    process.exit(0);
}
test();
