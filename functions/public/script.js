// initialize firebase
const firebaseConfig = {
    apiKey: "AIzaSyDyvEN3cFnuNQJ_tkeSfqUJSXUf7yjS06U",
    authDomain: "whistleblowing-app.firebaseapp.com",
    projectId: "whistleblowing-app",
    storageBucket: "whistleblowing-app.appspot.com",
    messagingSenderId: "430245849423",
    appId: "1:430245849423:web:63820eef781768b28dbd3a"
};
window.app = firebase.initializeApp(firebaseConfig);
// window.auth = app.auth();
window.db = app.firestore();

// get the get parameters from the url
let url = new URL(window.location.href);
let company = url.searchParams.get("company");

// get the company data from firestore
// if (!companyid) {
//   console.error("No companyid in the url");
// } else {
//     let company = await firebase.firestore().collection("companies").doc(companyid).get();
//     company = company.data();
//     console.log(company);
// }
