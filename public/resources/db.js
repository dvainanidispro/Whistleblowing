const db = firebase.firestore();


window.DB = {};


DB.fetchCases = async function(all=false){
    let closed = (App.getParams.closed=='true');
    let companyID = localStorage.getItem('companyID') ?? await App.user.claims('companyID');    //sometimes it is not set yet
    let cases;
    if (all) {
        cases = await db.collection("cases").where('companyID','==',companyID).get();
    }
    else if (!closed){
        cases = await db.collection("cases").where('companyID','==',companyID).where('status','in',['initial','pending','under investigation','under resolution']).orderBy("submittedAt","desc").get();
    } else if (closed){
        Q('~casesDescription').set("Κλειστές υποθέσεις");
        cases = await db.collection("cases").where('companyID','==',companyID).where('status','in',['completed','rejected','cancelled']).get();
    }
    let requestedCases = [];
    cases.forEach((caseDoc) =>{
        let doc = caseDoc.data();
        requestedCases.push(doc);
    });
    console.debug(requestedCases);
    return requestedCases;
};

DB.fetchAllCases = async function(){
    // Fetch companies from db
    let companies = await db.collection("companies").get();
    let requestedCompanies = [];
    companies.forEach((companyDoc) => {
        let doc = companyDoc.data();
        doc.id = companyDoc.id;
        requestedCompanies.push(doc);
    });
    console.table(requestedCompanies);

    // Fetch cases form db
    let cases = await db.collection("cases").get();
    let requestedCases = [];
    cases.forEach((caseDoc) =>{
        let doc = caseDoc.data();
        requestedCases.push(doc);
    });
    console.table(requestedCases);
    
    // Group cases by companyID
    let groupedCases = {};
    requestedCases.forEach((caseDoc) => {
        let companyElement = requestedCompanies.find(element => element.id === caseDoc.companyID);
        let company = companyElement ? companyElement.name : caseDoc.companyID; // fallback to ID if company not found
        if (!groupedCases[company]) {
            groupedCases[company] = [];
        }
        groupedCases[company].push(caseDoc);
    });
    
    // Sort cases in each company group by submittedAt in descending order
    Object.keys(groupedCases).forEach(company => {
        groupedCases[company].sort((a, b) => {
            // Handle Firestore timestamps - convert to Date for comparison
            let dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
            let dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt);
            return dateB - dateA; // Descending order (newest first)
        });
    });
    
    console.debug(groupedCases);
    return groupedCases;
};


DB.fetchCase = async function(caseID){
    let caseDoc = await db.collection("cases").doc(caseID).get();
    let doc = caseDoc.data();
    DB.checkForUnreadMessages(doc);
    window.thisCase = doc;
    return doc;
};


DB.updateCase = async function(caseDoc){
    try{
        let caseID = caseDoc.id;
        const toBeDeleted = caseDoc.toBeDeleted;
        window.toBeDeleted = toBeDeleted;
        
        // validation
        if (DB.status[caseDoc.status].type=="closed" && (!toBeDeleted||toBeDeleted==0)) {
            alert('Παρακαλώ, επιλέξτε ημερομηνία αυτόματης διαγραφής υπόθεσης.');
            return;
        } 
        
        // update object
        let dataToUpdate = {
            title: caseDoc.title??'',
            status: caseDoc.status??'',
        }
        if (DB.status[caseDoc.status].type=="open"){
            dataToUpdate.toBeDeleted = null;
        } else if (!isNaN(new Date(toBeDeleted))) {              // αν φτάσει εδώ, τότε είναι closed με toBeDeleted
            // To toBeDeleted μπορεί να είναι είτε JavaScript "Date/Number" που ορίστικε τώρα (και αποθηκεύεται με το new Date())...
            dataToUpdate.toBeDeleted = new Date(toBeDeleted);
        } else {
            // ...είτε το toBeDeleted είναι το Firestore Timestamp που ήρθε (το οποίο εμφανίζεται με το toDate() γενικά)
            // Αυτή η περίπτωση συμβαίνει όταν κάποιος ανοιγοκλείνει υποθέσεις χωρίς refresh ξεκινώντας από μια κλειστή υπόθεση. 
            dataToUpdate.toBeDeleted = toBeDeleted;
        }
        // console.debug(dataToUpdate);
        
        // update Firestore
        await db.collection("cases").doc(caseID).update(dataToUpdate);
        console.debug('Case updated');
        App.showToast('saved');
    
    } catch (e){
        console.error(e.message);
        App.showToast('error');
    }
};


DB.deleteCase = async function(caseDoc){
    //confirmation
    if ( confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε οριστικά αυτή την υπόθεση; Δεν θα είναι δυνατή η επαναφορά της.') == false ) {return}
    let caseID = caseDoc.id;
    await db.collection("cases").doc(caseID).delete();
    console.debug('Case deleted');
    sessionStorage.setItem('toast','deleted');
    window.location.href = '/pages/home.html';
};


DB.pushMessage = async function(caseDoc,message){
    let caseID = caseDoc.id;
    let messageObject = {
        text: message,
        date: firebase.firestore.Timestamp.now(),
        role: 'Υπεύθυνος',
        submittedBy: (await App.user()).email,
        readByUser: false,
    };
    let dataToUpdate = {
        messages: firebase.firestore.FieldValue.arrayUnion(messageObject)
    }
    await db.collection("cases").doc(caseID).update(dataToUpdate);
    console.debug('Message pushed');
    App.showToast('pushed');
    window.location.reload(); // refresh the page
};


/** Ενημερώνει το χρήστη για αλλαγή κατάστασης της υπόθεσης (not belongs exactly in the DB object...)  */
DB.notifyUser ??= async (whistle) => {
    if (whistle.submitter?.email==null || whistle.submitter?.email=="") {return false}
    console.debug('Notifying user...');

    fetch(App.notifyUserUrl, {
        method: 'POST',
        mode: 'no-cors', // we do not need an answer
        headers: {
            'Content-Type': 'text/plain',   // application/json fails when no-cors
        },
        body: JSON.stringify({
            userToken: await firebase.auth().currentUser.getIdToken(),
            caseId: whistle.id,
        }),
    }).catch(error => console.warn("CORS error but notification sent"));    // CORS error, but the fetch request is sent
};

/** Επιστρέφει μια φράση η οποία υποδηλώνει αν το μήνυμα έχει διαβαστεί από το χρήστη */
DB.wasRead = (message) => {
    if (message.role=="Καταγγέλλων") {return ""}
    if (message.role=="Υπεύθυνος" && message.readByUser) {return "Διαβάστηκε"}
    if (message.role=="Υπεύθυνος" && !message.readByUser) {return "Δεν έχει διαβαστεί"}
    {return ""}
};


DB.checkForUnreadMessages = async (caseDoc) => {
    let unreadMessages = caseDoc.messages.filter(message => message.role=="Καταγγέλλων" && !message.readByCompany);
    if (unreadMessages.length>0) {
        console.debug('There are unread messages');
        App.showToast("unread");
        return true;
    }
    return false;
};


DB.markMessagesAsRead = async (caseDoc) => {
    let caseID = caseDoc.id;
    // Αν υπάρχουν αδιάβαστα μηνύματα από τον καταγγέλλοντα
    if ( caseDoc.messages.some( message => message.role=="Καταγγέλλων" && !message.readByCompany ) ) {
        let messages = caseDoc.messages.map(message => {
            if (message.role=="Καταγγέλλων") {
                message.readByCompany = true;
            }
            return message;
        });
        let dataToUpdate = {
            messages: messages
        }
        await db.collection("cases").doc(caseID).update(dataToUpdate);
        console.debug('Messages marked as read');
    }
};


DB.getMyCompanyName = async () => {
    if (localStorage.getItem('companyName')) {return localStorage.getItem('companyName')}
    console.debug("Fetching company name from Firestore");
    let companyID = localStorage.getItem('companyID') ?? await App.user.claims('companyID');    //sometimes it is not set yet
    let companyDoc = await db.collection("companies").doc(companyID).get();
    let company = companyDoc.data();
    let companyName = company.name;
    localStorage.setItem('companyName',companyName);
    return companyName;
};
DB.getMyCompanyName().then(companyName => {
    Q('~companyName').set(companyName);
});
// Q('~companyName').set( await DB.getMyCompanyName() );

DB.status = {
    "initial": {value: "initial", text: "Αρχική", description: "Ο υπεύθυνος δεν έχει λάβει γνώση της καταγγελίας", type:"open"},
    "pending": {value: "pending", text: "Υπό επεξεργασία", description: "Η υπόθεση έχει γνωστοποιηθεί αλλά δεν έχουν ξεκινήσει ακόμα ενέργειες διερεύνησης", type:"open"},
    "under investigation": {value: "under investigation", text: "Υπο διερεύνηση", description: "Ερευνάται η εγκυρότητα της καταγγελίας", type:"open"},
    "under resolution": {value: "under resolution", text: "Υπο επίλυση", description: "Η υπόθεση έχει διερευνηθεί και γίνονται ενέργειες αποκατάστασης", type:"open"},
    "rejected": {value: "rejected", text: "Απορρίφθηκε", description: "Το αίτημα απορρίφθηκε ως μη αποδεκτό", type:"closed"},
    "cancelled": {value: "cancelled", text: "Ακυρώθηκε", description: "Ο καταγγέλλων ή ο oργανισμός αποφάσισε να μην διερευνηθεί περαιτέρω", type:"closed"},
    "completed": {value: "completed", text: "Ολοκληρώθηκε", description: "Η υπόθεση ολοκληρώθηκε με επιτυχία", type:"closed"},
};

DB.date = (date) => {
    const dateMap = {
        "specificdate": "Συγκεκριμένη Ημερομηνία",
        "before5years": "Περισσότερο από 5 χρόνια πριν",
        "recent5years": "Λιγότερο από 5 χρόνια πριν",
        "unknown": "Άγνωστη",
    };
    return dateMap[date] ?? date;
};


