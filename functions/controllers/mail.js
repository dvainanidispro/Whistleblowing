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

//////////////////    FIREBASE CONFIG    ////////////////
import Firebase from './firebase.js';



/**
 * Sends the email with the whistle data and attachments to the recipients
 * @param {object} whistle The Whistle object
 * @param {string} attachmentsFolder The folder (relative path) where the attachments are stored tempoparily
 */
let aboutNewWhistle = async (whistle, attachmentsFolder) => {

    //TODO: add error handling

    let company = await Firebase.getCompany(whistle.companyID);
    
    // prepair mail with defined transport object
    let mail = {
        from: process.env.MAILFROM, // sender address
        to: company.recipients, // list of recipients
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
    await transporter.sendMail(mail);
    console.log("Στάλθηκε email σε εταιρία");
    
    //delete attachments
    whistle.fileNames.forEach(fileName => {
        fs.unlinkSync(attachmentsFolder + fileName);
    });
    // console.log("Attachments deleted");
}


/**
 * Sends email to the company notifying about the new Message from the user
 * @param {object} whistle The Whistle object
 */
let aboutNewUserMessage = async (whistle, attachmentsFolder) => {

    // prepair mail
    let company = await Firebase.getCompany(whistle.companyID);
    let message = whistle.messages[whistle.messages.length-1];   // the last message
    let mail = {
        from: process.env.MAILFROM, // sender address
        to: company.recipients, // list of recipients
        subject: `Νέο μήνυμα για το περιστατικό ${whistle.id}`, // Subject line
        html: /*html*/`<h1>Περιστατικό ${whistle.id} - Νέο μήνυμα</h1>
                <h2>Νέο μήνυμα από χρήστη</h2>
                <p>${message.text}</p>
        `, // html body
        attachments: message.fileNames.map(fileName => {
            return {
                filename: fileName,
                path: path.resolve(attachmentsFolder + fileName),   // resolve = relative to absolute path
            }
        }),
    }

    // send email
    await transporter.sendMail(mail);
    console.log("Στάλθηκε email σε εταιρία");

    //delete attachments
    message.fileNames.forEach(fileName => {
        fs.unlinkSync(attachmentsFolder + fileName);
    });
};



/**
 * Sends email to the user notifying about the new update from the company
 * @param {object} whistle The Whistle object
 */
let aboutCaseUpdate = async (whistle) => {

    if (whistle.submitter?.email==null || whistle.submitter?.email=="") {   // usually =="" if not set
        console.log("Δεν υπάρχει email αναφέροντος προς ειδοποίηση");
        return false;
    }

    let message = {
        from: process.env.MAILFROM, // sender address
        to: whistle.submitter.email, // one recipient
        subject: `Ενημέρωση για το περιστατικό ${whistle.id}`, // Subject line
        html: /*html*/`<h1>Περιστατικό ${whistle.id}</h1>
                <p>Υπάρχει νέα ενημέρωση για το περιστατικό ${whistle.id} </p>
                <p>Παρακαλώ, εισέλθετε στη σελίδα με τον αριθμό του περιστατικού και το PIN που γνωρίζετε, για να δείτε τη νέα κατάσταση.</p>
        `, // html body
    }

    // send email
    await transporter.sendMail(message);
    console.log("Στάλθηκε email σε καταγγέλλοντα");
    return true
};


export default { aboutNewWhistle , aboutNewUserMessage , aboutCaseUpdate };