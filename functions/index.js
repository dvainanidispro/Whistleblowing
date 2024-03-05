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

// Αρχική σελίδα
server.get('/', Firebase.company, (req, res) => {
    res.render('home');
});

// Αρχική σελίδα
server.get('/home', Firebase.company, (req, res) => {
    res.render("home",{company: res.company});
});

// Φόρμα υποβολής νέας αναφοράς
server.get(['/form','/new'], Firebase.company, (req, res) => {
    res.render('whistleform', {company:res.company});
});

// Δεν χρειάζεται πια διότι η φόρμα υπάρχει στο home
server.get('/case', async (req, res) => {
    res.render('searchcase', {caseId: req.query.id});
});


// Υποβολή νέας αναφοράς από το χρήστη
server.post(['/','/new','/form'], fileParser(), Whistle.toDbObject, async (req, res) => {
    let whistle = res.whistle;
    console.log(whistle);
    //TODO: add handling for wrong company ID

    //# ACTIONS AFTER WHISTLE OBJECT CONSTRUCTION
    await Firebase.storeCase(whistle);                      // store the case in the database
    // SendEmail.aboutNewWhistle(whistle);                     // send email, do not await the delivery
    Whistle.deleteAttachments(whistle);                     // delete attachments from disk, do not await
    res.render('newcaseconfirm',{whistle});                 // render the confirmation page
});


// Αναζήτηση υπόθεσης με το ID και το PIN από το χρήστη
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
    res.render('viewcase', {whistle: Whistle.toHumanFormat(whistle)});
});


// Αποστολή νέου μηνύματος ή/και συνημμένων από το χρήστη
server.post('/pushmessage', fileParser(), Whistle.messageConstructor, async (req, res) => {
    let message = res.message;
    try{
        //# ACTIONS AFTER USER MESSAGE
        // if whistleID is invalid, then it will throw an error
        let whistle = await Firebase.pushMessage(message);      // push the message to the database
        // SendEmail.aboutNewUserMessage(whistle);                 // send email, do not await the delivery     //TODO: enable this
        Whistle.deleteAttachments(message);                     // delete attachments from disk, do not await
        res.render('messageok');                                // render the confirmation page
    } catch (e) {
        res.status(404).send("Δεν βρέθηκε αναφορά με αυτό το ID. Το μήνυμα δεν στάλθηκε.");
        return;
    }
});


// Ειδοποίηση του χρήστη για την ενημέρωση της υπόθεσης από τον υπεύθυνο 
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



//////////////////   TEST PAGES   //////////////////
server.get("/test-new", (req, res) => {
    let whistle = {id: 1234567890123456, pin: 1234}
    res.render('newcaseconfirm',{whistle});
});

server.get("/test-case", (req, res) => {
    let whistle = JSON.parse('{"date":"2024-03-14","submitter":{"firstname":"ΔΗΜΗΤΡΗΣ","phone":"+306948060820","email":"dvainanidis@gmail.com","notify":true,"lastname":"ΒΑΪΝΑΝΙΔΗΣ"},"companyID":"bkueHt76TQiUW7G8p1BK","pin":"0679","isTest":false,"origin":"http://127.0.0.1","messages":[],"description":"Κλέβει το ταμέιο","filenames":["movie.mp4","voter_list.csv"],"id":"5250467415406000","people":"Μήτσος","status":"initial","submittedAt":{"_seconds":1709405787,"_nanoseconds":149000000}}');
    res.render('viewcase', {whistle: Whistle.toHumanFormat(whistle)});
});

server.get('/test-pushmessage', fileParser(), Whistle.messageConstructor, async (req, res) => {
    let message = {caseId: "1234567890123456", text: "Αυτό είναι ένα μήνυμα από τον καταγγέλoντα", filenames: []};
    res.render('messageok');
});


//////////////////       404       //////////////////
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
