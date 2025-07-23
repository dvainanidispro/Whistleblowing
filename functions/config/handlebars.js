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
        
        // i18n helper - επιτρέπει τη χρήση {{t "key"}} στα templates
        // Παράδειγμα: {{t "newcase.title"}} ή {{t "user.greeting" name="John"}}
        t: function(key, options) {
            // Παίρνουμε τη γλώσσα από τα locals (που έχει οριστεί στο Language middleware)
            const lang = options.data.root.lang || 'el';
            
            // Χρησιμοποιούμε per-request language χωρίς να αλλάζουμε το global state
            // By default, η γλώσσα του i18n είναι global, και αναφέρεται σε όλα τα requests!!!
            // Τώρα, σε κάθε request, θα χρησιμοποιούμε την γλώσσα που έχει οριστεί στα locals.
            // Σημείωση, το .hash του handlebars μετατρέπει πχ το name="John" σε { name: "John" } !
            return i18n.t(key, { lng: lang, ...options?.hash });
        }
    }
};

export default handlebarsConfig;
