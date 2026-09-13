import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyB3icJ6iPnBj1ZctbYEcdiC1HU48mh3URw",
  authDomain: "b-healt.firebaseapp.com",
  projectId: "b-healt",
  storageBucket: "b-healt.firebasestorage.app",
  messagingSenderId: "496989994899",
  appId: "1:496989994899:web:d680f62a5916d170d0b266",
  measurementId: "G-EVJXKTKKTF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

export default app;
