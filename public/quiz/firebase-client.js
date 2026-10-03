import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js';
import {getFirestore} from 'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js';
export const app=initializeApp({apiKey:'AIzaSyA1PauDwTDzJ4UfeWjlIBU9IZqL6r67WvI',authDomain:'medguide-34566.firebaseapp.com',projectId:'medguide-34566'},'quiz-owner');
export const auth=getAuth(app), db=getFirestore(app);
