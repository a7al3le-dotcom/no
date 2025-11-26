// firebase-config.js - الإصدار المصحح
// استبدل القيم بالقيم الحقيقية من إعدادات مشروعك في Firebase
var firebaseConfig = {
  apiKey: "AIzaSyDttyEjbuC6gzHxuN0IR8yi_9fO-aFyW64",
  authDomain: "studio-4914109762-6a41f.firebaseapp.com",
  projectId: "studio-4914109762-6a41f",
  databaseURL: "https://studio-4914109762-6a41f-default-rtdb.firebaseio.com",
  storageBucket: "studio-4914109762-6a41f.appspot.com",
  messagingSenderId: "134781295069",
  appId: "1:134781295069:web:3c020f46f8fbeaca24fe34"
};

// الانتظار حتى يتم تحميل Firebase
if (typeof firebase === 'undefined') {
  console.error('Firebase not loaded yet');
} else {
  try {
    // تشغيل في المتصفح
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log("Firebase initialized successfully");
    } else {
      firebase.app(); // إذا كان مثبت مسبقاً
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
}

var auth = firebase.auth();
var db   = firebase.firestore();

// اسم الغرفة (يمكنك تغييره أو قراءته من كويري في الرابط)
var ROOM_ID = "default-room-1";