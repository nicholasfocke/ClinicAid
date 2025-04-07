// Importar somente o que é necessário do SDK Firebase
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBVbTjxu5HxAlDJEAwq2NUIOy0aovx8Sxs",
    authDomain: "projeto-crud-bc385.firebaseapp.com",
    projectId: "projeto-crud-bc385",
    storageBucket: "projeto-crud-bc385.firebasestorage.app",
    messagingSenderId: "1030122770138",
    appId: "1:1030122770138:web:23b56cac48c4eb526b1fe3"
};

// Inicializa o Firebase apenas se ainda não foi inicializado
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Configurando persistência de sessão
const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log('Persistência de sessão configurada');
  })
  .catch((error) => {
    console.error('Erro ao configurar persistência de sessão:', error);
  });

// Exportar auth e firestore usando as funções apropriadas
export const firestore = getFirestore(app);
export { auth };
export default app;
