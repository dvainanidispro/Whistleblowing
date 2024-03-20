const db = firebase.firestore();


window.DB = {};


DB.fetchCases = async function(){
    let closed = (App.getParams.closed=='true');
    let companyID = localStorage.getItem('companyID') ?? await App.user.claims('companyID');    //sometimes it is not set yet
    let cases;
    if (!closed){
        cases = await db.collection("cases").where('companyID','==',companyID).where('status','in',['initial','pending','under investigation','under resolution']).orderBy("submittedAt","desc").get();
    } else if (closed){
        Q('~casesDescription').set("Κλειστές υποθέσεις");
        cases = await db.collection("cases").where('companyID','==',companyID).where('status','in',['completed','rejected','cancelled']).get();
    }
    let openCases = [];
    cases.forEach((caseDoc) =>{
        let doc = caseDoc.data();
        openCases.push(doc);
    });
    return openCases;
};


DB.fetchCase = async function(caseID){
    let caseDoc = await db.collection("cases").doc(caseID).get();
    let doc = caseDoc.data();
    DB.checkForUnreadMessages(doc);
    return doc;
};


DB.updateCase = async function(caseDoc){
    let caseID = caseDoc.id;
    let dataToUpdate = {
        title: caseDoc.title??'',
        status: caseDoc.status??'',
        type: caseDoc.type??'',
    }
    await db.collection("cases").doc(caseID).update(dataToUpdate);
    console.debug('Case updated');
    App.showToast('saved');
};


DB.deleteCase = async function(caseDoc){
    //confirmation
    if ( confirm('Είστε σίγουρος ότι θέλετε να διαγράψετε οριστικά την παρούσα υπόθεση; Δεν θα είναι δυνατή η επαναφορά της.') == false ) {return}
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
    console.debug('Sending email to user...');

    fetch(App.notifyUserUrl, {
        method: 'POST',
        mode: 'no-cors', // we do not need an answer
        headers: {
            'Content-Type': 'text/plain',   // application/json fails with no-cors
        },
        body: JSON.stringify({
            userToken: await firebase.auth().currentUser.getIdToken(),
            caseId: whistle
            .id,
        }),
    });
};

/** Επιστρέφει μια φράση η οποία υποδηλώνει αν το μύνημα έχει διαβαστεί από το χρήστη */
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




