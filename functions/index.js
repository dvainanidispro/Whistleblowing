////////////////////    FIREBASE    ////////////////////
import {onRequest} from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";
import { beforeUserCreated, beforeUserSignedIn, HttpsError } from "firebase-functions/v2/identity";

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

// cookies, cors and other middleware

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
import SendEmail from './controllers/mail.js';
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
    res.render('whistleform', {companyID,formPostUrl});
});


server.post(['/','/new'], fileParser(), Whistle.constructor, async (req, res) => {
    let whistle = res.whistle;
    // console.log(whistle);
    if (whistle.company==null) {
        res.status(404).send("Η αναφορά δεν καταχωρίστηκε διότι δεν βρέθηκε ο οργανισμός. Παρακαλώ, επικοινωνήστε με τον διαχειριστή σας.");
        return;
    }

    //# ACTIONS AFTER WHISTLE OBJECT CONSTRUCTION
    await Firebase.storeCase(whistle);
    SendEmail.aboutNewWhistle(whistle, server.locals.uploadFolder);      //do not await the email delivery
    res.send(`Η αναφορά καταχωρίστηκε με αριθμό αναφοράς: ${whistle.id} και PIN: ${whistle.pin}.`);
});





server.get('/case', async (req, res) => {
    res.render('searchcase', {caseId: req.query.id});
});


server.post('/case', async (req, res) => {
    if ( req.body.id.length<15 || req.body.pin.length<4 ) {   // req body items (form fields) are never null, just: ''
        res.status(404).send("Δεν βρέθηκε αναφορά με αυτά τα στοιχεία.");
        return;
    }
    let whistle = await Firebase.getCase(req.body.id, req.body.pin);        // if pin==null, it will not get validated
    if ( whistle==null ) {
        res.status(404).send("Δεν βρέθηκε αναφορά με αυτά τα στοιχεία.");
        return;
    }
    res.render('viewcase', {whistle, whistleTable: Whistle.toHTMLTable(whistle)});
});



server.post('/pushmessage', async (req, res) => {
    let whistleID = req.body.caseId;
    let messageText = req.body.newMessage;
    let whistle;
    try{
        // if whistleID does not exist, then it will throw an error
        await Firebase.pushMessage(whistleID, messageText);
        whistle = await Firebase.getCase(whistleID);
        SendEmail.aboutNewUserMessage(whistle);   // do not await the email delivery
        res.send('Το μήνυμα στάλθηκε.');
    } catch (e) {
        res.status(404).send("Δεν βρέθηκε αναφορά με αυτό το ID.");
        return;
    }
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





////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////     BLOCKING FUNCTION BEFORE USER CREATED     ///////////////////////////

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
    let authorizedUser = await Firebase.getUser(userEmail);
    if ( !authorizedUser.exists ) {failValidation()}
    logger.log("Ο χρήστης " + userEmail + " δημιούργησε λογαριασμό μόλις τώρα.");

    return  {   // must always return something
        displayName: authorizedUser.data.displayName,
        customClaims: { companyID: authorizedUser.data.companyID } 
    };   

});





export { whistle, beforeCreated };
