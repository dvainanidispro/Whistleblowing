////////////////////    NODE.JS     ///////////////////
import path from 'path';
import fs from 'fs';

////////////////////    FIREBASE    ////////////////////
import {onRequest} from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";
import { beforeUserCreated, beforeUserSignedIn, HttpsError } from "firebase-functions/v2/identity";
// import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
// initializeApp();
const db = getFirestore();

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
import { SendEmail } from './controllers/mail.js';
import Whistle from './controllers/whistle.js';
import Firebase from './controllers/firebase.js';





////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////     SERVER     ////////////////////////////////////////

server.get('/', (req, res) => {
  // logger.info("Hello logs!", {structuredData: true});
  res.send("Καλωσήρθατε στην υπηρεσία ανώνυμης αναφοράς παραβίασης του Κώδικα Δεοντολογίας της εταιρείας σας.");
});

// Just for development purposes
server.get(['/form','/new'], (req, res) => {
    console.log(req.get('host'));
    let companyID = req.query.companyid || server.locals.devCompanyID;
    let formPostUrl = (req.get('host')=="127.0.0.1") 
        ? "http://127.0.0.1/whistleblowing-app/europe-west3/whistle/" 
        : "https://europe-west3-whistleblowing-app.cloudfunctions.net/whistle/"; 
    // res.sendFile(path.resolve('./public/whistleblowing.html'));     //resolve = relative to absolute path
    res.render('whistleform', {companyID,formPostUrl});
});


server.post('/', fileParser(), Whistle.constructor, async (req, res) => {
    let whistle = res.whistle;
    // console.log(whistle);
    if (whistle.company==null) {
        res.status(404).send("Η αναφορά δεν καταχωρίστηκε διότι δεν βρέθηκε ο οργανισμός. Παρακαλώ, επικοινωνήστε με τον διαχειριστή σας.");
        return;
    }

    //# ACTIONS AFTER WHISTLE CONSTRUCTION
    SendEmail(whistle, server.locals.uploadFolder);      //do not await the email delivery
    await Firebase.storeCase(whistle);
    res.send(`Η αναφορά καταχωρίστηκε με αριθμό αναφοράς: ${whistle.id} και PIN: ${whistle.pin}.`);
});





server.get('/case', async (req, res) => {
    res.render('searchcase', {caseId: req.query.id});
});

server.post('/case', async (req, res) => {
    let whistle = await Firebase.getCase(req.body.id, req.body.pin);
    if (whistle==null) {
        res.status(404).send("Δεν βρέθηκε αναφορά με αυτά τα στοιχεία.");
        return;
    }
    res.render('viewcase', {whistle, whistleTable: Whistle.toHTMLTable(whistle)});
});

server.post('/pushmessage', async (req, res) => {
    let whistleID = req.body.caseId;
    let messageText = req.body.newMessage;
    try{
        // if whistleID does not exist, then it will throw an error
        await Firebase.pushMessage(whistleID, messageText);
    } catch (e) {
        res.status(404).send("Δεν βρέθηκε αναφορά με αυτό το ID.");
        return;
    }
    res.send('Το μήνυμα στάλθηκε.');
});




server.get("*", (req, res) => {
    console.log(req.url);
    res.status(404).send("Η σελίδα δεν βρέθηκε.");
});
server.post("*", (req, res) => {
    console.log(req.url);
    res.status(404).send("Η σελίδα δεν βρέθηκε.");
});



const whistle = onRequest({ region: 'europe-west3' }, server);






/////////////  BLOCKING FUNCTION BEFORE USER CREATED //////////////

const beforeCreated = beforeUserCreated({ region: 'europe-west3' }, async (event) => {

    /** Tells firebase to reject the new user */
    let failValidation = function(){
        throw new HttpsError('permission-denied', 'Μη έγκυρος χρήστης');
    };

    // check for email existence
    const user = event.data;
    const userEmail = user?.email ?? null;
    if ( !userEmail ) {failValidation()}
    logger.log(`Έλεγχος ${userEmail} για δημιουργία λογαριασμού...`);

    // check Firestore if userEmail belongs to users collection
    let authorizedUser = await db.collection('users').doc(userEmail).get();
    if ( !authorizedUser.exists ) {failValidation()}
    logger.log("Ο χρήστης " + userEmail + " δημιούργησε λογαριασμό μόλις τώρα.");

    return      // must always return

});





export { whistle, beforeCreated };
