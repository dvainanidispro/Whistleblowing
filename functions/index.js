////////////////////    NODE.JS     ///////////////////
import path from 'path';
import fs from 'fs';

////////////////////    FIREBASE    ////////////////////
import {onRequest} from "firebase-functions/v2/https";
// import logger from "firebase-functions/logger";
// import {initializeApp} from "firebase-admin/app";
// import {getFirestore} from "firebase-admin/firestore";
// initializeApp();
// const db = getFirestore();

////////////////////    EXPRESS    ////////////////////
import express from 'express';
const server = express();
import {fileParser} from 'express-multipart-file-parser';
server.use(express.urlencoded({extended: true})); 
server.use(express.json());
server.use(express.static('public')); 
// Application configuration 
server.locals.uploadFolder = './uploads/';
server.locals.devCompanyID = 'NCWt4jXdnzQ5z19vaX9q';

// cookies, cors and other middlewares

//////////////////    HANDLEBARS    ///////////////////
server.set('views', "views");   // folder of views
import { create as HandlebarsCreator } from 'express-handlebars';
const handlebarsConfig = { /* config */
    extname: '.hbs',    // extension for layouts (not views)
    layoutsDir: 'views',
    defaultLayout: 'main',
    helpers: 'views',
    partialsDir: 'views',
};
server.engine('hbs', HandlebarsCreator(handlebarsConfig).engine);       // if view extension is hbs, then use handlebars
server.set('view engine', "hbs");   // use handlebars as the default engine when extension is not specified in res.render

//////////////////    CONTROLLERS    ///////////////////
import {SendEmail} from './controllers/mail.js';
import {whistleConstructor} from './controllers/whistle.js';








////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////     SERVER     ////////////////////////////////////////

server.get('/', (req, res) => {
  // logger.info("Hello logs!", {structuredData: true});
  res.send("Please, whistle here!");
});

// Just for development purposes
server.get('/form/:companyID?', (req, res) => {
    let companyID = req.params.companyID || server.locals.devCompanyID;
    // res.sendFile(path.resolve('./public/whistleblowing.html'));     //resolve = relative to absolute path
    res.render('whistleform', {companyID: companyID});
});


server.post('/', fileParser(), whistleConstructor, async (req, res) => {
    let whistle = res.whistle;
    // console.log(req.body);
    console.log(whistle);

    SendEmail(whistle, server.locals.uploadFolder);
    res.send(`Η αναφορά καταχωρίστηκε με αριθμό αναφοράς: ${whistle.id} και PIN: ${whistle.pin}.`);
});


const whistle = onRequest({ region: 'europe-west3' }, server);
export { whistle };