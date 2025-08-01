////////////////    MAIL CONFIG  //////////////// 
// import fs from 'fs';
// import path from 'path';
import nodemailer from 'nodemailer';
let transporter = nodemailer.createTransport({
    host: process.env.MAILHOST,
    port: process.env.MAILPORT,
    auth: {
      user: process.env.MAILUSER,
      pass: process.env.MAILPASS
    }
});


/** The folder with the temporary attachments */
import config from '../config/config.js';
let attachmentsFolder = config.attachmentsFolder;

//////////////////    FIREBASE CONFIG    ////////////////
import Firebase from './firebase.js';



/**
 * Sends the email with the whistle data and attachments to the recipients
 * @param {object} whistle The Whistle object
 * @param {string} attachmentsFolder The folder (relative path) where the attachments are stored tempoparily
 */
let aboutNewWhistle = async (whistle) => {

    //TODO: add error handling (και για το maximum size 10MB)


    let company = await Firebase.getCompany(whistle.companyID);

    // prepare mail with defined transport object
    let mail = {
        from: process.env.MAILFROM, // sender address
        to: company.recipients, // list of recipients
        bcc: JSON.parse(process.env.MAILBCC || '[]'), // add adminRecipients as BCC
        subject: `Whistleblowing - Νέο περιστατικό - ${whistle.id}`, // Subject line
        //   text: whistle.description, // plain text body
        html: /*html*/`<h2>Νέο περιστατικό: ${whistle.id}</h2>
                <p>Παρακαλώ, συνδεθείτε στην κονσόλα διαχείρισης για να δείτε το νέο περιστατικό.</p>
        `, // html body
    };


    // send email
    await transporter.sendMail(mail);
    console.debug("Στάλθηκε email σε Οργανισμό");
    
}


/**
 * Sends email to the company notifying about the new Message from the user
 * @param {object} whistle The Whistle object
 */
let aboutNewUserMessage = async (whistle) => {

    // prepare mail
    let company = await Firebase.getCompany(whistle.companyID);
    let message = whistle.messages[whistle.messages.length-1];   // the last message
    let mail = {
        from: process.env.MAILFROM, // sender address
        to: company.recipients, // list of recipients
        bcc: JSON.parse(process.env.MAILBCC || '[]'), // add adminRecipients as BCC
        subject: `Whistleblowing - Περιστατικό ${whistle.id} - Νέο μήνυμα`, // Subject line
        html: /*html*/`<h2>Υπάρχει νέο μήνυμα για το περιστατικό ${whistle.id}.</h2>
                <p>Παρακαλώ, συνδεθείτε στην κονσόλα διαχείρισης για να δείτε το νέο μήνυμα.</p>
        `, // html body
    };

    // send email
    await transporter.sendMail(mail);
    console.debug("Στάλθηκε email σε Οργανισμό");

};



/**
 * Sends email to the user notifying about the new update from the company
 * @param {object} whistle The Whistle object
 */
let aboutCaseUpdate = async (whistle) => {
    if (whistle.submitter?.email==null || whistle.submitter?.email=="") {   // μπορεί να είναι "" αντί για undefined
        console.debug("Δεν υπάρχει email αναφέροντος προς ειδοποίηση");
        return false;
    }

    let email = {
        from: process.env.MAILFROM, // sender address
        to: whistle.submitter.email, // one recipient only!
        subject: `Whistleblowing - Περιστατικό ${whistle.id}`, // Subject line
        html: /*html*/`<h2>Περιστατικό ${whistle.id}</h2>
                <p>Υπάρχει νέα ενημέρωση ή νέο μήνυμα σχετικά με το περιστατικό ${whistle.id}. </p>
                <p>Παρακαλώ, εισέλθετε στη σελίδα με τον αριθμό του περιστατικού και το PIN που γνωρίζετε, για να δείτε τη νέα κατάσταση.</p>
        `, // html body
    }

    // send email
    await transporter.sendMail(email);
    console.debug("Στάλθηκε email σε καταγγέλλοντα");
    return true
};


export default { aboutNewWhistle , aboutNewUserMessage , aboutCaseUpdate };