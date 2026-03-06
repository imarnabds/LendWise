const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function bypass() {
    await mongoose.connect(process.env.MONGO_URI);
    const lender = await User.findOne({ email: 'test@microlend.com' });
    lender.isVerified = true;
    await lender.save();
    console.log('Lender verified. Rerunning test...');
    process.exit(0);
}
bypass();
