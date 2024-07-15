console.debug("verify.html")


///////////////////////    VARIABLES    ///////////////////////

/** The cookie duration in days */
// let cookieDuration = 3; // days
let redirectPageAfterLogin = "/pages/home.html";
let createLinkPath = "/";


//////////////////////    APP CHECK    ////////////////////////
const appCheck = firebase.appCheck();
appCheck.activate('6LcLAnEpAAAAAEHXuFLhEojhtCCFPsAsDKTS51xO',true);



///////////////////////   VERIFY AND SET COOKIE   ///////////////////////

// Confirm the link is a sign-in with email link.
if (firebase.auth().isSignInWithEmailLink(window.location.href)) {
    // Additional state parameters can also be passed via URL.
    // This can be used to continue the user's intended action before triggering
    // the sign-in operation.
    // Get the email if available. This should be available if the user completes
    // the flow on the same device where they started it.
    var email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
        // Ακόμα κι αν ο χρήστης δεν χρησιμοποίησε την ίδια συσκευή, του δίνουμε την ευκαιρία!!!
        // User opened the link on a different device. To prevent session fixation
        // attacks, ask the user to provide the associated email again. For example:
        email = window.prompt('Παρακαλώ, εισαγάγετε (ξανά) το email σας για να συνδεθείτε');
        window.localStorage.setItem('emailForSignIn', email);
    }


    // The client SDK will parse the code from the link for you.
    firebase.auth().signInWithEmailLink(email, window.location.href)
	
    .then(async (userCreationResponse) => {       // όλα καλά
		// You can access the new user via result.user
        // let accessToken = await userCreationResponse.user.getIdToken().then((accessToken) => {return accessToken});
        // console.debug("Access token: " + accessToken);
        // window.cookies.set("__session", accessToken, cookieDuration);
        Q("#authMessageArea").set("Ανακατεύθυνση (redirecting)...");
        location.href = redirectPageAfterLogin;   
    })

    .catch((error) => {         // Σφάλμα στην επιβεβαίωση του link
        // Some error occurred, you can inspect the code: error.code
        // Common errors could be invalid email and invalid or expired OTPs.
        console.error(error);
        Q("#status").set("Σφάλμα!");

        if (error.message.includes("Unauthorized") || error.message.includes("Μη έγκυρος χρήστης")) {
            Q("#authMessageArea").set(`Δεν είστε ενεργός χρήστης: ${email}. Παρακαλώ, επικοινωνήστε με την τεχνική υποστήριξη.`);
        } else if (error.message.includes("has already been used")) {
            Q("#authMessageArea").innerHTML = `Αυτό το link έχει χρησιμοποιηθεί ή έχει λήξει. Παρακαλώ, δημιουργήστε <a href="${createLinkPath}">νέο link</a>.`;
        } else if (error.message.includes("app-check-token-is-invalid")) {
            Q("#authMessageArea").innerHTML = `App check token is invalid. Παρακαλούμε, μη χρησιμοποιείτε ανώνυμη περιήγηση, κάντε ανανέωση ή δοκιμάστε άλλο browser. Αν το πρόβλημα δεν λυθεί, επικοινωνήστε με την τεχνική υποστήριξη`;
        } else {
            Q("#authMessageArea").set(error.message);
        }


    });

} else {        // Απλώς πάτησε το URL verify.html κάποιος άσχετος που δεν έχει δηλώσει ούτε e-mail
    location.href = "/";
}