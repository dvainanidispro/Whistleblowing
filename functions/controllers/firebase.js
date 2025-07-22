import firebase from "firebase-admin";
import { getFirestore, Timestamp, FieldValue, Filter } from "firebase-admin/firestore";
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
firebase.initializeApp();    // Make sure you call initializeApp() before using any of the Firebase services.
const db = getFirestore();
import { getStorage } from 'firebase-admin/storage';
const storage = getStorage().bucket();


/** The folder with the temporary attachments */
import config from '../config/config.js';
let attachmentsFolder = config.attachmentsFolder;

/** Map to cache things  */
let DimCache = new Map();


/**
 * Get company details from the Firestore database
 * @param {string} companyID 
 * @returns {Promise<Object>|null} company details or null
 */
let getCompany = async (companyID) => {
    if (companyID==null) {return null}
    if (DimCache.has(companyID)) {return DimCache.get(companyID)};    // get from cache
    let company = await db.collection('companies').doc(companyID).get();
    company = company.data()??null;
    if (company) {company.id = companyID};
    DimCache.set(companyID,company);    // store in cache, even if null
    //NOTE: if not a google cloud function, then set setTimeout to delete from cache
    return company;
};
 

/** 
 * Middleware to validate the company and store the company details to res.company. 
 * Uses mainly the get parameter of the request (and if it does not exist, then the form value). 
 * @returns {Promise<void>} The company object is stored in res.company
 */
let company = async (req, res, next) => {
    let companyID = req?.query?.company ?? req?.body?.company;      // req.body.company για όταν στέλνεται από άλλο website
    // get from cache or from Firestore
    let company = await getCompany(companyID);   
    if (!company){
        // Γενικό μήνυμα γιατί χρησιμοποιείται σε πολλά routes
        res.status(404).send("Σφάλμα! Δεν βρέθηκε ο Οργανισμός. Παρακαλώ, χρησιμοποιήστε το σωστό σύνδεσμο για να πραγματοποιήσετε αυτή την ενέργεια.");
    } else {
        res.company = company;          // TODO: να αφαιρεθεί η χρήση του
        res.locals.company = company;
        next();
    }
};

/**
 * Store the attachments in the Firebase Storage
 * @param {Array<string>} filenames
 * @param {string} whistleID
 * @param {string} companyID
 */
let storeAttachments = async (filenames, whistleID, companyID) => {
    if (filenames.length==0) {return}
    let promises = filenames.map(filename => {
        let storagePath = attachmentsFolder + filename;     // storagePath is not a genuine path, but a filename string
        return storage.upload(storagePath, {destination: companyID + '/' + whistleID + '/' + filename});
    });
    await Promise.all(promises);
    console.debug("Αποθηκεύτηκαν τα συνημμένα στο Firebase Storage");
};


/**
 * Store the case in the Firestore database, in the collection 'cases'
 * @param {*} whistle 
 * @returns {Promise<string>} the id of the stored case
 */
let storeCase = async (whistle) => {
    // if (whistle.isTest) {return null}
    whistle.submittedAt = FieldValue.serverTimestamp(); // firestore's timestamp
    //TODO: add handling for wrong company ID
    
    let whistleRef = db.collection('cases').doc(whistle.id);
    await whistleRef.set(whistle);
    console.debug("Αποθηκεύτηκε νέα υπόθεση σε Firestore");
    await storeAttachments(whistle.filenames, whistle.id, whistle.companyID);
    return whistleRef.id;
}


/**
 * Get the case from the Firestore database, from the collection 'cases', or null if not found
 * @param {string} id the Whistle ID
 * @param {string} pin If set, then the function validates it before returns
 * @returns {Promise<Object>} the case object or null
 */
let getCase = async (id, pin=null) => {
    // initial basic validation
    id = id.trim();
    pin = pin && pin?.trim();   // if pin is set, then trim it
    if ( id.length!=16 || (pin && pin?.length!=4) ) { return null } 

    // get case from Firestore
    let whistle = await db.collection('cases').doc(id).get();
    if ( pin==null || whistle.data().pin==pin ) {    
        // DO NOT CHANGE to !pin, because malicious user can send: pin=false
        return whistle.data();          
    } else {
        return null;
    }
};


/**
 * Get user details from the Firestore database, from the collection users
 * @param {string} userEmail the user's email
 * @returns {Promise<Object>} user object
 */
let getUser = (userEmail) => {
    return db.collection('users').doc(userEmail).get();
};


/**
 * Push a message to the case in the Firestore database, in the collection 'cases'
 * @param {string} whistleID 
 * @param {string} messageText 
 * @returns {Promise<Object>} the case
 */
let pushMessageByUser = async (message) => {
    let whistleRef = db.collection('cases').doc(message.caseId);
    let messageObject = {
        text: message.text,
        // server's timestamp, because: FieldValue.serverTimestamp() cannot be used inside of an array! (only on root document?)
        date: Timestamp.now(),      
        role: 'Καταγγέλλων',
        readByCompany: false,
        filenames: message.filenames,
        // submittedBy: 'Ανώνυμος'
    };

    // if there is no whistle with this id, the update command will throw an error. Else, it returns nothing (void)
    if (messageObject.filenames.length){    // Αν έχει αρχεία
        await whistleRef.update({
            messages: FieldValue.arrayUnion(messageObject),
            filenames: FieldValue.arrayUnion(...message.filenames)      // this does not work with empty array / null
        });
    } else {
        await whistleRef.update({
            messages: FieldValue.arrayUnion(messageObject)
        });
    }
    console.debug("Αποθηκεύτηκε νέο μήνυμα σε Firestore");

    //NOTE: Δεν χρειάζεται ολόκληρο το object, μόνο το id (για την αποστολή email) και το companyID (για τα Attachments - Firebase Storage). 
    let updatedWhistle = (await whistleRef.get()).data();       
    await storeAttachments(message.filenames, message.caseId, updatedWhistle.companyID);
    return updatedWhistle;
};

/** 
 * Verifies the firebase token and returns the decoded token (as a user object or null)
 * @param {string} idToken 
 * @returns {Promise<Object>} the decoded token as a user object (or null)
 */
let verifyToken = async (idToken) => {
    try{
        //If it fails, it will throw an error
        let decodedToken = await firebase.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (e) {
        return null;    
    }
};

/** Updates case so the user has read all the messages */
let markMessagesAsRead = async (whistle) => {
    let whistleRef = db.collection('cases').doc(whistle.id);
    let dataToUpdate = {
        messages: whistle.messages.map(message => {
            if (message.role=="Υπεύθυνος") {
                message.readByUser = true;
            }
            return message;
        })
    };
    await whistleRef.update(dataToUpdate);
    return true;
};





////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////     DELETE ATTACHMENTS AFTER A CASE IS DELETED     ////////////////////////

// When a case is delete, delete its folder from the Firebase Storage
const afterCaseDeleted = onDocumentDeleted({ region: 'europe-west3' , maxInstances: 2 , concurrency: 4, document: "cases/{caseID}" }, async (event) => {
    let snap = event.data;
    let whistle = snap.data();
    let companyID = whistle.companyID;
    let whistleID = snap.id;
    let folder = companyID + '/' + whistleID + '/';
    let files = await storage.deleteFiles({prefix: folder});
});




export default { getCompany, company, getCase, getUser, storeCase, pushMessageByUser, verifyToken , markMessagesAsRead, afterCaseDeleted };