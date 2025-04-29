// firebase-config.js (modo compatibilidad)
const firebaseConfig = {
    apiKey: "AIzaSyBDJeze6ibv446maeLso00v5hWx-7o3vpc",
    authDomain: "parquediversiones-5bef1.firebaseapp.com",
    projectId: "parquediversiones-5bef1",
    storageBucket: "parquediversiones-5bef1.firebasestorage.app",
    messagingSenderId: "534239241861",
    appId: "1:534239241861:web:1113c526f8cfe17c996bec"
  };
  
  // Inicializa Firebase en modo compatibilidad
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  