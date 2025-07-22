// controllers/language.js

const supportedLanguages = ['el', 'en']; 
const defaultLanguage = supportedLanguages[0];

const languageMiddleware = (req, res, next) => {
    
    // Πρώτα έλεγξε στα GET parameters (query)
    let lang = req.query.lang;

    // Αν δεν υπάρχει στο query, έλεγξε το cookie
    if (!lang) {
        lang = req.cookies.language;
    }

    // Έλεγχος εγκυρότητας
    if (!supportedLanguages.includes(lang)) {
        lang = defaultLanguage;
    }

    // Αν ήρθε από query και είναι έγκυρο, αποθήκευσέ το στο cookie
    if (req.query.lang && supportedLanguages.includes(req.query.lang)) {
        res.cookie('language', lang, {
            maxAge: 1000 * 60 * 60 * 24 * 365, // 1 χρόνος
            httpOnly: false, // Αν θες να είναι διαθέσιμο client-side
            sameSite: 'lax', // Αρκετά ασφαλές default
        });
    }
    // Αν τυχόν ήρθε λάθος (είτε απο query, είτε από cookie), θα στείλει την προεπιλεγμένη γλώσσα χωρίς να αποθηκεύσει τίποτα στο cookie

    // Αποθήκευση στο response object
    res.lang = lang;

    // console.log(lang);
    
    next();
};

export default languageMiddleware;
