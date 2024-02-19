////////////////    MAIL CONFIG  //////////////// 
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
var transporter = nodemailer.createTransport({
    host: process.env.MAILHOST,
    port: process.env.MAILPORT,
    auth: {
      user: process.env.MAILUSER,
      pass: process.env.MAILPASS
    }
  });

import Firebase from './firebase.js';



/**
 * Sends the email with the whistle data and attachments to the recipients
 * @param {object} whistle The Whistle object
 * @param {string} attachmentsFolder The folder (relative path) where the attachments are stored tempoparily
 */
let aboutNewWhistle = async (whistle, attachmentsFolder) => {

    //TODO: add error handling
    
    // prepair mail with defined transport object
    let message = {
        from: process.env.MAILFROM, // sender address
        to: whistle.company.recipients, // list of recipients
        subject: `Περιστατικό ${whistle.id}`, // Subject line
        //   text: whistle.description, // plain text body
        html: /*html*/`<h1>Περιστατικό ${whistle.id}</h1>
                <h2>Στοιχεία περιστατικού</h2>
                <p>Τύπος περιστατικού: ${whistle.type}</p>
                <p>Ημερομηνία περιστατικού: ${whistle.date || " - "}</p>
                <p>Τοποθεσία περιστατικού: ${whistle.place || " - "}</p>
                <p>E-mail αναφέροντος: ${whistle.submitter.email || " - "}</p>
                <p>Στοιχεία επικοινωνίας αναφέροντος: ${whistle.submitter.contact || " - "}</p>
                <h2>Αναλυτική Περιγραφή</h2>
                <p>${whistle.description}</p>
        `, // html body
        attachments: whistle.fileNames.map(fileName => {
            return {
                filename: fileName,
                path: path.resolve(attachmentsFolder + fileName),   // resolve = relative to absolute path
            }
        }),
    };

    // send email
    await transporter.sendMail(message);
    console.log("Στάλθηκε email σε εταιρία");
    
    //delete attachments
    whistle.fileNames.forEach(fileName => {
        fs.unlinkSync(attachmentsFolder + fileName);
    });
    // console.log("Attachments deleted");
}


/**
 * Sends email to the company notifying about the new Message from the user
 * @param {string} whistleID The Whistle ID
 */
let aboutNewUserMessage = async (whistle) => {
    let message = {
        from: process.env.MAILFROM, // sender address
        to: whistle.company.recipients, // list of recipients
        subject: `Νέο μήνυμα για το περιστατικό ${whistle.id}`, // Subject line
        html: /*html*/`<h1>Περιστατικό ${whistle.id}</h1>
                <p>Παρακαλώ κάντε είσοδο στην κονσόλα διαχείρισης για να διαβάσετε το νέο μήνυμα που λάβατε.</p>
        `, // html body
    }

    // send email
    await transporter.sendMail(message);
    console.log("Στάληθκε email σε εταιρία"); 
};



/**
 * Sends email to the company notifying about the new Message from the user
 * @param {string} whistleID The Whistle ID
 */
let aboutNewCompanyMessage = async (whistle) => {

    if (whistle.submitter?.email==null) {
        console.log("Δεν υπάρχει email αναφέροντος προς ειδοποίηση");
        return false;
    }

    let message = {
        from: process.env.MAILFROM, // sender address
        to: whistle.submitter.email, // list of recipients
        subject: `Ενημέρωση για το περιστατικό ${whistle.id}`, // Subject line
        html: /*html*/`<h1>Περιστατικό ${whistle.id}</h1>
                <p>Υπάρχει νέα ενημέρωση για το περιστατικό ${whistle.id} </p>
                <p>Παρακαλώ, εισέλθετε στη σελίδα με τον αριθμό του περιστατικού και το PIN που γνωρίζετε, για να δείτε τη νέα κατάσταση.</p>
        `, // html body
    }

    // send email
    await transporter.sendMail(message);
    console.log("Στάληθκε email σε καταγγέλλοντα");
    return true
};


export default { aboutNewWhistle , aboutNewUserMessage , aboutNewCompanyMessage };