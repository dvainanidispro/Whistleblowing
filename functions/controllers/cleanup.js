import firebase from "firebase-admin";
import { getFirestore, Timestamp, FieldValue, Filter } from "firebase-admin/firestore";
firebase.initializeApp();    // Make sure you call initializeApp() before using any of the Firebase services.
const db = getFirestore();