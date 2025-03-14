const mongoose = require('mongoose');
const { Schema } = mongoose;

const clinicSchema = new Schema({
    clinicId: { type: String },
    imageUrl: { type: String },
    clinicName: { type: String },
    address: { type: String },
    town: { type: String },
    openingHours: { type: String },
    phoneNumber: { type: String },
    doctor: { type: String },
    clinicType: { type: String },
    clinicProgramme: { type: String },
    paymentMethod: { type: String },
    publicTransport: { type: String },
    carpark: { type: String },
    price: { type: String },
    rating: { type: String },
    currentQueue: { type: String },
    queueDetails: { type: String },
    lastQueueNumber: { type: String }
})

const db = mongoose.connection.useDb('Queder');
const clinicdetails = db.model('clinicdetails', clinicSchema);
module.exports = clinicdetails;