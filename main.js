// main.js - النسخة المحسنة والآمنة

// عناصر DOM
const userEmailSpan = document.getElementById("user-email");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const guestLoginBtn = document.getElementById("guest-login-btn");
const confirmGuestBtn = document.getElementById("confirm-guest-btn");
const guestNameInput = document.getElementById("guest-name");
const guestLoginDiv = document.getElementById("guest-login");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const videoIdInput = document.getElementById("video-id-input");
const setVideoBtn = document.getElementById("set-video-btn");
const playPauseBtn = document.getElementById("play-pause-btn");
const connectionStatus = document.getElementById("connection-status");
const roomNameDisplay = document.getElementById("room-name-display");

let currentUser = null;
let player = null;
let isGuest = false;
let isOnline = navigator.onLine;

// دوال مساعدة
function getYoutubeVideoId(url) {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : (url.length === 11 ? url : null);
}

function getTweetId(url) {
    const match = url.match(/(?:twitter|x)\.com\/(?:\w+)\/status\/(\d+)/);
    return match ? match[1] : null;
}

// تهيئة التطبيق
function initApp() {
    console.log("Starting App in Room:", ROOM_ID);
    roomNameDisplay.textContent = ROOM_ID;
    
    // التحقق من Firebase
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
        alert("خطأ: Firebase غير محمل. تأكد من الاتصال بالإنترنت.");
        return;
    }

    setupAuth();
    setupUI();
    
    // التحقق من مستخدم محفوظ سابقاً
    const savedGuest = localStorage.getItem('guestUser');
    if (savedGuest) {
        try { handleLogin(JSON.parse(savedGuest)); } catch(e) { localStorage.removeItem('guestUser'); }
    }
}

// إعداد المصادقة
function setupAuth() {
    guestLoginBtn.onclick = () => {
        guestLoginDiv.style.display = "flex";
        guestLoginBtn.style.display = "none";
        loginBtn.style.display = "none";
    };

    confirmGuestBtn.onclick = () => {
        const name = guestNameInput.value.trim();
        if (name.length < 2) return alert("الاسم قصير جداً");
        
        const user = {
            uid: 'guest_' + Date.now(),
            displayName: name,
            isAnonymous: true,
            avatar: 'https://j.top4top.io/p_3599hmcgu1.png'
        };
        
        localStorage.setItem('guestUser', JSON.stringify(user));
        handleLogin(user);
    };

    loginBtn.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(err => alert("خطأ في الدخول: " + err.message));
    };

    auth.onAuthStateChanged(user => {
        if (user) {
            handleLogin({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                avatar: user.photoURL,
                isAnonymous: false
            });
        }
    });

    logoutBtn.onclick = () => {
        if (currentUser.isAnonymous) {
            localStorage.removeItem('guestUser');
            window.location.reload();
        } else {
            auth.signOut().then(() => window.location.reload());
        }
    };
}

function handleLogin(user) {
    currentUser = user;
    userEmailSpan.textContent = user.displayName;
    
    // إخفاء أزرار الدخول وإظهار التحكم
    loginBtn.style.display = "none";
    guestLoginBtn.style.display = "none";
    guestLoginDiv.style.display = "none";
    logoutBtn.style.display = "inline-block";
    
    msgInput.disabled = false;
    sendBtn.disabled = false;
    
    setupRoomConnection();
    addSystemMessage(`مرحباً ${user.displayName}! أنت الآن في غرفة: ${ROOM_ID}`);
}

// الاتصال بـ Firestore
function setupRoomConnection() {
    // 1. الاستماع للرسائل
    db.collection("rooms").doc(ROOM_ID).collection("messages")
        .orderBy("createdAt", "asc")
        .limit(50)
        .onSnapshot(snapshot => {
            messagesDiv.innerHTML = ""; // تنظيف لعرض الجديد
            snapshot.forEach(doc => displayMessage(doc.data()));
        }, error => {
            console.error("خطأ الرسائل:", error);
            if(error.code === 'permission-denied') {
                addSystemMessage("⛔ خطأ: لا تملك صلاحية القراءة. تأكد من إعدادات Firestore Rules.");
            }
        });

    // 2. الاستماع لحالة الفيديو
    db.collection("rooms").doc(ROOM_ID)
        .onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (player && data.videoId) {
                    // تشغيل الفيديو فقط إذا اختلف عن الحالي
                    if (player.getVideoData && player.getVideoData().video_id !== data.videoId) {
                        player.loadVideoById(data.videoId);
                    }
                    // مزامنة التشغيل/الإيقاف
                    if (data.isPlaying) player.playVideo();
                    else player.pauseVideo();
                }
            }
        });
}

// عرض الرسالة (النسخة الآمنة)
function displayMessage(msg) {
    const div = document.createElement("div");
    div.className = "message";
    
    // الوقت
    const time = msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}) : '...';

    // الهيكل
    div.innerHTML = `
        <img class="user-avatar" src="${msg.avatar || 'https://j.top4top.io/p_3599hmcgu1.png'}">
        <div class="message-content">
            <div class="message-header">
                <span class="username"></span> <!-- سيتم تعبئتها بأمان -->
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text"></div> <!-- سيتم تعبئتها بأمان -->
        </div>
    `;

    // حقن النص بأمان (Anti-XSS)
    div.querySelector('.username').textContent = msg.user;

    const textDiv = div.querySelector('.message-text');
    
    if (msg.isTwitter && msg.tweetId) {
        textDiv.textContent = "مشاركة تغريدة:";
        if (window.twttr) {
            const tContainer = document.createElement('div');
            tContainer.innerHTML = `<blockquote class="twitter-tweet"><a href="https://twitter.com/x/status/${msg.tweetId}"></a></blockquote>`;
            textDiv.appendChild(tContainer);
            window.twttr.widgets.load(tContainer);
        }
    } else {
        textDiv.textContent = msg.text;
    }

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage() {
    const text = msgInput.value.trim();
    if (!text || !currentUser) return;

    const tweetId = getTweetId(text);
    const msgData = {
        text: text,
        user: currentUser.displayName,
        uid: currentUser.uid,
        avatar: currentUser.avatar,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isTwitter: !!tweetId,
        tweetId: tweetId
    };

    db.collection("rooms").doc(ROOM_ID).collection("messages").add(msgData);
    msgInput.value = "";
}

// التحكم بالفيديو
function setVideo() {
    const url = videoIdInput.value.trim();
    const ytId = getYoutubeVideoId(url);

    if (ytId) {
        // تحديث الفيديو في Firestore للجميع
        db.collection("rooms").doc(ROOM_ID).set({
            videoId: ytId,
            isPlaying: true,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUser: currentUser.displayName
        }, { merge: true }); // merge لعدم مسح البيانات الأخرى
        
        addSystemMessage(`🎬 ${currentUser.displayName} شغّل فيديو يوتيوب`);
        videoIdInput.value = "";
    } else {
        // إذا لم يكن يوتيوب، نرسله كرابط في الشات
        if(url) {
            msgInput.value = url;
            sendMessage();
            alert("⚠️ المشغل يدعم يوتيوب فقط حالياً. تم إرسال الرابط كرسالة.");
        }
    }
}

// تشغيل/إيقاف
playPauseBtn.onclick = () => {
    if (!player) return;
    const state = player.getPlayerState();
    const isPlaying = (state === 1);
    
    db.collection("rooms").doc(ROOM_ID).set({
        isPlaying: !isPlaying
    }, { merge: true });
};

// وظائف إضافية
function addSystemMessage(text) {
    const div = document.createElement("div");
    div.className = "message notification";
    div.innerHTML = `<div class="message-content" style="text-align:center; width:100%; color:#aaa; font-size:12px;">${text}</div>`;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ميزة نسخ الرابط
window.copyRoomLink = function() {
    const url = window.location.protocol + '//' + window.location.host + window.location.pathname + '?room=' + ROOM_ID;
    navigator.clipboard.writeText(url).then(() => {
        alert("تم نسخ رابط الغرفة! أرسله لأصدقائك.");
    }).catch(() => prompt("انسخ الرابط يدوياً:", url));
};

// YouTube API Ready
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%', width: '100%',
        videoId: 'dQw4w9WgXcQ', // فيديو افتراضي
        playerVars: { 'playsinline': 1, 'rel': 0 },
        events: {
            'onReady': (event) => {
                // عند الجاهزية، جلب الفيديو الحالي من Firestore
                if(db) {
                    db.collection("rooms").doc(ROOM_ID).get().then(doc => {
                        if(doc.exists && doc.data().videoId) {
                            event.target.loadVideoById(doc.data().videoId);
                        }
                    });
                }
            }
        }
    });
}

// ربط الأحداث
sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());
setVideoBtn.addEventListener('click', setVideo);

// البدء
document.addEventListener('DOMContentLoaded', initApp);
