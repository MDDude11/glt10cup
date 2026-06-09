import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDeihXzKSpbTW-7fDP-73o51Fu9oYS9GRo",
  authDomain: "glt10cup-web.firebaseapp.com",
  databaseURL: "https://glt10cup-web-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "glt10cup-web",
  storageBucket: "glt10cup-web.firebasestorage.app",
  messagingSenderId: "321211536054",
  appId: "1:321211536054:web:cfb54af2fd80bfe4a30c17"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);

export default app;