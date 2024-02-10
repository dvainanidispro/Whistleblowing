import {initializeApp} from "firebase-admin/app";
initializeApp();
import {getFirestore, Timestamp, FieldValue, Filter} from "firebase-admin/firestore";
const db = getFirestore();


////////////////  GET COMPANY DETAILS FROM FIRESTORE DATABASE  ////////////////
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
 * Get the case from the Firestore database, in the collection 'cases'
 * @param {string} id 
 * @returns {Promise<Object>} the case
 */
let getCase = async (id, pin) => {
    id = id.trim();
    let whistle = await db.collection('cases').doc(id).get();
    console.log(whistle.data());
    if (whistle.data()?.pin==pin) {
        return whistle.data();
    } else {
        return null;
    }
};

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



export default { getCompany, storeCase, getCase, pushMessage };