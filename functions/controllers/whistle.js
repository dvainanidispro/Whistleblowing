import fs from 'fs';
import firebase from './firebase.js';

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
 * Middleware to constuct the Whistle object from the request body and files. Also, saves the files temorarily.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
let whistleConstructor = async (req, res, next) => {
    // console.log("here");
    let whistle = {
        id: uid.rnd(),
        pin: pin.rnd(),
        type: req.body.type,
        date: req.body.date,
        place: req.body.place,
        description: req.body.description,
        contact: req.body.contact,
        companyID: req.body.company,
        isTest: (req.body.company==req.app.locals.devCompanyID) ,
        company: (req.body.company==req.app.locals.devCompanyID) ? {recipient: process.env.MAILTO} : await firebase.getCompany(req.body.company),
        origin: req.get('origin'),
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
};


export { whistleConstructor };