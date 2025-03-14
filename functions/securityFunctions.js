const crypto = require('crypto');
const accountSchema = require('../models/accountSchema');
const jwt = require('jsonwebtoken');
const bcryptjs = require("bcryptjs");
const Cryptr = require('cryptr');
const { decode } = require('punycode');
const cryptr = new Cryptr(process.env.ENCRYPTION_PASSWORD);

async function serverQuickEncrypt(data) {
  return cryptr.encrypt(data);
} 

async function serverQuickDecrypt(data) {
  return cryptr.decrypt(data);
}

async function generateKeyPair() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    }, (err, publicKey, privateKey) => {
      if (err) reject(err);
      resolve({ publicKey, privateKey });
    });
  });
}

async function encryptWithPublicKey(data, publicKey) {
  const bufferData = Buffer.from(data, 'utf-8');
  return crypto.publicEncrypt(publicKey, bufferData).toString('base64');
}

async function decryptWithPrivateKey(encryptedData, privateKey) {
  const bufferEncrypted = Buffer.from(encryptedData, 'base64');
  return crypto.privateDecrypt(privateKey, bufferEncrypted).toString('utf-8');
}

function hashString(string) {
  const hash = crypto.createHmac('sha256', process.env.STATIC_SALT_HASH)
    .update(string)
    .digest('hex');
  return hash;
}

async function comparePassword(userEnteredPassword, hashedPassword) {
  const result = await bcryptjs.compare(userEnteredPassword, hashedPassword);
  return result;
}

async function generateToken(payload) {
  try {
    const permToken = await new Promise((resolve, reject) => {
      jwt.sign(payload, process.env.PERM_TOKEN_SECRET, (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      });
    });

    return { "permToken": permToken };
  } catch (error) {
    console.error('Token generation failed:', error);
    throw new Error('Token generation failed: ' + error.message);
  }
}

function decodeToken(reqHeader) { //LOCAL USE FUNCTION. DO NOT EXPORT
  try {
    const token = reqHeader && reqHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.PERM_TOKEN_SECRET);
    return decodedToken;

  } catch (error) {
    console.error(error)
  }
}

async function getUserIdFromUserJWT(reqHeader) {
  try {
    const decodedToken = decodeToken(reqHeader);
    return decodedToken.userId;
  } catch (error) {
    console.error(error)
  }
}

async function getClinicIdFromStaffJWT(reqHeader) {
  try {
    const decodedToken = decodeToken(reqHeader);
    return decodedToken.clinicId;
  } catch (error) {
    console.error(error)
  }
}

async function verifyIfValidJWT(token) {
  if (!token || !token.startsWith('Bearer ')) {
    return { "message": "Error! Unauthorised User" }
  }

  const authToken = token.split(' ')[1];

  try {
    const payload = await verifyToken(authToken);
    const getId = await accountSchema.find({ "userId": payload.userId });
    if (getId.length > 0) {
      return true;
    }

  } catch (error) {
    return { "message": "Invalid or expired token!" }
  }
}

function generateAppointmentToken() {
  const buffer = crypto.randomBytes(9);
  const token = buffer.toString('base64url');
  return token.slice(0, 15);
}

module.exports = {
  serverQuickEncrypt,
  serverQuickDecrypt,
  generateKeyPair,
  encryptWithPublicKey,
  decryptWithPrivateKey,
  hashString,
  comparePassword,
  generateToken,
  getUserIdFromUserJWT,
  getClinicIdFromStaffJWT,
  verifyIfValidJWT,
  generateAppointmentToken
}