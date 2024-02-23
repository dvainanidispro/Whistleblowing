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

//////////////    FIRESTORE DATES     ///////////////
import {Timestamp} from "firebase-admin/firestore";
/** Converts a Firestore timestamp to a JavaScript date */
const timestampToDate = (timestamp) => {
    return (new Timestamp(timestamp.seconds, timestamp.nanoseconds)).toDate();
};




/**
 * Set of middleware functions to handle the whistle object.
 */
let Whistle = {
    /**
     * Middleware to constuct the Whistle object from the request body and files. Also, saves the files temorarily.
     * @param {*} req 
     * @param {*} res 
     * @returns 
    */
    constructor: async (req, res, next) => {
        // console.log("here");
        let whistle = {
            id: uid.rnd(),
            pin: pin.rnd(),
            type: req.body.type,
            date: req.body.date,
            place: req.body.place,
            description: req.body.description,
            submitter: {
                email: req.body.email,
                contact: req.body.contact,
            },
            companyID: req.body.company,
            isTest: (req.body.company==req.app.locals.devCompany.id) ,
            origin: req.get('origin'),
            messages: [],
            fileNames: []
        };
    
        req.files.forEach(file => {
            if (file.originalname == "") {return}   // if file exists (req.files always has something)
            fs.writeFileSync(req.app.locals.uploadFolder + file.originalname, file.buffer, (err) => {
                if (err) throw err;
            }); 
            whistle.fileNames.push(file.originalname);
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

    whistleMap: function (status){
        let mapping = {
            "initial": "Αρχική - Ο υπεύθυνος δεν έχει λάβει γνώση της καταγγελίας",
            "pending": "Υπό επεξεργασία - Η υπόθεση έχει γνωστοποιηθεί αλλά δεν έχουν ξεκινήσει ακόμα ενέργειες διερεύνησης",
            "under investigation": "Υπο διερεύνηση - Ερευνάται η εγκυρότητα της καταγγελίας",
            "under resolution": "Υπο επίλυση - Η υπόθεση έχει διερευνηθεί και γίνονται ενέργειες αποκατάστασης",
            "completed": "Ολοκληρώθηκε",
            "rejected": "Απορρίφθηκε",
            "cancelled": "Ακυρώθηκε",
        };
        return mapping[status];
    },

    toHumanFormat: function (whistle) {
        let clientWhistle = whistle;
        clientWhistle.status = this.whistleMap(whistle.status);
        clientWhistle.messages.forEach(message=>{
            message.date = timestampToDate(message.date).toLocaleDateString();
        });
        return clientWhistle;
    }



};





export default Whistle;