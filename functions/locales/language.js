// controllers/language.js

const supportedLanguages = ['el', 'en']; 
const defaultLanguage = supportedLanguages[0];

const languageMiddleware = (req, res, next) => {
    
    // Έλεγξε πρώτα στα GET parameters (query) και μετά στο αποθηκευμένο cookie, αλλιώς undefined
    let lang = req.query.lang ?? req.cookies.language;

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

    //* Αποθήκευση στα locals για χρήση από τα Handlebars templates
    // Το i18n helper θα διαβάζει το options.data.root.lang ως τη γλώσσα που θα χρησιμοποιήσει
    res.locals.lang = lang;

    // Για το εικονίδιο (σημαία)
    res.locals.flag = (lang=="el") ? "en" : "el";
    
    next();
};

export default languageMiddleware;
