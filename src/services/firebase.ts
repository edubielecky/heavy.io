import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyDHyeF1KlEsItkS3Tug_XKXtzK2yt5crDs",
  authDomain: "heavy-io.firebaseapp.com",
  projectId: "heavy-io",
  storageBucket: "heavy-io.firebasestorage.app",
  messagingSenderId: "422393549668",
  appId: "1:422393549668:web:8ac8bb44ebbcd53a65a071"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = (() => {
  if (Platform.OS === 'web') {
    try {
      return getAuth(app);
    } catch {
      return initializeAuth(app);
    }
  } else {
    try {
      // @ts-ignore
      const { getReactNativePersistence } = require('firebase/auth');
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    } catch {
      return getAuth(app);
    }
  }
})();

export const googleProvider = new GoogleAuthProvider();

import { getFirestore, Firestore } from 'firebase/firestore';

export const firestore: Firestore = getFirestore(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
};
