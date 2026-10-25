// =====================================================================
// FIREBASE INITIALIZATION — Kirana-Hishab
// =====================================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCPtAZ2JMPiM6zLc-z_GUQg12M7q15rfIg",
  authDomain: "kirana-store-1fc2b.firebaseapp.com",
  projectId: "kirana-store-1fc2b",
  storageBucket: "kirana-store-1fc2b.firebasestorage.app",
  messagingSenderId: "1033400931050",
  appId: "1:1033400931050:web:f23ab0b1f98ca548b23d93",
  measurementId: "G-G5K9R9Y4TM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use persistent cache (modern API — replaces deprecated enableIndexedDbPersistence)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit
};
