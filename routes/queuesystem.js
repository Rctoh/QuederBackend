const express = require('express')
const router = express.Router()
const clinicDetails = require('../models/clinicDetailsSchema');
const queueTokenSchema = require('../models/queueTokenSchema');
const Pusher = require("pusher");
const crypto = require('crypto');
const securityFunctions = require("../functions/securityFunctions");
const utilFunctions = require("../functions/utilFunctions");


if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const pusher = utilFunctions.setUpPusher();

/////GET QUEUE NUMBER

router.post('/getqueuenumber', async (req, res) => {

    try {
        const uniqueAppointmentToken = securityFunctions.generateAppointmentToken();
        const asymmetricEncryptedForDoctor = req.body.asymmetricEncryptedForDoctor;
        const decodedUserId = await securityFunctions.getUserIdFromUserJWT(req.headers['authorization']);
        const clinicId = req.body.clinicId;

        const toBeServerEncrypted = JSON.stringify({
            "userId" : decodedUserId,
            asymmetricEncryptedForDoctor: asymmetricEncryptedForDoctor
        })
        
        const [serverEncryptedForDoctor, individualClinicDetails] = await Promise.all([
            securityFunctions.serverQuickEncrypt(toBeServerEncrypted),
            clinicDetails.find({ "clinicId": clinicId })
        ]);
        
        const newQueueNumber = parseInt((individualClinicDetails[0]["lastQueueNumber"])) + 1
        const currentQueueDetails = (individualClinicDetails[0]["queueDetails"])

        //Remove the [] to convert from JSON Array to normal string 
        const unJSONarray = currentQueueDetails.replace("[", "").replace("]", "")

        let newQueueDetails = ""
        
        let toBeAddedJSONString = JSON.stringify(
            { "userId": decodedUserId, "fullName": req.body.fullName, "queueNumber": newQueueNumber,
                "symptom" : req.body.symptom, "comment": req.body.comment, "travelledRecently": req.body.travelledRecently
             })

        //Add in the new JSON object together with the [] to convert it back to JSON Array
        if (unJSONarray == "") {
            newQueueDetails = "[" + toBeAddedJSONString + "]"
        } else {
            newQueueDetails = "[" + unJSONarray + ", " + toBeAddedJSONString + "]"
        }

        //Instantiate the variables to update mongoDB clinicDetails collection
        const filter = { clinicId: clinicId }
        const update = {
            queueDetails: newQueueDetails,
            lastQueueNumber: newQueueNumber
        }

        const patientAppointmentToken = new queueTokenSchema({
            uniqueAppointmentToken: uniqueAppointmentToken,
            serverEncryptedForDoctor: serverEncryptedForDoctor
        })

        await Promise.all([
            clinicDetails.findOneAndUpdate(filter, update), //Actually update mongoDB
            patientAppointmentToken.save()
        ])

        //trigger to doctor app
        pusher.trigger("clinicId" + clinicId, "queueDetailsChanged", {
            clinicId: clinicId,
            updatedQueueDetails: newQueueDetails
        });

        const sanitizedQueueDetails = utilFunctions.sanitizeQueueDetails(JSON.parse(newQueueDetails))

        //trigger to patient android app
        pusher.trigger("Queder", "queueDetailsChanged", {
            clinicId: clinicId,
            sanitizedQueueDetails: sanitizedQueueDetails
        });

        res.send(JSON.stringify({
            "queueNumber": newQueueNumber,
            "newQueueDetails": sanitizedQueueDetails,
            "transactionCode": req.body.transactionCode,
            "uniqueAppointmentToken": uniqueAppointmentToken
        }))

    } catch (error) {
        res.status(400).send({ message: error.message });
        console.log(error)
    }

})

///If someone cancel their queue number

router.post('/cancelqueuenumber', async (req, res) => {


    const decodedUserId = await securityFunctions.getUserIdFromUserJWT(req.headers['authorization']);

    const clinicId = req.body.clinicId;

    try {

        const individualClinicDetails = await clinicDetails.find({ "clinicId": clinicId });

        let currentQueueDetails = JSON.parse(individualClinicDetails[0]["queueDetails"]);

        const ifExists = currentQueueDetails.filter(el => el.userId == decodedUserId).length > 0;

        if (!ifExists) {
            res.send({ "status" : "fail", "message": "Error, name not found" });
        } else {
            const newQueueDetails = currentQueueDetails.filter(function (el) {
                return el.userId !== decodedUserId;
            });

            // Instantiate the variables to update MongoDB
            const filter = { clinicId: clinicId };
            const update = {
                queueDetails: JSON.stringify(newQueueDetails),
            };

            // Actually remove it from MongoDB
            let newResult = await clinicDetails.findOneAndUpdate(filter, update, {
                new: true
            });

            //trigger to doctor app
            pusher.trigger("clinicId" + clinicId, "queueDetailsChanged", {
                clinicId: clinicId,
                updatedQueueDetails: newQueueDetails
            });

            const sanitizedQueueDetails = utilFunctions.sanitizeQueueDetails(newQueueDetails)

            //trigger to patient android app
            pusher.trigger("Queder", "queueDetailsChanged", {
                clinicId: clinicId,
                sanitizedQueueDetails: sanitizedQueueDetails
            });

            res.send({ "status": "Success", "result": newResult });
        }

    } catch (error) {
        res.send({"status": "Fail", "message": error.message});
        console.log(error)
    }

});







module.exports = router