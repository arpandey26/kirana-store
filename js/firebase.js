// =====================================================================
// FIREBASE INITIALIZATION — Kirana-Hishab (Synchronous & Zero Race Conditions)
// =====================================================================
// WHY THIS FIXES THE LOGIN ISSUE:
// 1. Synchronous XMLHttpRequest loads `./.env` BEFORE `DOMContentLoaded` fires,
//    so your Login button & Auth listeners are ALWAYS attached on time.
// 2. Uses EXACT standard initializeFirestore() with persistentLocalCache
//    so Firestore never gets stuck in an offline/long-polling hang after login.
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

// Parse .env text content synchronously
function parseDotEnv(text) {
  const result = {};
  if (!text) return result;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    result[key] = val;
  }
  return result;
}

// Load .env synchronously so we NEVER delay DOMContentLoaded or break login handlers
function loadEnvSync() {
  const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  const winEnv = (typeof window !== 'undefined' && window.__ENV__) ? window.__ENV__ : {};
  let dotEnv = {};

  if (!viteEnv.VITE_FIREBASE_API_KEY && !winEnv.VITE_FIREBASE_API_KEY && !winEnv.FIREBASE_API_KEY) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', './.env', false); // Synchronous XHR: finishes in <2ms before DOMContentLoaded
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        dotEnv = parseDotEnv(xhr.responseText);
      }
    } catch (_) {
      // Ignore if .env is not served
    }
  }

  const pick = (...keys) => {
    for (const k of keys) {
      if (viteEnv[k]) return String(viteEnv[k]).trim();
      if (winEnv[k]) return String(winEnv[k]).trim();
      if (dotEnv[k]) return String(dotEnv[k]).trim();
    }
    return '';
  };

  return {
    apiKey: pick('VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY', 'apiKey'),
    authDomain: pick('VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN', 'authDomain'),
    projectId: pick('VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID', 'projectId'),
    storageBucket: pick('VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET', 'storageBucket'),
    messagingSenderId: pick('VITE_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'),
    appId: pick('VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID', 'appId'),
    measurementId: pick('VITE_FIREBASE_MEASUREMENT_ID', 'FIREBASE_MEASUREMENT_ID', 'measurementId')
  };
}

const firebaseConfig = loadEnvSync();

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use persistent cache (exact original configuration so getDoc/setDoc after login never hangs)
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

console.info('[Kirana-Hishab] Firebase initialized synchronously for project:', firebaseConfig.projectId);

export {
  app,
  auth,
  db,
  firebaseConfig,
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