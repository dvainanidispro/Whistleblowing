import path from 'path';
import fs from 'fs';

import {onRequest} from "firebase-functions/v2/https";
// import logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
initializeApp();
const db = getFirestore();

import express from 'express';
const server = express();
import {fileParser} from 'express-multipart-file-parser';
const uploadFolder = './uploads/';


import ShortUniqueId from 'short-unique-id';
const uid = new ShortUniqueId({
    dictionary: 'number',
    length: 6
});


////////////////    MAIL CONFIG  //////////////// 
import nodemailer from 'nodemailer';
var transporter = nodemailer.createTransport({
    host: process.env.MAILHOST,
    port: process.env.MAILPORT,
    auth: {
      user: process.env.MAILUSER,
      pass: process.env.MAILPASS
    }
  });
var sendEmail = async (whistle) => {
    // prepair mail with defined transport object
    let message = {
        from: process.env.MAILFROM, // sender address
        to: whistle.company.recipient, // list of receivers
        subject: `Περιστατικό ${whistle.id}`, // Subject line
        //   text: whistle.description, // plain text body
        html: /*html*/`<h1>Περιστατικό ${whistle.id}</h1>
                <h2>Στοιχεία περιστατικού</h2>
                <p>Τύπος περιστατικού: ${whistle.type}</p>
                <p>Ημερομηνία περιστατικού: ${whistle.date || " - "}</p>
                <p>Τοποθεσία περιστατικού: ${whistle.place || " - "}</p>
                <p>Στοιχεία επικοινωνίας αναφέροντος: ${whistle.contact || " - "}</p>
                <h2>Αναλυτική Περιγραφή</h2>
                <p>${whistle.description}</p>
        `, // html body
        attachments: whistle.fileNames.map(fileName => {
            return {
                filename: fileName,
                path: path.resolve(uploadFolder + fileName),
            }
        }),
    };

    // send email
    await transporter.sendMail(message);
    //delete attachments
    whistle.fileNames.forEach(fileName => {
        fs.unlinkSync(uploadFolder + fileName);
    });
}

////////////////  GET COMPANY DETAILS FROM FIRESTORE DATABASE  ////////////////
// var trueTypeOf = (obj) => Object.prototype.toString.call(obj).slice(8, -1).toLowerCase()
let getCompany = async (companyID) => {
    let company = await db.collection('companies').doc(companyID).get();
    return company.data();
};




////////////////    SERVER  //////////////// 

server.get('/', (req, res) => {
  // logger.info("Hello logs!", {structuredData: true});
  res.send("Please, whistle here!");
});

// Just for development purposes
server.get('/form', (req, res) => {
    res.sendFile(path.resolve('./public/whistleblowing.html'));     //resolve = relative to absolute path
});


server.use(fileParser());

server.post('/', async (req, res) => {
    let whistle = {};
    whistle.id = uid.rnd();
    whistle.type = req.body.type;
    whistle.date = req.body.date;
    whistle.place = req.body.place;
    whistle.description = req.body.description;
    whistle.contact = req.body.contact;
    whistle.companyID = req.body.company;
    whistle.isTest = (whistle.companyID=='NCWt4jXdnzQ5z19vaX9q');
    whistle.company = (whistle.isTest) ? {recipient: process.env.MAILTO} : await getCompany(whistle.companyID);
    whistle.origin = req.get('origin');

    whistle.fileNames = [];
    req.files.forEach(file => {
        if (file.originalname == "") {return}   // if file exists (req.files always has something)
        fs.writeFileSync(uploadFolder + file.originalname, file.buffer, (err) => {
            if (err) throw err;
        }); 
        whistle.fileNames.push(file.originalname);
    });

    console.log(whistle);

    sendEmail(whistle);
    res.send(`Η αναφορά καταχωρίστηκε με αριθμό ${whistle.id}`);
});


const whistle = onRequest({ region: 'europe-west3' }, server);
export { whistle };