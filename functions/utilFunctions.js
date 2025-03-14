const Pusher = require("pusher");

function getFormattedTimeInGMTPlus8() {
    const nowUTC = new Date();
    const nowGMTPlus8 = new Date(nowUTC.getTime() + 8 * 60 * 60 * 1000);

    let hours = nowGMTPlus8.getHours();
    const minutes = nowGMTPlus8.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
}

function setUpPusher() {
    const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true
    });

    return pusher;
}


// queueDetails is an array containing JSON objects of patient who have gotten their queue number. 
// This may include sensitive information like their symptom and comments, which should only be visible to
// doctors. Hence, when a patient requests for the clinic details, the queueDetails should be sanitized
// to only include the queue number. The purpose of this functiom is to allow the patient to know how 
// many people are in queue and how many are infront of them. 

function sanitizeQueueDetails(allClinic) {
    let clinicsArray;
    
    // Check the type of allClinic and parse if it's a string
    if (typeof allClinic === 'string') {
        try {
            clinicsArray = JSON.parse(allClinic);
        } catch (error) {
            throw new Error('Failed to parse allClinic JSON string');
        }
    } else if (Array.isArray(allClinic)) {
        clinicsArray = allClinic;
    } else {
        throw new Error('Invalid data format for allClinic');
    }

    // Map through the clinicsArray
    return clinicsArray.map(clinic => {
        // Convert clinic to plain object if it's a Mongoose document
        const plainClinic = clinic.toObject ? clinic.toObject() : clinic;

        // Parse queueDetails safely
        let queueDetailsArray = [];
        try {
            queueDetailsArray = JSON.parse(plainClinic.queueDetails || '[]');
        } catch (error) {
            throw new Error('Failed to parse queueDetails JSON string');
        }

        // Filter the queueDetails to only include queueNumber
        const filteredQueueDetails = queueDetailsArray.map(detail => ({
            queueNumber: detail.queueNumber
        }));

        return {
            ...plainClinic,
            queueDetails: filteredQueueDetails
        };
    });
}


module.exports = {
    setUpPusher,
    getFormattedTimeInGMTPlus8,
    sanitizeQueueDetails,
  }