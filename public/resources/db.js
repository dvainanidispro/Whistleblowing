const db = firebase.firestore();


window.DB = {};

let showToast = (toastID) => {
    (new bootstrap.Toast( Q(`#${toastID}`) )).show();
};

DB.fetchOpenCases = async function(){
    let user = await App.user();
    let companyID = await db.collection("users").doc(user.email).get().then(me => {return me.data().companyID});
    let cases = await db.collection("cases").where('companyID','==',companyID).get();
    let openCases = [];
    cases.forEach((caseDoc) =>{
        let doc = caseDoc.data();
        openCases.push(doc);
    });
    return openCases;
    // return cases.map((doc) => doc.data());
};

DB.fetchCase = async function(caseID){
    let caseDoc = await db.collection("cases").doc(caseID).get();
    let doc = caseDoc.data();
    return doc;
}

DB.updateCase = async function(caseDoc){
    let caseID = caseDoc.id;
    let dataToUpdate = {
        title: caseDoc.title??'',
        status: caseDoc.status??'',
        type: caseDoc.type??'',
    }
    await db.collection("cases").doc(caseID).update(dataToUpdate);
    console.debug('Case updated');
    try{showToast('saved')}catch(e){console.error(e)};
}

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
    try{showToast('pushed')}catch(e){console.error(e)};
    window.location.reload(); // refresh the page
};


// firebase.auth().onAuthStateChanged(async function(user) {

//     if (Q("#openCases")){
 

//         let companyID = await db.collection("users").doc(user.email).get().then(me => {return me.data().companyID});
//         let cases = await db.collection("cases").where('companyID','==',companyID).get();
        
//         console.log({cases});
        
//         cases.forEach((caseDoc) =>{
//             let doc = caseDoc.data();
//             Q("#openCases").insertAdjacentHTML('beforeend',`<li>${doc.id} - ${doc.description} - ${doc.date}</li>`);
//         });
        

//     } // if Q("#openCases")


// });