import logger from "firebase-functions/logger";
import { getFirestore, Timestamp, FieldValue, Filter } from "firebase-admin/firestore";
const db = getFirestore();

const closedStatuses = ["completed","rejected","cancelled"];

// Διαγραφή υποθέσεων με toBeDeleted < Today
let casesCleanUp = async _=> {

    const today = new Date();
    // Αναζήτηση υποθέσεων
    const query = db.collection("cases").where('toBeDeleted','<',today).where('status','in',closedStatuses);     
    const snapshot = await query.get();
    if (snapshot.size==0){
        logger.log("Δεν βρέθηκαν υποθέσεις προς διαγραφή");
        return;
    }
    logger.warn(`Διαγραφή ${snapshot.size} ${snapshot.size==1?'υπόθεσης':'υποθέσεων'}...`);     
    snapshot.forEach(doc => {
        // console.debug(doc.id, "=>", doc.data().toBeDeleted.toDate().toLocaleDateString());
        logger.log(`Διαγραφή υπόθεσης ${doc.id} - Είχε οριστεί προς διαγραφή για τις ${doc.data().toBeDeleted.toDate().toLocaleDateString()}`);
        // console.debug(doc.ref);
        doc.ref.delete();
    });
}
// casesCleanUp();

// export
export default { casesCleanUp };
