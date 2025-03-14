const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
const express = require('express')
const router = express.Router()
const otpGenerator = require('otp-generator')
const nodemailer = require("nodemailer");
const accountSchema = require('../models/accountSchema');
const patientSchema = require('../models/patientSchema');
const securityFunctions = require("../functions/securityFunctions");
const { decrypt } = require('dotenv');
const { errorMonitor } = require('events');

let OTParray = '[]'
let OTPnumber = 0
let OTPid = 0


if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

//// CHECK IF EMAIL EXIST

router.post('/checkEmail', async (req, res) => {

  try {
    ///Check DB if there is any same email
    const accountDetails = await accountSchema.find({ "hashedEmail": securityFunctions.hashString(req.body.email.toUpperCase()) });

    if (accountDetails.length > 0) { //If already have email inside DB (Which means user logging in)
      res.send({
        "message": "oldUser",
        "userId": accountDetails[0].userId
      })
    } else { // If dont have email inside DB (Which means user creating account)
      res.send({ "message": "newUser" })
    }
  } catch (error) {
    res.send({ "status": "Fail", "message": error.message })
  }
})

//THIS IS FOR LOGIN FUNCTION. CHECK IF THE USER INPUTTED NRIC AND PASSWORD MATCHES THE ONE STORED IN DB

router.post('/checkPasswordNRIC', async (req, res) => {
  const userId = req.body.userId
  const enteredPassword = req.body.enteredPassword;
  const enteredNRIC = req.body.enteredNRIC;

  const accountDetails = await accountSchema.find({ "userId": userId })

  try {
    const [isNRICMatch, isPasswordMatch] = await Promise.all([
      securityFunctions.hashString(enteredNRIC.toUpperCase()) === accountDetails[0].hashedNRIC,
      securityFunctions.comparePassword(enteredPassword, accountDetails[0].password)
    ]);

    if (isNRICMatch && isPasswordMatch) {
      const otpObject = await sendOTP(req.body.email);
      res.send({
        "status": "Success", "OTPid": otpObject.OTPid,
      });
    } else {
      res.send({ "status": "Fail", "message": "Password or NRIC Incorrect!" });
    }
  } catch (error) {
    res.send({ "status": "Fail", "message": error.message })
  }
});

//THIS IS FOR REGISTER. CHECK IF NRIC AND PHONE NUMBER IS ALREADY PRESENT IN DB

router.post('/checkAccountDetails', async (req, res) => {
  try {

    const [checkNRIC, checkPhone] = await Promise.all([
      accountSchema.find({ "hashedNRIC": securityFunctions.hashString(req.body.nric) }),
      accountSchema.find({ "hashedPhoneNumber": securityFunctions.hashString(req.body.phoneNumber) })
    ])

    if (checkNRIC.length > 0) {
      res.send({ "status": "Fail", "message": "NRIC already exists" });
    } else if (checkPhone.length > 0) {
      res.send({ "status": "Fail", "message": "Phone Number already exists" });
    } else {
      const otpObject = await sendOTP(req.body.email);
      res.send({ "status": "Success", "OTPid": otpObject.OTPid });
    }
  } catch (error) {
    res.send({ "status": "Fail", "message": error.message })
  }
});

//VERIFY USER OTP

router.post('/verifyOTP', async (req, res) => {
  try {
    // Getting the OTP details from user
    let OTP = null;
    let OTPentered = req.body.OTPentered;
    let OTPidFromUser = req.body.OTPidFromUser;
    let accessType = req.body.accessType;

    //OTParray is global variable
    let OTParrayJSON = JSON.parse(OTParray);

    // Check if the OTP id from user device is present inside the array 
    //(Ensures that he is the one that requested the OTP)

    const ifExists = OTParrayJSON.filter(function (el) {
      return el.id == OTPidFromUser;
    });

    // Getting the OTP from the id (If OTP id exists in the array)
    if (ifExists.length == 1) {
      OTP = ifExists[0]["otp"];
    } else {
      return res.send("OTP ID not valid.");
    }

    // Checking if the OTP given by the user is the same as the one inside the array
    if (OTP == parseInt(OTPentered)) {
      // If same then delete the OTP from the array
      const deleteObj = (data, column, search) => {
        let result = data.filter(m => m[column] !== search);
        return result;
      };

      try {
        currentOTParray = JSON.parse(OTParray);
        let newOTParray = deleteObj(currentOTParray, 'id', OTPidFromUser);
        OTParray = JSON.stringify(newOTParray);
      } catch (error) {
        res.send({ "status": "Fail", "message": error.message });
      }

      if (accessType == "login") {

        login(res, req.body.userId, req.body.publicKeyString);

      } else {

        registerAccount(
          res,
          req.body.userPublicKey,
          req.body.password,
          req.body.NRIC,
          req.body.email,
          req.body.sharedEncryptedData
        );
      }
    } else {
      return res.send({ "status": "Fail", "message": "OTP incorrect" });
    }
  } catch (error) {
    res.send({ "status": "Fail", "message": error.message })
  }
});

//DEFINING FUNCTION TO SEND OTP TO EMAIL
async function sendOTP(email) {

  //Instantiate the nodemailer variables

  let transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  //Generate otp number 
  OTPnumber = otpGenerator.generate(5, {
    digits: true, lowerCaseAlphabets: false,
    upperCaseAlphabets: false, specialChars: false
  });

  //Generate unique Id
  OTPid = otpGenerator.generate(9);

  await transporter.sendMail({
    from: '"Queder" <otp@tohruichen.com>',
    to: email,
    subject: `OTP Verification : ${OTPnumber}`,
    html: `
  <html>

  <head>
    <style>
      @media only screen and (min-width:768px) {
        .aboveLogo {
          padding-top: 50px;
        }

        .break {
          padding-bottom: 30px;
        }
      }
    </style>
  </head>

  <body>
    <div class="">
      <div class="aHl"></div>
      <div id=":2i" tabindex="-1"></div>
      <div id=":27" class="ii gt" jslog="20277; u014N:xr6bB; 4:W251bGwsbnVsbCxbXV0.">
        <div id=":26" class="a3s aiL msg-7431138186310362409"><u></u>

          <div width="100%" style="margin:0;background-color:#f0f2f3">

            <div style="margin:auto;max-width:600px;" class="aboveLogo">


              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" align="center" id="m_-7431138186310362409logoContainer" style="background:#252f3d;border-radius:3px 3px 0 0;max-width:600px">
                <tbody>
                  <tr>
                    <td style="background:#252f3d;border-radius:3px 3px 0 0;padding:20px 0 10px 0;text-align:center">
                      <img src="https://tohruichen.com/logo/png/navybackgroundleft.png" width="142.5" height="45" alt="Queder logo" border="0" style="font-family:sans-serif;font-size:15px;line-height:140%;color:#555555" class="CToWUd" data-bit="iit">
                    </td>
                  </tr>
                </tbody>
              </table>


              <table role="presentation" cellspacing="0" cellpadding="0" width="100%" align="center" id="m_-7431138186310362409emailBodyContainer" style="border:0px;border-bottom:1px solid #d6d6d6;max-width:600px">
                <tbody>
                  <tr>
                    <td style="background-color:#fff;color:#444;font-family:'Amazon Ember','Helvetica Neue',Roboto,Arial,sans-serif;font-size:14px;line-height:140%;padding:25px 35px">
                      <h1 style="font-size:20px;font-weight:bold;line-height:1.3;margin:0 0 15px 0">Verify your email address</h1>
                      <p style="margin:0;padding:0">Thank you for registering with Queder. To make sure it's really you, please enter the following verification code in your app. If you this was not done by you or you don’t want to create an account, you can ignore this message.</p>
                      <p style="margin:0;padding:0"></p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color:#fff;color:#444;font-family:'Amazon Ember','Helvetica Neue',Roboto,Arial,sans-serif;font-size:14px;line-height:140%;padding:25px 35px;padding-top:0;text-align:center">
                      <div style="font-weight:bold;padding-bottom:15px">Verification code</div>
                      <div style="color:#000;font-size:36px;font-weight:bold;padding-bottom:15px">${OTPnumber}</div>
                      <div>(This code is valid for 3 minutes)</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color:#fff;border-top:1px solid #e0e0e0;color:#777;font-family:'Amazon Ember','Helvetica Neue',Roboto,Arial,sans-serif;font-size:14px;line-height:140%;padding:25px 35px">
                      <p style="margin:0 0 15px 0;padding:0 0 0 0">Queder will never email you and ask you to disclose or verify your password, credit card, or banking account number.</p>
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>

            <p class="break">
            </p>

  </body>

  </html>`,
  });

  //First get the current array and turn into json array then add the newly generate data 
  //into the temp array and convert it back to string

  let OTParrayJSON = JSON.parse(OTParray)
  OTParrayJSON.push({ "id": OTPid, "otp": OTPnumber })
  OTParray = JSON.stringify(OTParrayJSON)

  //After 180000 milisecodns or 3 minutes, automatically check if the otp still exist inside anot. If still inside then remove

  setTimeout(() => {
    let index = OTParrayJSON.findIndex(obj => obj.id === OTPid);
    if (index !== -1) {
      OTParrayJSON.splice(index, 1);
      OTParray = JSON.stringify(OTParrayJSON);
    }
  }, 180000);

  return { "OTPid": OTPid, "otp": OTPnumber }

}

async function login(res, userId, publicKeyString) {

  try {

    const [jwtToken, storedUserDetails] = await Promise.all([
      await securityFunctions.generateToken({ "userId": userId }),
      await patientSchema.findOneAndUpdate(
        { "userId": userId },
        { $inc: { numberOfLoginedDevice: 1 } },
        { new: true })
    ])

    if (!storedUserDetails) {
      return res.send({ "status": "Fail", "message": "User not found" });
    }

    const lastDeviceId = storedUserDetails.lastDeviceId;
    const encryptedDataArray = storedUserDetails.encryptedDataArray;

    encryptedDataArray.push({
      "deviceId": lastDeviceId + 1,
      "publicKey": publicKeyString,
      "newData": {}
    });

    await patientSchema.updateOne(
      { "userId": userId },
      {
        $set: {
          encryptedDataArray: encryptedDataArray,
          lastDeviceId: lastDeviceId + 1
        }
      }
    );

    res.send(
      {
        "status": "Success",
        "jwtToken": JSON.stringify(jwtToken),
        "sharedEncryptedData": storedUserDetails.sharedEncryptedData,
        "ifStatedAllergies": storedUserDetails.ifStatedAllergies,
        "deviceId": (lastDeviceId + 1).toString()
      });


  } catch (error) {
    console.error(error)
    res.send({ "status": "Fail", "message": `Login Fail: ${error.message}` })
  }
}

//WHEN USER LOGIN ON NEW DEVICE, ADD IT TO DATABASE (NEW PUBLIC KEY ETC.)

// router.post('/updateDetailsLogin', async (req, res) => {
//   try {
//     const userId = req.body.userId;

//     const updatedUser = await patientSchema.findOneAndUpdate(

//     );



//     const lastDeviceId = updatedUser.lastDeviceId;
//     const encryptedDataArray = updatedUser.encryptedDataArray;

//     encryptedDataArray.push({
//       "deviceId": lastDeviceId + 1,
//       "publicKey": req.body.userPublicKey,
//       "deviceUniqueEncryptedData": req.body.deviceUniqueEncryptedData,
//       "newData": {}
//     });

//     await patientSchema.updateOne(
//       { "userId": userId },
//       {
//         $set: {
//           encryptedDataArray: encryptedDataArray,
//           lastDeviceId: lastDeviceId + 1
//         }
//       }
//     );

//     res.send({
//       "status": "Success",
//       "deviceId": (lastDeviceId + 1).toString()
//     });
//   } catch (error) {
//     console.error(error);
//     res.send({ "status": "Fail", "message": `Update login fail: ${err.message}` });
//   }
// });



async function registerAccount(res, userPublicKey, password, NRIC, email,
  sharedEncryptedData) {

  //defining the function to hash password
  async function hashPassword(string) {
    return await bcryptjs.hash(string, 10);
  }

  //Generate a unique userId:
  let generatedUserId = generateGloballyUniqueId()

  const encryptedAccountDetails = new accountSchema({
    userId: generatedUserId,
    password: await hashPassword(password),
    hashedEmail: securityFunctions.hashString(email.toUpperCase()),
    hashedNRIC: securityFunctions.hashString(NRIC.toUpperCase()),
  })

  const patientDetails = new patientSchema({
    userId: generatedUserId,
    numberOfLoginedDevice: 1,
    lastDeviceId: 1,
    ifStatedAllergies: false,
    sharedEncryptedData: sharedEncryptedData,
    encryptedDataArray: [{
      "deviceId": 1,
      "publicKey": userPublicKey,
      "newData": {},
    }],
  })

  try {
    await Promise.all([
      encryptedAccountDetails.save(),
      patientDetails.save()
    ]);
    const jwtToken = await securityFunctions.generateToken({ "userId": generatedUserId })
    res.send({ "status": "Success", "jwtToken": JSON.stringify(jwtToken), "deviceId": "1", "userId": generatedUserId });

  } catch (error) {
    console.error(error);
    res.send({ "status": " Fail", "message": `Register Fail: ${error.message}` });
  }

}

router.post('/logout', async (req, res) => {
  try {
    const decodedUserId = await securityFunctions.getUserIdFromUserJWT(req.headers['authorization'])

    const updateResult = await patientSchema.updateOne(
      { "userId": decodedUserId },
      {
        $inc: { numberOfLoginedDevice: -1 },
        $pull: { encryptedDataArray: { deviceId: parseInt(req.body.deviceId) } }
      }
    );

    if (updateResult.modifiedCount > 0) {
      res.send({ "status": "Success" });
    } else {
      res.send({ "status": " Fail", "message": "Failed to logout. Please try again" });
    }
  } catch (error) {
    console.error(error);
    res.send({ "status": " Fail", "message": error });
  }
});

function generateGloballyUniqueId() {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(6).toString('hex'); // 12 characters
  const userId = timestamp + randomBytes;

  // Trim to the desired length (15 characters)
  return userId.slice(0, 15);
}



module.exports = router