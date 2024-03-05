import fs from 'fs';



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
    return (new Timestamp(timestamp.seconds, timestamp.nanoseconds)).toDate();
};
/** If the incoming field does not have meaningfull value, then make it null */
const proper = (value) => {
    return (value==null || value==undefined || value=="") ? null : value;
};


let Mappings = {
    status: {
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
        "before5years": "Περισσότερα από 5 χρόνια πριν",
        "recent5years": "Λιγότερο από 5 χρόνια πριν",
    },
};



/**
 * Set of middleware functions to handle the whistle object.
 */
let Whistle = {

    /**
     * Middleware to constuct the Whistle object from the request body and files. Also, saves the files temorarily.
     * Must be used as such: Whistle.toDbObject.bind(Whistle), because this===undefined inside a middleware
     * @param {*} req 
     * @param {*} res 
     * @returns 
    */
    toDbObject: async function (req, res, next) {

        let whistle = {
            id: uid.rnd(),
            pin: pin.rnd(),
            date: proper(req.body.date) ? req.body.date : Mappings.date[req.body.datetype],
            people: req.body.people,
            description: req.body.description,
            submitter: {
                firstname: proper(req.body.firstname),
                lastname: proper(req.body.lastname),
                email: proper(req.body.email),
                phone: proper(req.body.phone),
                notify: !!req.body.notify, // convert to boolean
            },
            companyID: req.body.company,
            isTest: (req.body.company==req.app.locals.devCompany.id) ,
            origin: req.get('origin'),
            messages: [],
            filenames: [],
        };
    
        req.files.forEach(file => {
            if (file.originalname == "") {return}   // if file exists (req.files always has something)
            fs.writeFileSync(req.app.locals.uploadFolder + file.originalname, file.buffer, (err) => {
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
        let clientWhistle = whistle;
        clientWhistle.status = Mappings.status[whistle.status];
        clientWhistle.messages.forEach(message=>{
            message.date = timestampToDate(message.date).toLocaleDateString();
        });
        // console.log(clientWhistle);
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
            fs.writeFileSync(req.app.locals.uploadFolder + file.originalname, file.buffer, (err) => {
                if (err) throw err;
            }); 
            message.filenames.push(file.originalname);
        });
        res.message = message;
        next();
    },

};


// Whistle.test();



export default Whistle;