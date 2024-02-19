import {initializeApp} from "firebase-admin/app";
initializeApp();    // Make sure you call initializeApp() before using any of the Firebase services.
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
    console.log("Case stored in Firestore");
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
let getUser = async (userEmail) => {
    return db.collection('users').doc(userEmail).get();
};




/**
 * Push a message to the case in the Firestore database, in the collection 'cases'
 * @param {string} whistleID 
 * @param {string} messageText 
 * @returns {Promise<void>} nothing
 */
let pushMessage = (whistleID, messageText) => {
    let whistleRef = db.collection('cases').doc(whistleID);
    let messageObject = {
        // order: '-',
        text: messageText,
        // server's timespatme, because: FieldValue.serverTimestamp() cannot be used inside of an array! (only on root document?)
        date: Timestamp.now(),      
        role: 'Καταγγέλων',
        // user: 'Ανώνυμος'
    };
    return whistleRef.update({messages: FieldValue.arrayUnion(messageObject)});
    // if there is no whistle with this id, it will throw an error
};



export default { getCompany, getCase, getUser, storeCase, pushMessage };