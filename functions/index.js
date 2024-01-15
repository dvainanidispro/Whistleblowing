import path from 'path';
import fs from 'fs';

import {onRequest} from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";

import express from 'express';
const server = express();
import {fileParser} from 'express-multipart-file-parser';

// var trueTypeOf = (obj) => Object.prototype.toString.call(obj).slice(8, -1).toLowerCase()



server.get('/', (req, res) => {
  // logger.info("Hello logs!", {structuredData: true});
  res.send("Please, whistle here!");
});

// Just for development purposes
server.get('/form', (req, res) => {
    res.sendFile(path.resolve('./public/whistleblowing.html'));     //resolve = relative to absolute path
});

server.use(fileParser());

server.post('/', (req, res) => {
    let body = req.body;
    // console.log(JSON.parse(body));
    // console.log(trueTypeOf(body));
    let whistle = {};
    whistle.description = req.body.description;
    whistle.type = req.body.type;
    whistle.date = req.body.date;
    whistle.place = req.body.place;
    whistle.contact = req.body.contact;
    whistle.fileNames = [];
    
    // console.log(body.toString());
    // let body = JSON.parse(Buffer.from(req.body, 'utf8').toString('utf-8'));
    console.log(req.files); // array
    // console.log(trueTypeOf(req.files[0].buffer)); // array

    req.files.forEach(file => {
        fs.writeFileSync('./uploads/' + file.originalname, file.buffer, (err) => {
            if (err) throw err;
        }); 
        whistle.fileNames.push(file.originalname);
    });
    console.log(whistle);
    res.send("Η αναφορά καταχωρίστηκε!");

    //TODO: Send e-mail to the recipient

    //TODO: Delete files from uploads folder

    logger.log('everything ok');
});


const whistle = onRequest({ region: 'europe-west3' }, server);
export { whistle };