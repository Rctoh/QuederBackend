const mongoose = require('mongoose');
const { Schema } = mongoose;

const encryptedAccountDetails = new Schema({
    userId: { type: String },
    password: { type: String },
    hashedEmail: { type: String },
    hashedNRIC: { type: String },
});

const db = mongoose.connection.useDb('Queder');
const accountSchema = db.model('logindetails', encryptedAccountDetails);

module.exports = accountSchema;
