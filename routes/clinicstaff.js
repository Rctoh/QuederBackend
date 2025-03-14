const express = require('express')
const router = express.Router()
const securityFunctions = require("../functions/securityFunctions");

const utilFunctions = require("../functions/utilFunctions");
const clinicDetails = require('../models/clinicDetailsSchema');
const queueTokenSchema = require('../models/queueTokenSchema');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const pusher = utilFunctions.setUpPusher();


//Check in (Done by clinic staff)

router.post('/checkin', async (req, res) => {

    const clinicId = req.body.clinicId
    const uniqueAppointmentToken = req.body.uniqueAppointmentToken

    const [clinic, queueToken] = await Promise.all([ 
        await clinicDetails.findOne({ "clinicId": clinicId }),
        await queueTokenSchema.findOneAndDelete({ uniqueAppointmentToken: uniqueAppointmentToken })
    ]);

    const serverDecryptedDataJSON = JSON.parse(await securityFunctions.serverQuickDecrypt(queueToken.serverEncryptedForDoctor));

    if (clinic) {

        try {
            
            const currentTime = utilFunctions.getFormattedTimeInGMTPlus8();

            const queueDetails = JSON.parse(clinic.queueDetails);

            const index = queueDetails.findIndex(el => el.userId == serverDecryptedDataJSON.userId);

            if (index == -1) {
                res.send({ "status": "Fail", "message": "User not found in queue" });
            } else {
                queueDetails[index]["asymmetricEncryptedForDoctor"] = serverDecryptedDataJSON.asymmetricEncryptedForDoctor;
                queueDetails[index]["checkedIn"] = currentTime;

                const filter = { clinicId: req.body.clinicId };
                const update = { $set: { "queueDetails": JSON.stringify(queueDetails) } };
                await clinicDetails.updateOne(filter, update);

                pusher.trigger(clinicId, uniqueAppointmentToken, { checkedIn: true })
                pusher.trigger("clinicId" + clinicId, "queueDetailsChanged", {
                    clinicId: clinicId,
                    updatedQueueDetails: queueDetails
                });
                

                res.send({ "status": "Success", "message": "Check in successful" });

            }
            

        } catch (error) {
            
            res.send({ "status": "Fail", "message": error.message });

        }

    } else {
        res.send({ "message": "No clinic found with the given id" })
    }


})


module.exports = router