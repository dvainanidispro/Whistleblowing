import i18next from 'i18next';
// Import JSON αρχείων απευθείας - υποστηρίζεται στο Node.js 22
import elTranslations from './translations/el.json' with { type: 'json' };
import enTranslations from './translations/en.json' with { type: 'json' };

const resources = {
    el: { translation: elTranslations },
    en: { translation: enTranslations }
};

// Αρχικοποίηση του i18next
i18next.init({
  lng: 'el', // default γλώσσα
  fallbackLng: 'el',
  resources,
  
  // Ρυθμίσεις interpolation για handlebars
  interpolation: {
    escapeValue: false // το handlebars κάνει ήδη escape
  },
  
  // Debug για development
  debug: process.env.NODE_ENV === 'development'
});

// Helper function για χρήση στα handlebars templates
export const t = (key, options = {}) => {
  return i18next.t(key, options);
};

// Export του i18next instance
export default i18next;