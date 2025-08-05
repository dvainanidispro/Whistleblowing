//////////////           FILES         ///////////////
/** The folder with the temporary attachments */
import fs from 'fs';
import config from '../config/config.js';
let attachmentsFolder = config.attachmentsFolder;


//////////////          UNIQUE         ///////////////
import ShortUniqueId from 'short-unique-id';
const uid = new ShortUniqueId({
    dictionary: 'number',
    length: 16
});
const pin = new ShortUniqueId({
    dictionary: 'number',
    length: 4
});

//////////////    FIRESTORE FIELDS    ///////////////
import {Timestamp} from "firebase-admin/firestore";
/** Converts a Firestore timestamp to a JavaScript date */
const timestampToDate = (timestamp) => {
    return (new Timestamp(timestamp._seconds, timestamp._nanoseconds)).toDate();
};
/** If the incoming field does not have meaningful value, then make it null (instead of empty string) */
const proper = (value) => {
    return (value==null || value==undefined || value=="") ? null : value;
};

//////////////        MAPPINGS       ///////////////
/** Αντιστοίχιση των πεδίων σε "ανθρώπινη" περιγραφή κατά την υποβολη (όχι κατά το view). TODO: Να αφαιρεθεί */
let Mappings = {
    status: {       // Πλέον δεν χρησιμοποιείται, γιατί γίνεται στο view με i18n
        "initial": "Αρχική - Ο υπεύθυνος δεν έχει λάβει γνώση της καταγγελίας",
        "pending": "Υπό επεξεργασία - Η υπόθεση έχει γνωστοποιηθεί αλλά δεν έχουν ξεκινήσει ακόμα ενέργειες διερεύνησης",
        "under investigation": "Υπο διερεύνηση - Ερευνάται η εγκυρότητα της καταγγελίας",
        "under resolution": "Υπο επίλυση - Η υπόθεση έχει διερευνηθεί και γίνονται ενέργειες αποκατάστασης",
        "completed": "Ολοκληρώθηκε",
        "rejected": "Απορρίφθηκε",
        "cancelled": "Ακυρώθηκε",
    },
    date: {
        "specificdate": "Συγκεκριμένη Ημερομηνία",
        "before5years": "Περισσότερο από 5 χρόνια πριν",
        "recent5years": "Λιγότερο από 5 χρόνια πριν",
        "unknown": "Άγνωστη",
    },
};


//////////////       WHISTLE       ///////////////

/**
 * Set of middleware functions to handle the whistle object.
 */
let Whistle = {

    /**
     * Middleware to construct the Whistle object from the request body and files. Also, saves the files temorarily.
     * Must be used as such: Whistle.toDbObject.bind(Whistle), because this===undefined inside a middleware
     * @param {*} req 
     * @param {*} res 
     * @returns 
    */
    toDbObject: async function (req, res, next) {

        let whistle = {
            id: uid.rnd(),
            pin: pin.rnd(),
            // relationship: req.body.relationship,
            // Aν υπάρχει το date (ημερομηνία), τότε αυτό. Aλλιώς, το datetype (περιγραφή ημερομηνίας), αλλιώς 'unknown'
            date: proper(req.body?.date) ?? proper(req.body?.datetype) ?? 'unknown',
            people: req.body.people,
            status: "initial",
            description: req.body.description,
            submitter: {
                firstname: proper(req.body.firstname),         // Αν μπεί substring, μόνο έτσι: ?.substring(0,50)??null (το undefined απαγορεύεται στο firestore)
                lastname: proper(req.body.lastname),
                email: proper(req.body.email),
                phone: proper(req.body.phone),
                notify: !!req.body.notify, // convert to boolean
            },
            companyID: res.company.id,
            isTest: (req.body.company==config.devCompany.id) ,
            origin: req.get('origin'),
            messages: [],
            filenames: [],          // χρησιμοποιείται όταν ο χρήστης βλέπει την υπόθεσή του
        };
    
        req.files.forEach(file => {
            if (file.originalname == "") {return}   // if file exists (req.files always has something)
            fs.writeFileSync(attachmentsFolder + file.originalname, file.buffer, (err) => {
                if (err) throw err;
            }); 
            whistle.filenames.push(file.originalname);
        });
    
        res.whistle = whistle;
        next();
    },


    toHTMLTable: (whistle) => {
        let table = '<table class="table"><tr><th>Key</th><th>Value</th></tr>';
        for (let key in whistle) {
          if (whistle.hasOwnProperty(key)) {
            let value = whistle[key];
            // Check if the value is an array or an object
            if (typeof value === 'object') {
              value = JSON.stringify(value);
            }
            table += `<tr><td>${key}</td><td>${value}</td></tr>`;
          }
        }
        table += '</table>';
        return table;
    },


    toHumanFormat: function (whistle) {
        // deep clone whistle object. Warning! If we change the status (messages), then it will change the original object!
        let clientWhistle = structuredClone(whistle);
        // clientWhistle.status = Mappings.status[whistle.status];  // Παλιά, η μετατροπή γινόταν εδώ, αλλά τώρα γίνεται στο view (i18n)
        clientWhistle.messages.forEach(message=>{
            message.date = timestampToDate(message.date).toLocaleDateString();
            message.readByCompany = (message.role=="Υπεύθυνος") ? "blank" :
                (message.role=="Καταγγέλλων" && message.readByCompany) ? "Διαβάστηκε" : "Δεν διαβάστηκε";
        });
        return clientWhistle;
    },


    messageConstructor: function (req, res, next) {
        let message = {
            text: req.body.newmessage,
            caseId: req.body.caseId,
            filenames: [],
        };
        req.files.forEach(file => {
            if (file.originalname == "") {return}   // if file exists (req.files always has something)
            fs.writeFileSync(attachmentsFolder + file.originalname, file.buffer, (err) => {
                if (err) throw err;
            }); 
            message.filenames.push(file.originalname);
        });
        res.message = message;
        next();
    },


    deleteAttachments: async function (whistleOrMessage) {
        let filenames = whistleOrMessage.filenames;
        filenames.forEach(filename => {
            try{
                fs.unlink(attachmentsFolder + filename, _=>{});
            } catch (e) {console.error(e)}
        });
    }
};


export default Whistle;