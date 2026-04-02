// src/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase (Solo una vez)
const app = initializeApp(firebaseConfig);

// Exportar base de datos y autenticación
export const db = getFirestore(app);
export const auth = getAuth(app);

// --- ESTAS SON LAS FUNCIONES CRUD ---
export const agregarRegistro = async (nombreColeccion: string, data: any) => {
  return await addDoc(collection(db, nombreColeccion), data);
};

export const actualizarRegistro = async (nombreColeccion: string, id: string, data: any) => {
  return await updateDoc(doc(db, nombreColeccion, id), data);
};

export const eliminarRegistro = async (nombreColeccion: string, id: string) => {
  return await deleteDoc(doc(db, nombreColeccion, id));
};

// Agrega esto en tus importaciones al inicio si no lo tienes:
// import { getAuth } from 'firebase/auth';

// --- TRUCO PARA CREAR USUARIOS SIN CERRAR SESIÓN DEL ADMIN ---
// Inicializamos una app secundaria con la misma configuración
const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
export const secondaryAuth = getAuth(secondaryApp);