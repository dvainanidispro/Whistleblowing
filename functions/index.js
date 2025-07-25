////////////////////    FIREBASE    ////////////////////
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import logger from "firebase-functions/logger";
import { beforeUserCreated, beforeUserSignedIn, HttpsError } from "firebase-functions/v2/identity";

let region = 'europe-west3';   // default region
// let region = 'us-central1';   // for testing things

////////////////////    EXPRESS    ////////////////////
import express from 'express';
import cookieParser from 'cookie-parser'; 
const server = express();
import {fileParser} from 'express-multipart-file-parser';
server.use(express.urlencoded({extended: true})); 
server.use(express.json());
server.use(express.static('public')); 
server.use(cookieParser());


//////////////////    HANDLEBARS    ///////////////////
server.set('views', "views");   // folder of views
import { create as HandlebarsCreator } from 'express-handlebars';
import handlebarsConfig from './config/handlebars.js';
server.engine('hbs', HandlebarsCreator(handlebarsConfig).engine);       // if view extension is hbs, then use handlebars
server.set('view engine', "hbs");   // use handlebars as the default engine when extension is not specified in res.render

//////////////////    CONTROLLERS & MIDDLEWARE   ///////////////////
import SendEmail from './controllers/mail.js';
import Whistle from './controllers/whistle.js';
import Firebase from './controllers/firebase.js';
import Security from "./config/security.js";
import Cleanup from "./controllers/cleanup.js";
import Language from "./locales/language.js";
server.use(Security);
server.use(Language);






////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////     SERVER     ////////////////////////////////////////

// Αρχική σελίδα "/" (απλώς για να υπάρχει κάτι)
server.get(['/'], (req, res) => {
    res.render('welcome');
});
// Αρχική σελίδα "home" για χρήση
server.get(['/home'], Firebase.company, (req, res) => {
    // res.send("Καλωσήρθατε στην εφαρμογή του Κώδικα Δεοντολογίας του Οργανισμού σας.");
    res.render('home');
});
// Σελίδα πολιτικής απορρήτου
server.get('/privacy', Firebase.company, (req, res) => {
   res.render('privacy');
});


// Φόρμα υποβολής νέας αναφοράς
server.get(['/form','/new'], Firebase.company, (req, res) => {
    res.render('whistleform');
});



// Υποβολή νέας αναφοράς από το χρήστη
server.post(['/','/form','/new'], fileParser(), Firebase.company, Whistle.toDbObject, async (req, res) => {
    let whistle = res.whistle;
    // console.debug(whistle);

    //# ACTIONS AFTER WHISTLE OBJECT CONSTRUCTION
    await Firebase.storeCase(whistle);                      // store the case in the database, whistle object is modified here
    SendEmail.aboutNewWhistle(whistle);                     // send email, do not await the delivery
    Whistle.deleteAttachments(whistle);                     // delete attachments from disk, do not await
    res.render('newcaseconfirm',{whistle});                 // render the confirmation page
});


// Αναζήτηση υπόθεσης με το ID και το PIN από το χρήστη
server.post('/case', async (req, res) => {
    let whistle = await Firebase.getCase(req.body.id, req.body.pin??"no");    // pin="no" is wrong on purpose (in case no pin provided)
    // whistle is now the case object or null
    if (whistle) {
        Firebase.markMessagesAsRead(whistle);     // mark messages as read. Do not await
        res.render('viewcase', {whistle: Whistle.toHumanFormat(whistle)});
    } else {
        res.status(404).send("Δεν βρέθηκε αναφορά με αυτά τα στοιχεία.");
    }
});


// Αποστολή νέου μηνύματος ή/και συνημμένων από το χρήστη
server.post('/pushmessage', fileParser(), Whistle.messageConstructor, async (req, res) => {
    let message = res.message;
    try{
        //# ACTIONS AFTER USER MESSAGE
        // if whistleID is invalid, then the following will throw an error
        let whistle = await Firebase.pushMessageByUser(message);    // push the message to the database
        SendEmail.aboutNewUserMessage(whistle);                     // send email, do not await the delivery
        Whistle.deleteAttachments(message);                         // delete attachments from disk, do not await
        res.render('newmessageconfirm',{whistle});                  // render the confirmation page
    } catch (e) {
        console.error(e);
        res.status(404).send("Δεν βρέθηκε αναφορά με αυτό το ID. Το μήνυμα δεν στάλθηκε.");
    }
});


// Ειδοποίηση του χρήστη για την ενημέρωση της υπόθεσης από τον υπεύθυνο 
server.post('/notifyuser', async (req, res) => {
    try{
        let body = JSON.parse(req.body);    // no-cors sends text/plain (not json)
        let user = await Firebase.verifyToken(body.userToken);      // Firebase user or null
        if ( !user ) { return res.status(401).json("Unauthorized") }

        let whistle = await Firebase.getCase(body.caseId);      // whistle object or null
        if ( !whistle || user.companyID!=whistle.companyID ) { return res.status(404).json("Δεν βρέθηκε η υπόθεση") }

        SendEmail.aboutCaseUpdate(whistle);     // do not await. Returns true (sent) or false (without sumbitter email)
        res.json("ok");        //  because the request is no-cors, it will not be read by browser, so send anything
    } catch (e) { res.status(404).json("Σφάλμα");}
});



//////////////////   TEST PAGES   //////////////////
// server.get("/test-new", (req, res) => {
//     let whistle = {id: 1234567890123456, pin: 1234, companyID: "bkueHt76TQiUW7G8p1BK"}
//     res.render('newcaseconfirm',{whistle});
// });
// server.get('/test-pushmessage', async (req, res) => {
//     let message = {caseId: "1234567890123456", text: "Αυτό είναι ένα μήνυμα από τον καταγγέλoντα", filenames: []};
//     res.render('newmessageconfirm',{whistle: {id: message.caseId, companyID: "bkueHt76TQiUW7G8p1BK"}});
// });
// server.get("/test-case", (req, res) => {
//     // let whistle = JSON.parse('{"date":"2024-03-14","submitter":{"firstname":"ΔΗΜΗΤΡΗΣ","phone":"+306948060820","email":"dvainanidis@gmail.com","notify":true,"lastname":"ΒΑΪΝΑΝΙΔΗΣ"},"companyID":"bkueHt76TQiUW7G8p1BK","pin":"0679","isTest":false,"origin":"http://127.0.0.1","messages":[],"description":"Κλέβει το ταμέιο","filenames":["movie.mp4","voter_list.csv"],"id":"5250467415406000","people":"Μήτσος","status":"initial","submittedAt":{"_seconds":1709405787,"_nanoseconds":149000000}}');
//     let whistle = {"date":"Λιγότερο από 5 χρόνια πριν","submitter":{"firstname":"ΔΗΜΗΤΡΗΣ","phone":"6948060820","email":"dvainanidis@gmail.com","notify":true,"lastname":"ΒΑΪΝΑΝΙΔΗΣ"},"companyID":"bkueHt76TQiUW7G8p1BK","isTest":false,"origin":"http://127.0.0.1","description":"Άντε πάλι ο Μπάμπης","id":"5862227586012496","people":"Ο Μπάμπης ο Σουγιάς","submittedAt":{"_seconds":1709728584,"_nanoseconds":917000000},"title":"Με απ' όλα","type":"","pin":"0000","filenames":["ChordPage Data.xlsx","unsubs.txt","ENFIA-.pdf"],"status":"under resolution","messages":[{"role":"Υπεύθυνος","readByUser":true,"user":"vainanidis@computerstudio.gr","date":{"_seconds":1709843230,"_nanoseconds":371000000},"text":"Αυτό παίζει αλήθεια;"},{"readByCompany":true,"date":{"_seconds":1710260687,"_nanoseconds":154000000},"role":"Καταγγέλλων","text":"Ναι βρε σου λέω","filenames":[]},{"readByCompany":true,"text":"να, κι ένα αρχείο","role":"Καταγγέλλων","filenames":["unsubs.txt"],"date":{"_seconds":1710260715,"_nanoseconds":128000000}}]};
//     res.render('viewcase', {whistle: Whistle.toHumanFormat(whistle)});
// });



//////////////////       404       //////////////////
server.get("*", (req, res) => {
    // console.debug(req.url);
    res.status(404).send("Η σελίδα δεν βρέθηκε.");
});
server.post("*", (req, res) => {
    // console.debug(req.url);
    res.status(404).send("Η σελίδα δεν βρέθηκε.");
});



//////////////////   GIVE SERVER A NAME TO EXPORT   //////////////////
const whistle = onRequest({ region , maxInstances: 2 , concurrency: 8 }, server);






////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////     BLOCKING FUNCTION BEFORE USER CREATED     ///////////////////////////

const userCreation = beforeUserCreated({ region: 'europe-west3' , maxInstances: 2 , concurrency: 4 }, async (event) => {

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






////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////     DELETE ATTACHMENTS AFTER A CASE IS DELETED     ////////////////////////

const afterCaseDeleted = Firebase.afterCaseDeleted;




////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////      AUTO DELETE CASES AFTER TIME      //////////////////////////////

const casesCleanup = onSchedule({ region: 'europe-west3' , maxInstances: 2 , schedule: 'every 168 hours' } , Cleanup.casesCleanUp);     // 168=24*7 = 1 week



///////////////////////////////////////      EXPORTS      ////////////////////////////////////////////

export { whistle, userCreation, afterCaseDeleted, casesCleanup };
