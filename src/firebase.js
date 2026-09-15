import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase reads these values from Vite's public environment variables.
const requiredConfig = [
  ['VITE_FIREBASE_API_KEY', 'apiKey', import.meta.env.VITE_FIREBASE_API_KEY],
  ['VITE_FIREBASE_AUTH_DOMAIN', 'authDomain', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN],
  ['VITE_FIREBASE_PROJECT_ID', 'projectId', import.meta.env.VITE_FIREBASE_PROJECT_ID],
  ['VITE_FIREBASE_STORAGE_BUCKET', 'storageBucket', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET],
  ['VITE_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID],
  ['VITE_FIREBASE_APP_ID', 'appId', import.meta.env.VITE_FIREBASE_APP_ID],
];

const firebaseEnvironmentStatus = {
  'Firebase API key present': Boolean(import.meta.env.VITE_FIREBASE_API_KEY),
  'Firebase auth domain present': Boolean(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  'Firebase project ID present': Boolean(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  'Firebase storage bucket present': Boolean(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  'Firebase messaging sender ID present': Boolean(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  'Firebase app ID present': Boolean(import.meta.env.VITE_FIREBASE_APP_ID),
};

Object.entries(firebaseEnvironmentStatus).forEach(([label, present]) => console.info(`${label}: ${present}`));

export const firebaseConfig = Object.fromEntries(requiredConfig.map(([, configKey, value]) => [configKey, value]));
export const firebaseMissingVariables = requiredConfig.filter(([, configKey]) => !firebaseConfig[configKey]).map(([envName]) => envName);

export let auth = null;
export let db = null;
export let firebaseError = null;

if (firebaseMissingVariables.length === 0) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    firebaseError = error;
    console.error('Firebase initialization failed.', error);
  }
} else {
  firebaseError = new Error(`Missing Firebase environment variables: ${firebaseMissingVariables.join(', ')}`);
  console.error(firebaseError.message);
}