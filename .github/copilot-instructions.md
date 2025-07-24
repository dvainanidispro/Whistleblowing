# copilot-instructions.md

## General Style
- Use modern JavaScript (ES6+).
- Use `import`/`export` syntax. Do not use `require` or `module.exports`.
- Prefer concise and clean code, with clear structure over clever one-liners.

## Project Structure
- Follow MVC architecture.
- Directory structure includes:
  - `public/` for static assets.
  - `views/` with subfolder `includes/` for handlebars partials (e.g., header, footer).
  - `controllers/` for controller or middleware logic.
  - `routers/` for route definitions, only if the app is large enough to require it.
  - `models/` for Sequelize models (one model per file).
  - `models.js` to import all other models, define associations, `sync` using `{alter: JSON.parse(process.env.SYNCMODELS)}`, and export all as `Models`.
  - `config/` for configuration files (e.g., handlebars.js, database.js, security.js).

## Backend
- Use `express` and `express-handlebars`.
- Use `helmet`, or other middlewares only if needed.
- Define routes directly in `server.js` or `index.js` for small projects or in `routers/` for larger ones.
- Avoid over-engineering and unnecessary abstraction.

## Database
- Use `Sequelize` with `PostgreSQL` or `Firestore`.
- In the case of MySql, define each model in a separate file in the `models/` folder.
- Relationships and `sequelize.sync()` logic go into `models.js` not into each model file.
- Export a unified `Models` object from `models.js` (e.g., `Models.User`, `Models.Department`).

## Frontend
- Use `Bootstrap 5`.
- Use `Alpine.js` only when interactivity is needed. Avoid any framework that needs compilation (like React).
- Keep frontend logic simple and enhance progressively only when necessary.

## Naming Conventions
- Use `camelCase` for variables and functions.
- Use `PascalCase` for class names, Sequelize models, or "big" objects that contain multiple related functions.
- Use `snake_case` for PostgreSQL table and column names if applicable, but map them using Sequelize's field options.

## Comments & Documentation
- Use `JSDoc` comments for all exported functions, classes, and objects.
- For internal-only functions, use a short inline comment to describe the purpose.
- Prefer self-documenting code over verbose comments.
- Do not overcomment obvious logic.

## Don'ts
- Don't use `require`.
- Don't use frontend frameworks (React, Vue, etc.).
- Don't define model relationships inside individual model files.
- Don't add routes or controller logic directly inside `server.js` for large apps.



# Whistleblowing instructions

## Οδηγίες που αφορούν τη μετάφραση

### Τεχνολογίες
- Χρησιμοποιείται το **i18n** και το **handlebars** για τη μετάφραση των κειμένων

### Δομή αρχείων
- Τα κείμενα μεταφράσεων βρίσκονται στον φάκελο: `functions/locales/translations/{language}.json`
- Υποστηριζόμενες γλώσσες (προς το παρόν): `el.json` (Ελληνικά), `en.json` (Αγγλικά)

### Δομή JSON
Κάθε αρχείο JSON έχει την εξής ιεραρχική δομή:

1. **Γονικά αντικείμενα**: Τα "γονικά" keys του αντικείμενου αντιστοιχούν στα ονόματα των views (σε αλφαβητική σειρά).
2. **Sections**: Αν υπάρχουν HTML sections (<section>) στο view, στο JSON θα γίνεται επιπλέον ομαδοποίηση των μεταφράσεων ανα section (ως υπό-αντικείμενα του γονικού key / view).
3. **Παιδιά αντικείμενα**: Μέσα σε κάθε view (ή section) υπάρχουν τα κείμενα (key-value pairs) των μεταφράσεων.
4. **Σειρά κλειδιών**: Τα keys είναι με τη σειρά που εμφανίζονται στον κώδικα του view (όχι στην οθόνη/browser). 

### Παράδειγμα δομής αρχείου μετάφρασης JSON:
```json
{
  "viewname": {
    "firstText": "Πρώτο κείμενο",
    "secondText": "Δεύτερο κείμενο"
  },
    "viewname2": {
        "section1": {
            "text1": "Κείμενο 1 της ενότητας 1",
            "text2": "Κείμενο 2 της ενότητας 1"
        },
        "section2": {
            "text1": "Κείμενο 1 της ενότητας 2"
        }
    }
}