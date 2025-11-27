// firebase-config.js - مع ميزة الغرف الديناميكية

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

// تهيئة Firebase
if (typeof firebase === 'undefined') {
  console.error('Firebase library not loaded');
} else {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log("Firebase initialized");
    } else {
      firebase.app();
    }
  } catch (error) {
    console.error("Firebase Init Error:", error);
  }
}

var auth = firebase.auth();
var db   = firebase.firestore();

// --- نظام الغرف الذكي ---
// استخراج اسم الغرفة من الرابط (مثال: mysite.com/?room=cinema)
// إذا لم يوجد اسم، يدخل الجميع إلى "Main-Hall"
const urlParams = new URLSearchParams(window.location.search);
var ROOM_ID = urlParams.get('room') || "Main-Hall";

// تنظيف الاسم (حروف وأرقام فقط)
ROOM_ID = ROOM_ID.replace(/[^a-zA-Z0-9\-_]/g, '');
if (!ROOM_ID) ROOM_ID = "Main-Hall";

console.log("Current Room:", ROOM_ID);
