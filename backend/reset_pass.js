const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function resetPass() {
    await mongoose.connect(process.env.MONGO_URI);
    const lender = await User.findOne({ email: 'test@microlend.com' });

    // reset to a known password
    const salt = bcrypt.genSaltSync(10);
    lender.password = bcrypt.hashSync('password', salt);
    await lender.save();
    console.log('Password reset to "password".');
    process.exit(0);
}
resetPass();
