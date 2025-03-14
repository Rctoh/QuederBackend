const mongoose = require('mongoose');
const { Schema } = mongoose;

const queueTokenSchema = new Schema({
    uniqueAppointmentToken: { type: String, required: true },
    serverEncryptedForDoctor: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: '12h' },
});

const db = mongoose.connection.useDb('QuederTokens');

const QueueToken = db.model('queuetokens', queueTokenSchema);

module.exports = QueueToken;
