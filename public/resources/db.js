const db = firebase.firestore();



firebase.auth().onAuthStateChanged(async function(user) {



            let companyID = await db.collection("users").doc(user.email).get().then(me => {return me.data().companyID});
            let cases = await db.collection("cases").where('companyID','==',companyID).get();

            console.log({cases});

            cases.forEach((caseDoc) =>{
                let doc = caseDoc.data();
                Q("#casesList").insertAdjacentHTML('beforeend',`<li>${doc.id} - ${doc.description}</li>`);
            });




});