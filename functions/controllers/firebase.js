import firebase from "firebase-admin";
import {getFirestore, Timestamp, FieldValue, Filter} from "firebase-admin/firestore";
firebase.initializeApp();    // Make sure you call initializeApp() before using any of the Firebase services.
const db = getFirestore();
import { getStorage } from 'firebase-admin/storage';
const storage = getStorage().bucket();


/** The folder with the temporary attachments */
import config from './config.js';
let attachmentsFolder = config.attachmentsFolder;

/** Map to cache things  */
let DimCache = new Map();
// DimCache.set("bkueHt76TQiUW7G8p1BK",{       // for testing only
//     id: "bkueHt76TQiUW7G8p1BK",
//     inbox: "whistle@computerstudio.gr",
//     name: "Computer Studio Α.Ε.",
//     phone: "2109761865"
// });


/**
 * Get company details from the Firestore database
 * @param {string} companyID 
 * @returns {Promise<Object>} company details or null
 */
let getCompany = async (companyID) => {
    if (companyID==null) {return null}
    if (DimCache.has(companyID)) {return DimCache.get(companyID)};    // get from cache
    let company = await db.collection('companies').doc(companyID).get();
    company = company.data()??null;
    if (company) {company.id = companyID};
    DimCache.set(companyID,company);    // store in cache, even if null
    //NOTE: if not a google cloud function, then setTimout to delete from cache
    return company;
};
 

/** 
 * Middleware to get the company details from the Firestore database or the cache
 * @returns 
 */
let company = async (req, res, next) => {
    let companyID = req.query.company;
    // get from cache or from Firestore
    let company = await getCompany(companyID);   
    if (company==null) {
        res.status(404).send("Η εταιρεία δεν βρέθηκε.");
        return;
    }
    res.company = company;
    next();
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
        let storagePath = attachmentsFolder + filename; // it is not a genuine path, but a filename string
        return storage.upload(storagePath, {destination: companyID + '/' + whistleID + '/' + filename});
    });
    await Promise.all(promises);
    console.log("Αποθηκεύτηκαν τα συνημμένα στο Firebase Storage");
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
    console.log("Αποθηκεύτηκε νέα υπόθεση σε Firestore");
    await storeAttachments(whistle.filenames, whistle.id, whistle.companyID);
    return whistleRef.id;
}


/**
 * Get the case from the Firestore database, from the collection 'cases'
 * @param {string} id the Whistle ID
 * @param {string} pin If set, then the function validates it before returns
 * @returns {Promise<Object>} the case
 */
let getCase = async (id, pin=null) => {
    id = id.trim();
    let whistle = await db.collection('cases').doc(id).get();
    if (pin==null) {    // return case without validation
        return whistle.data();          
    }
    if (whistle.data()?.pin==pin) {
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
let pushMessage = async (message) => {
    let whistleRef = db.collection('cases').doc(message.caseId);
    let messageObject = {
        // order: '-',
        text: message.text,
        // server's timespatme, because: FieldValue.serverTimestamp() cannot be used inside of an array! (only on root document?)
        date: Timestamp.now(),      
        role: 'Καταγγέλων',
        filenames: message.filenames,
        // user: 'Ανώνυμος'
    };
    // if there is no whistle with this id, it will throw an error
    await whistleRef.update({
        messages: FieldValue.arrayUnion(messageObject),
        filenames: FieldValue.arrayUnion(...message.filenames)
    });   // this returns nothing (void)
    console.log("Αποθηκεύτηκε νέο μήνυμα σε Firestore");
    //TODO: Δεν χρειάζεται ολόκληρο το object, μόνο το id (για την αποστολή email) και το companyID (για τα Attachments). 
    let updatedWhistle = (await whistleRef.get()).data();       
    await storeAttachments(message.filenames, message.caseId, updatedWhistle.companyID);
    return updatedWhistle;
};

/** 
 * Verify the token and return the decoded token
 * @param {string} idToken 
 * @returns {Promise<Object>} the decoded token
 */
let verifyToken = async (idToken) => {
    //If it fails, it will throw an error
    try{
        let decodedToken = await firebase.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (e) {
        return null;    
    }
};




export default { getCompany, company, getCase, getUser, storeCase, pushMessage, verifyToken };