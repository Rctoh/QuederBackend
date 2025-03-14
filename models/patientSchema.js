const mongoose = require('mongoose');
const { Schema } = mongoose;

const patientDetails = new Schema({
    userId: { type: String },
    numberOfLoginedDevice: { type: Number },
    lastDeviceId: { type: Number },
    ifStatedAllergies: { type: Boolean },
    sharedEncryptedData: { type: String },
    encryptedDataArray: { type: Array },
});

const db = mongoose.connection.useDb('Queder');
const patientSchema = db.model('patientDetails', patientDetails);

module.exports = patientSchema;
