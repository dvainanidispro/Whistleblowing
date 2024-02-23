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
server.locals.devCompany = {id:'NCWt4jXdnzQ5z19vaX9q',name:"Εταιρία δοκιμών Α.Ε."};

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
    let company = {
        id: req.query.companyid || server.locals.devCompany.id,
        name: req.query.companyname || server.locals.devCompany.name
    };
    let host = req.get('host');
    let formPostUrl = (host.includes("127.0.0.1")) 
        ? `http://${host}/whistleblowing-app/europe-west3/whistle/` 
        : "https://europe-west3-whistleblowing-app.cloudfunctions.net/whistle/"; 
    res.render('whistleform', {company,formPostUrl});
});


server.post(['/','/new'], fileParser(), Whistle.constructor, async (req, res) => {
    let whistle = res.whistle;

    //TODO: add handling for wrong company ID

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
        // if whistleID is invalid, then it will throw an error
        whistle = await Firebase.pushMessage(whistleID, messageText);
        SendEmail.aboutNewUserMessage(whistle);   // do not await the email delivery
        res.send('Το νέο μήνυμα στάλθηκε στον υπεύθυνο.');
    } catch (e) {
        res.status(404).send("Δεν βρέθηκε αναφορά με αυτό το ID.");
        return;
    }
});



server.post('/notifyuser', async (req, res) => {
    try{
        let body = JSON.parse(req.body);    // no-cors sends text/plain (not json)
        let user = await Firebase.verifyToken(body.userToken);
        if (!user) {
            res.status(401).json("Unauthorized");
            return;
        }
        // if caseId is invalid, then it will throw an error
        let whistle = await Firebase.getCase(body.caseId);
        if (user.companyID!=whistle.companyID) {
            res.status(403).json("Unauthorized");
            return;
        }

        let emailSent = await SendEmail.aboutCaseUpdate(await Firebase.getCase(body.caseId));
        res.json(emailSent);
    } catch (e) { res.status(404).json("Σφάλμα");}
});



server.get("/test-new", (req, res) => {
    let whistle = {id: 1234567890123456, pin: 1234}
    res.render('newcaseconfirm',{whistle});
});

server.get("/test-case", (req, res) => {
    let whistle = JSON.parse('{"messages":[{"date":{"seconds":1707469862,"nanoseconds":470000000},"order":1,"role":"Υπεύθυνος","text":"Αυτό είναι το πρώτο μήνυμα","user":"vainanidis@computerstudio.gr"},{"user":"vainanidis@computerstudio.gr","date":{"seconds":1707470658,"nanoseconds":323000000},"role":"Υπεύθυνος","order":2,"text":"Αυτό είναι το δεύτερο μήνυμα"},{"role":"Καταγγέλων","date":{"seconds":1707595514,"nanoseconds":695000000},"text":"τέταρτο"},{"date":{"seconds":1708347710,"nanoseconds":727000000},"user":"vainanidis@computerstudio.gr","order":5,"text":"Πέμπτο μήνυμα","role":"Υπεύθυνος"},{"text":"έκτο","role":"Υπεύθυνος","date":{"seconds":1708353674,"nanoseconds":71000000},"order":6,"user":"vainanidis@computerstudio.gr"},{"date":{"seconds":1708357891,"nanoseconds":154000000},"role":"Υπεύθυνος","user":"vainanidis@computerstudio.gr","order":7,"text":"κι άλλο!"},{"date":{"seconds":1708359274,"nanoseconds":263000000},"text":"Καινούργιο μήνυμα από καταγγέλλοντα","role":"Καταγγέλων"},{"role":"Καταγγέλων","date":{"seconds":1708371778,"nanoseconds":531000000},"text":"Δώσε"}],"fileNames":[],"type":"Παραβίαση Ασφαλείας Εργασίας","description":"Μαζί τα φάγαμε!","submitter":{"contact":"694","email":"dvainanidis@gmail.com"},"isTest":true,"title":"Κοίτα να δεις 12","company":{"recipient":"dimitris@computerstudio.gr"},"origin":"http://127.0.0.1","id":"0254538630584255","companyID":"bkueHt76TQiUW7G8p1BK","submittedAt":{"seconds":1706926727,"nanoseconds":275000000},"status":"under investigation","date":"2024-02-02","pin":"1339","place":"Εδώ"}');
    res.render('viewcase', {whistle: Whistle.toHumanFormat(whistle)});
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
        displayName: authorizedUser.data().displayName,
        customClaims: { companyID: authorizedUser.data().companyID } 
    };   

});





export { whistle, beforeCreated };
