const db = firebase.firestore();

window.DB = {};

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
    console.debug('Case updated')
}


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