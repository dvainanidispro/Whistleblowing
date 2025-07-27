// config/handlebars.js
// Handlebars configuration για την εφαρμογή

import i18n from "../locales/i18n.js";

const handlebarsConfig = {
    extname: '.hbs',    // extension for layouts (not views)
    layoutsDir: 'views',
    defaultLayout: 'main',
    helpers: 'views',
    partialsDir: 'views',
    helpers: {
        // Λογικός τελεστής OR - επιστρέφει την πρώτη truthy τιμή
        or: (a, b, c) => a ?? b ?? c,
        
        // String concatenation helper
        concat: (...args) => {
            // Remove the last argument which is the options object
            args.pop();
            return args.join('');
        },
        
        // i18n helper - επιτρέπει τη χρήση {{t "key"}} στα templates
        // Παράδειγμα: {{t "newcase.title"}} ή {{t "user.greeting" name="John"}}
        t: function(key, options) {
            // Παίρνουμε τη γλώσσα από τα locals (που έχει οριστεί στο Language middleware)
            // To options.data.root είναι το αντικείμενο που περνιέται στο render. 
            const lang = options.data.root.lang || 'el';
            
            // Χρησιμοποιούμε per-request language χωρίς να αλλάζουμε το global state
            // By default, η γλώσσα του i18n είναι global, και αναφέρεται σε όλα τα requests!!!
            // Τώρα, σε κάθε request, θα χρησιμοποιούμε την γλώσσα που έχει οριστεί στα locals.
            // Σημείωση, το .hash του handlebars μετατρέπει πχ το name="John" σε { name: "John" } !
            return i18n.t(key, { lng: lang, ...options?.hash });
        },
        
        // Translate Label
        // Label translation helper - για επιλογή από labels (στο language.json)
        // Παράδειγμα: {{tl "status" whistle.status}} θα γίνει labels.status[whistle.status], πχ labels.status.initial
        tl: function(labelType, value, options) {
            const lang = options.data.root.lang || 'el';
            const key = `labels.${labelType}.${value}`;
            const translation = i18n.t(key, { lng: lang, ...options?.hash });
            
            // Αν δεν βρέθηκε μετάφραση (το i18n επιστρέφει το key), επίστρεψε το σκέτο value
            return (translation==key) ? value : translation;
        }
    }
};

export default handlebarsConfig;
