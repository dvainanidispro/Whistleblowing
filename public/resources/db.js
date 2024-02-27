const db = firebase.firestore();


window.DB = {};

DB.fetchCases = async function(){
    let closed = (App.getParams.closed=='true');
    let companyID = localStorage.getItem('companyID') ?? await App.user.claims('companyID');    //sometimes it is not set yet
    let cases;
    if (!closed){
        cases = await db.collection("cases").where('companyID','==',companyID).where('status','in',['initial','pending','under investigation','under resolution']).get();
    } else if (closed){
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
        order: (caseDoc.messages?.length??0)+1,
        text: message,
        date: firebase.firestore.Timestamp.now(),
        role: 'Υπεύθυνος',
        user: (await App.user()).email,
    };
    let dataToUpdate = {
        messages: firebase.firestore.FieldValue.arrayUnion(messageObject)
    }
    await db.collection("cases").doc(caseID).update(dataToUpdate);
    console.debug('Message pushed');
    App.showToast('pushed');
    window.location.reload(); // refresh the page
};


// Notify User (not belongs exactly in the DB object...)
DB.notifyUser ??= async (whistle) => {
    if (whistle.submitter?.email==null || whistle.submitter?.email=="") {return false}
    console.log('Sending email to user...');

    fetch(App.notifyUserUrl, {
        method: 'POST',
        mode: 'no-cors', // we do not need an answer
        headers: {
            'Content-Type': 'text/plain',   // application/json fails with no-cors
        },
        body: JSON.stringify({
            userToken: await firebase.auth().currentUser.getIdToken(),
            caseId: whistle.id,
        }),
    });
};

