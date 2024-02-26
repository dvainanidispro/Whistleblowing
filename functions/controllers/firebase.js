import firebase from "firebase-admin";
firebase.initializeApp();    // Make sure you call initializeApp() before using any of the Firebase services.
import {getFirestore, Timestamp, FieldValue, Filter} from "firebase-admin/firestore";
const db = getFirestore();




/**
 * Get company details from the Firestore database
 * @param {string} companyID 
 * @returns {Promise<Object>} company details
 */
let getCompany = async (companyID) => {
    let company = await db.collection('companies').doc(companyID).get();
    return company.data()??null;
};


/**
 * Store the case in the Firestore database, in the collection 'cases'
 * @param {*} whistle 
 * @returns {Promise<string>} the id of the stored case
 */
let storeCase = async (whistle) => {
    // if (whistle.isTest) {return null}
    whistle.submittedAt = FieldValue.serverTimestamp(); // firestore's timestamp
    whistle.status = "initial";

    let whistleRef = db.collection('cases').doc(whistle.id);
    await whistleRef.set(whistle);
    console.log("Αποθηκεύτηκε νέα υπόθεση σε Firestore");
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
    if (pin==null) {    // return case without validation           TODO: test this!
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
    return (await whistleRef.get()).data();
};


let verifyToken = async (idToken) => {
    //If it fails, it will throw an error
    try{
        let decodedToken = await firebase.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (e) {
        return null;    
    }
};




export default { getCompany, getCase, getUser, storeCase, pushMessage, verifyToken };