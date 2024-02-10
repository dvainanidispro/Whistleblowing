import fs from 'fs';
import Firebase from './firebase.js';

//////////////    UNIQUE     ///////////////
import ShortUniqueId from 'short-unique-id';
const uid = new ShortUniqueId({
    dictionary: 'number',
    length: 16
});
const pin = new ShortUniqueId({
    dictionary: 'number',
    length: 4
});





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
            isTest: (req.body.company==req.app.locals.devCompanyID) ,
            company: (req.body.company==req.app.locals.devCompanyID) ? {recipient: process.env.MAILTO} : await Firebase.getCompany(req.body.company),
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

    viewFormat: (whistle) => {


    },



};





export default Whistle;