
////////////////////////////////     VARIABLES     ////////////////////////////////

window.App ??= {};

let App = window.App;
// let dynamicLinkDomain = window.location.hostname;
App.verificationUrl ??= `${window.location.protocol}//${window.location.hostname}${App.port}/pages/verify.html`;
// App.notifyUserUrl ??= 'http://127.0.0.1:81/whistleblowing-app/europe-west3/whistle/notifyuser';  // for local testing
App.notifyUserUrl ??= 'https://europe-west3-whistleblowing-app.cloudfunctions.net/whistle/notifyuser';



////////////////////////////////   INITIALIZATION   ////////////////////////////////

// firebase.initializeApp(firebaseConfig);      // Δεν το χρειαζόμαστε αν το hosting είναι στο Firebase! Εκτελείται στο /__/firebase/init.js 
const appCheck = firebase.appCheck();
appCheck.activate('6LcLAnEpAAAAAEHXuFLhEojhtCCFPsAsDKTS51xO',true);



////////////////////////////////   EVENTS ON SIGN IN AND SIGN OUT   ////////////////////////////////

/** Returns the user, whenever becomes available (or null if logged off) */
App.user ??= () => {
    return new Promise((resolve, reject) => {
       const unsubscribe = firebase.auth().onAuthStateChanged(user => {
          unsubscribe();
          resolve(user);
       }, reject);
    });
};
App.user.token ??= async () => {
    let user = await App.user();
    return await user.getIdToken();
};
App.user.claims ??= async (claim=null) => {
    let user = await App.user();
    return claim ? (await user.getIdTokenResult()).claims[claim] : (await user.getIdTokenResult()).claims;
};


// sign-in & sign-out
firebase.auth().onAuthStateChanged(async function(user) {
    Q(".loadingUser").show(false);
    if (user) {
        console.debug("User is signed in");
        console.debug({user});
        localStorage.setItem('companyID', await App.user.claims('companyID'));
        App.setCssVariable('--display-if-guest','none');
        App.setCssVariable('--display-if-user','block');
        Q("~email").set(user.email);
        Q("~displayName").set(user.displayName);
        // Q("~displayName").set(user.displayName);
    } else {
        if (App.path != "/") {
            console.warn("User has not signed in. Redirecting...");
            window.location.href = "/"
        } else {
            App.setCssVariable('--display-if-guest','block');
            App.setCssVariable('--display-if-user','none');
        };
    }
});








////////////////////////////////   AUTH BUTTONS   ////////////////////////////////

/** Authentication Link Settings */
const actionCodeSettings = {
    // URL you want to redirect back to.
    // URL must be in the authorized domains list in the Firebase Console.
    url: App.verificationUrl,
    // This must be true.
    handleCodeInApp: true,
    // dynamicLinkDomain: dynamicLinkDomain
  };
  

// Send Authentication Link
 Q(".sendAuthLink").on('click',function(e){

        Q("#sendAuthLink").setAttribute("disabled","");
        Q("#email").setAttribute("disabled","");
        Q("#authMessageArea").set("Δημιουργία συνδέσμου. Παρακαλώ περιμένετε...");
        let email = Q("#email").value;

        firebase.auth().sendSignInLinkToEmail(email, actionCodeSettings)
            .then(() => {
                // The link was successfully sent. Inform the user.
                // Save the email locally so you don't need to ask the user for it again if they open the link on the same device.
                window.localStorage.setItem('emailForSignIn', email);
                Q("#authMessageArea").set("To link στάλθηκε με επιτυχία. Παρακαλώ ελέγξτε το email σας.");
                // analytics.logEvent('send_auth_link', {email});
            })
            .catch((error) => {
                if (error.message.includes("app-check-token-is-invalid")){
                    Q("#authMessageArea").set("App check token is invalid. Παρακαλούμε, μη χρησιμοποιείτε ανώνυμη περιήγηση, κάντε ανανέωση ή δοκιμάστε άλλο browser. Αν το πρόβλημα δεν λυθεί, επικοινωνήστε με την τεχνική υποστήριξη");
                } else {
                    Q("#authMessageArea").set(error.code + error.message);
                }
            }).finally(()=>{
                setTimeout(()=>{
                    Q("#sendAuthLink").removeAttribute("disabled");
                    Q("#email").removeAttribute("disabled");
                },4000)
            });

});

// Sign Out
window.addEventListener('load', function() {
    Q(".signOutBtn").on('click',function(e){
        firebase.auth().signOut().then(() => {
            localStorage.getItem('companyName') && localStorage.removeItem('companyName');
            window.location.href = "/";
        }).catch((error) => {
            console.error(error.message);
        });
    });
});



