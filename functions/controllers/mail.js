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

/**
 * Sends the email with the whistle data and attachments to the recipient
 * @param {object} whistle The Whistle object
 * @param {string} attachmentsFolder The folder (relative path) where the attachments are stored tempoparily
 */
let SendEmail = async (whistle, attachmentsFolder) => {
    // prepair mail with defined transport object
    let message = {
        from: process.env.MAILFROM, // sender address
        to: whistle.company.recipient, // list of receivers
        subject: `Περιστατικό ${whistle.id}`, // Subject line
        //   text: whistle.description, // plain text body
        html: /*html*/`<h1>Περιστατικό ${whistle.id}</h1>
                <h2>Στοιχεία περιστατικού</h2>
                <p>Τύπος περιστατικού: ${whistle.type}</p>
                <p>Ημερομηνία περιστατικού: ${whistle.date || " - "}</p>
                <p>Τοποθεσία περιστατικού: ${whistle.place || " - "}</p>
                <p>Στοιχεία επικοινωνίας αναφέροντος: ${whistle.contact || " - "}</p>
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
    
    //delete attachments
    whistle.fileNames.forEach(fileName => {
        fs.unlinkSync(attachmentsFolder + fileName);
    });
}

export { SendEmail };