import {initializeApp} from "firebase-admin/app";
initializeApp();
import {getFirestore} from "firebase-admin/firestore";
const db = getFirestore();


////////////////  GET COMPANY DETAILS FROM FIRESTORE DATABASE  ////////////////
/**
 * Get company details from the Firestore database
 * @param {string} companyID 
 * @returns {Promise<Object>} company details
 */
let getCompany = async (companyID) => {
    let company = await db.collection('companies').doc(companyID).get();
    return company.data();
};

export default { getCompany };