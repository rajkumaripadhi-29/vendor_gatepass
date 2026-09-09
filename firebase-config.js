import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBI-e0M9144YIrw8ubcf0WXfOn27p78EMM",
  authDomain: "gatepass-abf03.firebaseapp.com",
  projectId: "gatepass-abf03",
  storageBucket: "gatepass-abf03.firebasestorage.app",
  messagingSenderId: "67933291624",
  appId: "1:67933291624:web:3eab2e8d996c365de8e7dd",
  measurementId: "G-TMKXSDM5CL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Session ends when the browser tab/window is closed; survives page refresh.
const authPersistenceReady = setPersistence(auth, browserSessionPersistence);

export { app, auth, db, authPersistenceReady };
