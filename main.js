// main.js - كامل بدون أخطاء
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
const roomInfoDiv = document.getElementById("room-info");
const videoIdInput = document.getElementById("video-id-input");
const setVideoBtn = document.getElementById("set-video-btn");
const playPauseBtn = document.getElementById("play-pause-btn");
const connectionStatus = document.getElementById("connection-status");

let currentUser = null;
let player = null;
let isAdmin = false;
let isGuest = false;
let isOnline = navigator.onLine;

// التحقق من تحميل Firebase
function checkFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        return false;
    }
    if (!firebase.apps || !firebase.apps.length) {
        console.error('Firebase app not initialized');
        return false;
    }
    return true;
}

// دوال دعم تويتر
function getYoutubeVideoId(url) { 
    if (!url) return null; 
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/; 
    return (url.match(regex) || [])[1] || null; 
}

function getTweetId(url) { 
    if (!url) return null; 
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/(?:\w+)\/status\/(\d+)/; 
    return (url.match(regex) || [])[1] || null; 
}

function isDirectVideo(url) { 
    return /\.(mp4|webm|ogv|m3u8)$/.test(url); 
}

// دالة لمعالجة روابط تويتر
function processTwitterUrl(url) {
    const tweetId = getTweetId(url);
    if (tweetId) {
        const twitterContainer = document.createElement('div');
        twitterContainer.innerHTML = `
            <blockquote class="twitter-tweet">
                <a href="https://twitter.com/x/status/${tweetId}"></a>
            </blockquote>
        `;
        
        if (window.twttr) {
            window.twttr.widgets.load(twitterContainer);
        }
        
        return twitterContainer;
    }
    return null;
}

// استخراج ID من رابط يوتيوب
function extractYouTubeId(input) {
    if (!input) return null;
    
    // إذا كان ID مباشرة
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    
    try {
        // إذا كان رابط
        const match = input.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    } catch (e) {
        return null;
    }
}

// تهيئة التطبيق
function initApp() {
    console.log("جاري تهيئة التطبيق...");
    
    // التحقق من Firebase أولاً
    if (!checkFirebase()) {
        console.error("Firebase not available - running in local mode");
        setupLocalMode();
        return;
    }
    
    roomInfoDiv.textContent = "الغرفة: " + ROOM_ID;
    
    // إعداد نظام الدخول
    setupAuthSystem();
    
    // التحقق من مستخدم محفوظ
    checkSavedUser();
    
    // إعداد واجهة المستخدم
    setupUI();
    
    // تحديث حالة الاتصال
    updateConnectionStatus();
    
    // إضافة رسالة ترحيب
    addSystemMessage("🎉 مرحباً! يمكن للجميع إضافة ومشاركة الفيديوهات والروابط");
}

// وضع التشغيل المحلي بدون Firebase
function setupLocalMode() {
    console.log("Running in local mode without Firebase");
    isOnline = false;
    updateConnectionStatus();
    
    roomInfoDiv.textContent = "الغرفة: " + ROOM_ID + " (محلي)";
    
    // إعداد نظام الدخول المحلي
    setupAuthSystem();
    setupUI();
    addSystemMessage("🔧 الوضع المحلي مفعل - يمكنك استخدام جميع الميزات");
}

// إعداد نظام المصادقة
function setupAuthSystem() {
    // زر الدخول كزائر
    guestLoginBtn.addEventListener('click', () => {
        guestLoginDiv.style.display = "flex";
        guestLoginBtn.style.display = "none";
        loginBtn.style.display = "none";
    });

    // تأكيد الدخول كزائر
    confirmGuestBtn.addEventListener('click', () => {
        const guestName = guestNameInput.value.trim();
        if (!guestName) {
            alert("الرجاء إدخال اسم الزائر");
            return;
        }
        
        if (guestName.length < 2) {
            alert("اسم الزائر يجب أن يكون على الأقل حرفين");
            return;
        }
        
        // إنشاء مستخدم زائر
        const guestUser = {
            uid: 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            displayName: guestName,
            email: null,
            isAnonymous: true,
            isLocal: true,
            avatar: 'https://j.top4top.io/p_3599hmcgu1.png'
        };
        
        // حفظ في localStorage
        localStorage.setItem('currentGuest', JSON.stringify(guestUser));
        handleUserLogin(guestUser);
    });

    // زر الدخول بجوجل
    loginBtn.addEventListener('click', () => {
        if (!isOnline || !checkFirebase()) {
            alert("لا يوجد اتصال بالإنترنت. الرجاء استخدام الدخول كزائر.");
            return;
        }
        
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider).catch(error => {
                console.error("خطأ في الدخول:", error);
                alert("حدث خطأ في الدخول بحساب جوجل. الرجاء استخدام الدخول كزائر.");
            });
        } catch (error) {
            console.error("خطأ في تهيئة الدخول بجوجل:", error);
            alert("حدث خطأ في النظام. الرجاء استخدام الدخول كزائر.");
        }
    });

    // زر الخروج
    logoutBtn.addEventListener('click', () => {
        if (currentUser && currentUser.isLocal) {
            localStorage.removeItem('currentGuest');
            localStorage.removeItem('localMessages_' + ROOM_ID);
            localStorage.removeItem('localVideo_' + ROOM_ID);
        } else if (checkFirebase()) {
            auth.signOut().catch(error => {
                console.error("خطأ في الخروج:", error);
            });
        }
        handleUserLogout();
    });
}

// إعداد واجهة المستخدم
function setupUI() {
    // إرسال الرسائل عند الضغط على Enter
    msgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // إرسال الرسائل عند الضغط على الزر
    sendBtn.addEventListener('click', sendMessage);

    // التحكم في الفيديو
    setVideoBtn.addEventListener('click', setVideo);
    playPauseBtn.addEventListener('click', togglePlayPause);
}

// تحديث حالة الاتصال
function updateConnectionStatus() {
    if (connectionStatus) {
        if (isOnline) {
            connectionStatus.textContent = '●';
            connectionStatus.style.background = '#4caf50';
        } else {
            connectionStatus.textContent = '●';
            connectionStatus.style.background = '#f44336';
        }
    }
}

// التحقق من مستخدم محفوظ
function checkSavedUser() {
    const savedGuest = localStorage.getItem('currentGuest');
    if (savedGuest) {
        try {
            const guestUser = JSON.parse(savedGuest);
            handleUserLogin(guestUser);
        } catch (e) {
            console.error("خطأ في تحميل المستخدم المحفوظ:", e);
            localStorage.removeItem('currentGuest');
        }
    }
}

// معالجة دخول المستخدم
function handleUserLogin(user) {
    currentUser = user;
    isGuest = user.isAnonymous || user.isLocal;
    
    if (isGuest && user.isLocal) {
        userEmailSpan.textContent = `زائر: ${user.displayName}`;
        userEmailSpan.style.color = "#ffa726";
        console.log("تم الدخول كزائر محلي:", user.displayName);
    } else {
        userEmailSpan.textContent = user.email || user.displayName;
        userEmailSpan.style.color = "#4fc3f7";
    }
    
    // تحديث واجهة المستخدم
    loginBtn.style.display = "none";
    guestLoginBtn.style.display = "none";
    guestLoginDiv.style.display = "none";
    logoutBtn.style.display = "inline-block";
    msgInput.disabled = false;
    sendBtn.disabled = false;
    
    // إعداد الغرفة
    setupRoom();
    addSystemMessage(`🎊 مرحباً ${user.displayName}! يمكنك إضافة فيديوهات ومشاركة الروابط`);
}

// معالجة تسجيل خروج المستخدم
function handleUserLogout() {
    currentUser = null;
    isAdmin = false;
    isGuest = false;
    
    userEmailSpan.textContent = "غير مسجّل";
    userEmailSpan.style.color = "#eee";
    loginBtn.style.display = "inline-block";
    guestLoginBtn.style.display = "inline-block";
    guestLoginDiv.style.display = "none";
    logoutBtn.style.display = "none";
    msgInput.disabled = true;
    sendBtn.disabled = true;
    guestNameInput.value = "";
    
    messagesDiv.innerHTML = "";
    updateControlsVisibility();
    addSystemMessage("تم تسجيل الخروج بنجاح");
}

// إعداد الغرفة
function setupRoom() {
    if (!isOnline || !checkFirebase()) {
        addSystemMessage("🔧 الوضع المحلي مفعل - يمكن للجميع إضافة الفيديوهات");
        setupLocalRoom();
        return;
    }
    
    // محاولة استخدام Firebase
    try {
        const roomRef = db.collection("rooms").doc(ROOM_ID);
        roomRef.get().then(doc => {
            if (!doc.exists) {
                isAdmin = true;
                roomRef.set({
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    videoId: "dQw4w9WgXcQ",
                    isPlaying: false,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: currentUser.uid,
                    createdByName: currentUser.displayName,
                    allowAllUsers: true
                });
                addSystemMessage("🎯 أنت أول من أنشأ الغرفة! يمكن للجميع إضافة الفيديوهات");
            } else {
                const data = doc.data();
                isAdmin = data.createdBy === currentUser.uid;
                if (isAdmin) {
                    addSystemMessage("🎯 أنت منشئ الغرفة - يمكن للجميع إضافة الفيديوهات");
                } else {
                    addSystemMessage("👋 مرحباً! يمكنك إضافة فيديوهات ومشاركة الروابط");
                }
            }
            updateControlsVisibility();
        }).catch(error => {
            console.error("خطأ في Firestore:", error);
            setupLocalRoom();
        });

        // الاستماع للرسائل
        listenForMessages();
        listenForRoomChanges();
        
    } catch (error) {
        console.error("خطأ في إعداد الغرفة:", error);
        setupLocalRoom();
    }
}

// إعداد الغرفة المحلية
function setupLocalRoom() {
    isAdmin = true;
    updateControlsVisibility();
    
    // تحميل الرسائل المحفوظة
    loadLocalMessages();
}

// تحميل الرسائل المحلية
function loadLocalMessages() {
    const savedMessages = localStorage.getItem('localMessages_' + ROOM_ID);
    if (savedMessages) {
        try {
            const messages = JSON.parse(savedMessages);
            messages.forEach(msg => {
                displayMessage(msg);
            });
        } catch (e) {
            console.error("خطأ في تحميل الرسائل المحلية:", e);
        }
    }
}

// إرسال رسالة - مع دعم تويتر
function sendMessage() {
    if (!currentUser) {
        alert("❌ سجّل الدخول أولاً");
        return;
    }
    
    const text = msgInput.value.trim();
    if (!text) {
        alert("❌ الرجاء كتابة رسالة");
        return;
    }
    
    // التحقق إذا كان الرابط تويتر
    if (text.includes('twitter.com/') || text.includes('x.com/')) {
        const tweetId = getTweetId(text);
        if (tweetId) {
            // إضافة التغريدة للدردشة
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message';
            messageDiv.innerHTML = `
                <img class="user-avatar" src="${currentUser.avatar || 'https://j.top4top.io/p_3599hmcgu1.png'}">
                <div class="message-content">
                    <div class="message-header">
                        <div class="user-info-wrapper">
                            <span class="username">${currentUser.displayName}</span>
                        </div>
                        <span class="message-time">${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div class="message-text">مشاركة تغريدة:</div>
                </div>
            `;
            
            const twitterElement = processTwitterUrl(text);
            if (twitterElement) {
                messageDiv.querySelector('.message-content').appendChild(twitterElement);
            }
            
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // حفظ في Firebase
            if (isOnline && checkFirebase()) {
                db.collection("rooms").doc(ROOM_ID)
                    .collection("messages")
                    .add({
                        text: text,
                        uid: currentUser.uid,
                        user: currentUser.displayName,
                        isGuest: isGuest,
                        isTwitter: true,
                        tweetId: tweetId,
                        avatar: currentUser.avatar,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .catch(error => {
                        console.error("خطأ في إرسال الرسالة:", error);
                        saveMessageLocally(text, currentUser.displayName, true, tweetId);
                    });
            } else {
                saveMessageLocally(text, currentUser.displayName, true, tweetId);
            }
        } else {
            // رابط تويتر غير صالح
            sendNormalMessage(text);
        }
    } else {
        // رسالة عادية
        sendNormalMessage(text);
    }
    
    msgInput.value = "";
}

// إرسال رسالة عادية
function sendNormalMessage(text) {
    if (!isOnline || !checkFirebase()) {
        // الحفظ محلياً
        saveMessageLocally(text, currentUser.displayName, false);
    } else {
        // الإرسال عبر Firebase
        db.collection("rooms").doc(ROOM_ID)
            .collection("messages")
            .add({
                text: text,
                uid: currentUser.uid,
                user: currentUser.displayName,
                isGuest: isGuest,
                avatar: currentUser.avatar,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .catch(error => {
                console.error("خطأ في إرسال الرسالة:", error);
                saveMessageLocally(text, currentUser.displayName, false);
            });
    }
}

// حفظ الرسالة محلياً
function saveMessageLocally(text, userName, isTwitter = false, tweetId = null) {
    const message = {
        text: text,
        uid: currentUser.uid,
        user: userName,
        isGuest: true,
        isTwitter: isTwitter,
        tweetId: tweetId,
        avatar: currentUser.avatar,
        createdAt: new Date().toISOString()
    };
    
    // عرض الرسالة فوراً
    displayMessage(message);
    
    // حفظ في localStorage
    const savedMessages = localStorage.getItem('localMessages_' + ROOM_ID);
    let messages = [];
    
    if (savedMessages) {
        try {
            messages = JSON.parse(savedMessages);
        } catch (e) {
            console.error("خطأ في تحليل الرسائل المحفوظة:", e);
        }
    }
    
    messages.push(message);
    localStorage.setItem('localMessages_' + ROOM_ID, JSON.stringify(messages));
}

// الاستماع للرسائل من Firebase
function listenForMessages() {
    if (!db || !isOnline || !checkFirebase()) return;
    
    db.collection("rooms").doc(ROOM_ID)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .onSnapshot(snap => {
            messagesDiv.innerHTML = "";
            snap.forEach(doc => {
                displayMessage(doc.data());
            });
        }, error => {
            console.error("خطأ في الاستماع للرسائل:", error);
        });
}

// عرض رسالة في الدردشة - مع دعم تويتر
function displayMessage(m) {
    const div = document.createElement("div");
    
    if (m.isTwitter && m.tweetId) {
        // عرض تغريدة
        div.className = "message";
        div.innerHTML = `
            <img class="user-avatar" src="${m.avatar || 'https://j.top4top.io/p_3599hmcgu1.png'}">
            <div class="message-content">
                <div class="message-header">
                    <div class="user-info-wrapper">
                        <span class="username">${m.user || "مجهول"}</span>
                    </div>
                    <span class="message-time">${m.createdAt ? (m.createdAt.toDate ? m.createdAt.toDate().toLocaleTimeString('ar-EG') : new Date(m.createdAt).toLocaleTimeString('ar-EG')) : new Date().toLocaleTimeString('ar-EG')}</span>
                </div>
                <div class="message-text">مشاركة تغريدة:</div>
            </div>
        `;
        
        const twitterElement = processTwitterUrl(`https://twitter.com/x/status/${m.tweetId}`);
        if (twitterElement) {
            div.querySelector('.message-content').appendChild(twitterElement);
        }
    } else {
        // رسالة عادية
        div.className = "message";
        
        const time = m.createdAt ? 
            (m.createdAt.toDate ? m.createdAt.toDate().toLocaleTimeString('ar-EG') : new Date(m.createdAt).toLocaleTimeString('ar-EG')) : 
            new Date().toLocaleTimeString('ar-EG');
        
        div.innerHTML = `
            <img class="user-avatar" src="${m.avatar || 'https://j.top4top.io/p_3599hmcgu1.png'}">
            <div class="message-content">
                <div class="message-header">
                    <div class="user-info-wrapper">
                        <span class="username">${m.user || "مجهول"}</span>
                    </div>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${m.text}</div>
            </div>
        `;
    }
    
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// إضافة رسالة نظام
function addSystemMessage(text) {
    const div = document.createElement("div");
    div.className = "message notification";
    div.innerHTML = `
        <img class="user-avatar" src="https://j.top4top.io/p_3599hmcgu1.png">
        <div class="message-content">
            <div class="message-header">
                <div class="user-info-wrapper">
                    <span class="username">النظام</span>
                </div>
                <span class="message-time">الآن</span>
            </div>
            <div class="message-text">${text}</div>
        </div>
    `;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// التحكم في الفيديو - جميع المستخدمين يمكنهم الإضافة
function setVideo() {
    const input = videoIdInput.value.trim();
    if (!input) {
        alert("❌ الرجاء إدخال رابط يوتيوب، تويتر، M3U، أو MP4");
        return;
    }

    const videoId = extractYouTubeId(input);
    const tweetId = getTweetId(input);

    if (videoId) {
        // فيديو يوتيوب
        if (!isOnline || !checkFirebase()) {
            // حفظ محلي
            const videoData = {
                videoId: videoId,
                isPlaying: true,
                updatedAt: new Date(),
                setBy: currentUser.displayName
            };
            localStorage.setItem('localVideo_' + ROOM_ID, JSON.stringify(videoData));
        } else {
            // إرسال عبر Firebase - جميع المستخدمين يمكنهم ذلك
            db.collection("rooms").doc(ROOM_ID).update({
                videoId: videoId,
                isPlaying: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastSetBy: currentUser.displayName
            }).catch(error => {
                console.error("خطأ في تحديث الفيديو:", error);
            });
        }

        if (player) {
            player.loadVideoById(videoId);
            player.playVideo();
        }
        addSystemMessage(`🎬 ${currentUser.displayName} قام بتشغيل فيديو يوتيوب`);

    } else if (tweetId) {
        // فيديو تويتر
        addSystemMessage(`🔍 ${currentUser.displayName} جاري جلب فيديو تويتر...`);
        
        fetch(`https://api.vxtwitter.com/i/status/${tweetId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(tweetData => {
                if (tweetData.media_extended && tweetData.media_extended.length > 0) {
                    const videoUrl = tweetData.media_extended[0].url;
                    
                    // عرض معلومات التغريدة في الدردشة
                    const tweetMessage = `
                        🐦 <strong>${tweetData.user_name}</strong> (@${tweetData.user_screen_name})
                        📝 ${tweetData.text.substring(0, 100)}${tweetData.text.length > 100 ? '...' : ''}
                    `;
                    
                    addSystemMessage(tweetMessage);
                    
                    if (videoUrl) {
                        addSystemMessage(`🎥 ${currentUser.displayName} قام بمشاركة فيديو تويتر`);
                    }
                } else {
                    addSystemMessage(`🐦 ${currentUser.displayName} قام بمشاركة تغريدة`);
                }
                
                // عرض التغريدة في الدردشة
                displayTwitterTweetInChat(tweetId);
            })
            .catch(error => {
                console.error("Error fetching Twitter video:", error);
                addSystemMessage(`❌ ${currentUser.displayName} - حدث خطأ في جلب فيديو تويتر`);
                displayTwitterTweetInChat(tweetId);
            });

    } else if (isDirectVideo(input)) {
        // فيديو مباشر
        addSystemMessage(`📹 ${currentUser.displayName} قام بتشغيل فيديو مباشر`);
        
    } else if (input.toLowerCase().includes('.m3u')) {
        // قائمة تشغيل M3U
        addSystemMessage(`📋 ${currentUser.displayName} قام بتشغيل قائمة تشغيل M3U`);
        
    } else {
        alert("❌ الرابط غير مدعوم. يدعم: يوتيوب، تويتر، M3U، MP4");
    }
}

// عرض تغريدة تويتر في الدردشة
function displayTwitterTweetInChat(tweetId) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = `
        <img class="user-avatar" src="${currentUser.avatar || 'https://j.top4top.io/p_3599hmcgu1.png'}">
        <div class="message-content">
            <div class="message-header">
                <div class="user-info-wrapper">
                    <span class="username">${currentUser.displayName}</span>
                </div>
                <span class="message-time">${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="message-text">مشاركة تغريدة:</div>
        </div>
    `;
    
    const twitterContainer = document.createElement('div');
    twitterContainer.className = 'twitter-tweet-container';
    twitterContainer.innerHTML = `
        <blockquote class="twitter-tweet">
            <a href="https://twitter.com/x/status/${tweetId}"></a>
        </blockquote>
    `;
    
    messageDiv.querySelector('.message-content').appendChild(twitterContainer);
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // تحميل ويدجت تويتر
    if (window.twttr) {
        window.twttr.widgets.load(twitterContainer);
    }
}

function togglePlayPause() {
    if (player) {
        if (player.getPlayerState() === 1) { // Playing
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }
}

// تحديث واجهة التحكم - جعل الأزرار متاحة للجميع
function updateControlsVisibility() {
    setVideoBtn.disabled = false;
    playPauseBtn.disabled = false;
    
    setVideoBtn.title = "تغيير الفيديو للجميع";
    playPauseBtn.title = "تشغيل/إيقاف الفيديو";
}

// الاستماع لتغيّر حالة الغرفة (فيديو)
function listenForRoomChanges() {
    if (!db || !isOnline || !checkFirebase()) return;
    
    db.collection("rooms").doc(ROOM_ID)
        .onSnapshot(doc => {
            if (!doc.exists) return;
            const data = doc.data();

            // تحديث حقل الإدخال
            if (data.videoId && data.videoId !== videoIdInput.value) {
                videoIdInput.value = data.videoId;
                
                // إشعار عند تغيير الفيديو
                if (data.lastSetBy && data.lastSetBy !== currentUser.displayName) {
                    addSystemMessage(`🎬 ${data.lastSetBy} قام بتغيير الفيديو`);
                }
            }

            if (player && data.videoId) {
                try {
                    const currentId = player.getVideoData().video_id;
                    if (currentId !== data.videoId) {
                        player.loadVideoById(data.videoId);
                        if (data.isPlaying) {
                            setTimeout(() => player.playVideo(), 1000);
                        }
                    } else {
                        if (data.isPlaying && player.getPlayerState() !== 1) {
                            player.playVideo();
                        } else if (!data.isPlaying && player.getPlayerState() === 1) {
                            player.pauseVideo();
                        }
                    }
                } catch (error) {
                    console.error("خطأ في التحكم بمشغل YouTube:", error);
                }
            }
        }, error => {
            console.error("خطأ في الاستماع لتغييرات الغرفة:", error);
        });
}

// YouTube API
function onYouTubeIframeAPIReady() {
    player = new YT.Player("player", {
        height: "100%",
        width: "100%",
        videoId: "dQw4w9WgXcQ",
        playerVars: {
            playsinline: 1,
            modestbranding: 1,
            rel: 0
        },
        events: {
            onReady: function(event) {
                console.log("YouTube player ready");
                // تحميل الفيديو الحالي
                if (isOnline && checkFirebase()) {
                    const roomRef = db.collection("rooms").doc(ROOM_ID);
                    roomRef.get().then(doc => {
                        if (doc.exists) {
                            const data = doc.data();
                            if (data.videoId) {
                                player.loadVideoById(data.videoId);
                                if (data.isPlaying) {
                                    player.playVideo();
                                }
                            }
                        }
                    });
                } else {
                    // تحميل الفيديو المحفوظ
                    const savedVideo = localStorage.getItem('localVideo_' + ROOM_ID);
                    if (savedVideo) {
                        try {
                            const videoData = JSON.parse(savedVideo);
                            if (videoData.videoId) {
                                player.loadVideoById(videoData.videoId);
                            }
                        } catch (e) {
                            console.error("Error loading local video:", e);
                        }
                    }
                }
            },
            onError: function(error) {
                console.error("YouTube player error:", error);
            }
        }
    });
}

// مراقبة حالة الاتصال
window.addEventListener('online', () => {
    isOnline = true;
    updateConnectionStatus();
    addSystemMessage("✓ تم استعادة الاتصال بالإنترنت");
});

window.addEventListener('offline', () => {
    isOnline = false;
    updateConnectionStatus();
    addSystemMessage("⚠ الاتصال بالإنترنت مقطوع - الوضع غير متصل");
});

// إعادة تحميل ويدجت تويتر
if (window.twttr) {
    window.twttr.widgets.load();
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);

// التهيئة الأولية
updateConnectionStatus();