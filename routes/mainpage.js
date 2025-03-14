const express = require('express')
const router = express.Router()
const clinicDetails = require('../models/clinicDetailsSchema');
const patientSchema = require('../models/patientSchema');
const securityFunctions = require("../functions/securityFunctions");
const utilFunctions = require("../functions/utilFunctions");
const PushNotifications = require("@pusher/push-notifications-server");

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}


const pusher = utilFunctions.setUpPusher();


/// GET CLINIC DATA

router.post('/', async (req, res) => {

    try {

        const decodedUserId = await securityFunctions.getUserIdFromUserJWT(req.headers['authorization'])

        const deviceId = parseInt(req.body.deviceId)

        const [userDetails, allClinic] = await Promise.all([
            await patientSchema.findOne({ "userId": decodedUserId }),
            await clinicDetails.find({})
        ])

        
        const sanitizedClinics = utilFunctions.sanitizeQueueDetails(allClinic);

        const sharedEncryptedData = userDetails.sharedEncryptedData
        const matchingDeviceObject = userDetails.encryptedDataArray.find(deviceObject => deviceObject.deviceId === deviceId);
        const ifStatedAllergies = userDetails.ifStatedAllergies;

        const newData = matchingDeviceObject.newData ?? {};

        res.send({
            "status": "Success", "message": {
                "clinics": sanitizedClinics,
                "sharedEncryptedData": sharedEncryptedData,
                "deviceUniqueEncryptedData": matchingDeviceObject.deviceUniqueEncryptedData,
                "ifStatedAllergies": ifStatedAllergies,
                "newData": JSON.stringify(newData),
            }
        })

    } catch (error) {
        console.error(error)
        res.send({ "status": "fail", "message": error })
    }

})

router.post('/updatedetails', async (req, res) => {
    try {
        const { deviceId, sharedEncryptedData, deviceUniqueEncryptedData } = req.body;
        const decodedUserId = await securityFunctions.getUserIdFromUserJWT(req.headers['authorization'])

        let updatedUser;

        if (sharedEncryptedData == "") { //Means dont need update shared. 
            updatedUser = await patientSchema.findOne({ "userId": decodedUserId })
        } else {
            updatedUser = await patientSchema.findOneAndUpdate( //Means need to update both shared and unique
                { "userId": decodedUserId },
                {
                    $set: { sharedEncryptedData: sharedEncryptedData, }
                },
                { new: true }
            );
        }

        const encryptedDataArray = updatedUser.encryptedDataArray;
        const indexToUpdate = encryptedDataArray.findIndex(data => data.deviceId === parseInt(deviceId));

        if (indexToUpdate !== -1) {

            encryptedDataArray[indexToUpdate].deviceUniqueEncryptedData = deviceUniqueEncryptedData;

            encryptedDataArray.forEach(element => {
                element.newData = {};
            });


            await patientSchema.updateOne(
                { "userId": decodedUserId },
                { $set: { encryptedDataArray } }
            );

            return res.send({ "status": "Success" });
        }

        console.log("Element not found in encryptedDataArray");
    } catch (error) {
        console.error(error);
        res.send({ "status": "Fail", "message": error });
    }
});

/// SEARCH CLINIC BASED ON USER SEARCH VALUE

router.post('/search', async (req, res) => {
    const searchValue = req.body.searchValue;
    const searchResult = await clinicDetails.find({ "clinicName": { $regex: '^' + searchValue, $options: 'i' } });

    try {
        if (searchResult.length > 0) {
            res.send({ "message": searchResult });
        } else {
            res.send({ "message": "Uh oh, no clinic found :(" });
        }
    } catch (error) {
        res.send({ "status": "Fail", "message": error.message });
    }
})


//// CREATE NEW CLINIC

router.post('/add', async (req, res) => {
    const addClinicDetails = new clinicDetails({
        id: req.body.id,
        imageUrl: req.body.imageUrl,
        clinicName: req.body.clinicName,
        address: req.body.address,
        town: req.body.town,
        openingHours: req.body.openingHours,
        phoneNumber: req.body.phoneNumber,
        doctor: req.body.doctor,
        clinicType: req.body.clinicType,
        clinicProgramme: req.body.clinicProgramme,
        paymentMethod: req.body.paymentMethod,
        publicTransport: req.body.publicTransport,
        carpark: req.body.carpark,
        price: req.body.price,
        rating: req.body.rating,
        currentQueue: req.body.currentQueue,
        queueDetails: req.body.queueDetails,
        lastQueueNumber: req.body.lastQueueNumber
    })

    try {
        await addClinicDetails.save()
        console.log("Successful")
        pusher.trigger("Queder", "my-event", {
            message: "Updated"
        });

        res.send("Success")

    } catch {
        res.send("Fail")
    }

})

router.post('/test', async (req, res) => { 
    

    let beamsClient = new PushNotifications({
      instanceId: process.env.BEAM_INSTANCE_ID,
      secretKey: process.env.BEAM_PRIMARY_KEY,
    });
    
    beamsClient
      .publishToInterests(["hello"], {
        fcm: {
          notification: {
            title: "Queder",
            body: "You are now third in queue! Please check in soon, otherwise you may be skipped.",
          },
        },
      })
      .then((publishResponse) => {
        console.log("Just published:", publishResponse.publishId);
      })
      .catch((error) => {
        console.log("Error:", error);
      });

      res.send({ "status": "Success", "message" : "Sent a pusher beam" });
})


module.exports = router