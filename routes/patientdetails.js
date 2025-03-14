const express = require('express')
const router = express.Router()
const patientSchema = require('../models/patientSchema');
const securityFunctions = require("../functions/securityFunctions");

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}


router.post('/updateOtherInformation', async (req, res) => {

    //const encryptedPatientDetailsStringUpdated = req.body.encryptedPatientDetailsStringUpdated
    const sharedEncryptedData = req.body.sharedEncryptedData
    const deviceId = parseInt(req.body.deviceId)


    const decodedUserId = await securityFunctions.getUserIdFromUserJWT(req.headers['authorization'])

    try {

        const result = await patientSchema.findOneAndUpdate(
            { "userId": decodedUserId },
            { $set: { ifStatedAllergies: true, sharedEncryptedData: sharedEncryptedData } },
            { new: true }
        );

        // if (result) {
        //     const encryptedDataArray = result.encryptedDataArray;

        //     const indexToUpdate = encryptedDataArray.findIndex(encryptedDataArray => encryptedDataArray.deviceId === deviceId);

        //     if (indexToUpdate !== -1) {

        //         encryptedDataArray[indexToUpdate].deviceUniqueEncryptedData = encryptedPatientDetailsStringUpdated;

        //         await patientSchema.updateOne(
        //             { "userId": decodedUserId },
        //             { $set: { encryptedDataArray: encryptedDataArray } }
        //         );

        //         console.log("Update successful");
        //         res.send({ "status": "Success", "message": "Update Successful" })
        //     } else {
        //         console.log("Element not found in encryptedDataArray");
        //     }
        // } else {
        //     console.log("User not found");
        // }
        res.send({ "status": "Success", "message": "Update Successful" })
    } catch {
        res.send({ "message": "Error" })
    }
})

module.exports = router