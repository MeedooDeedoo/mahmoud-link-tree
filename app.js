
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAWBoKbZlRNLxQifeLO6Dyjud9q83pvpAk",
  authDomain: "mahmoud-link-tree.firebaseapp.com",
  projectId: "mahmoud-link-tree",
  storageBucket: "mahmoud-link-tree.firebasestorage.app",
  messagingSenderId: "1076994327761",
  appId: "1:1076994327761:web:dce10861cea6878c79f1f0",
  measurementId: "G-F8EGZ5EV3M"
};

// بيانات التطبيق
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// رقم المدير المصرح له
const ADMIN_UID = "N0t92vyGBzVXfT4VgUM4vQZyvvS2";

const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logout");
const message = document.getElementById("message");
const linksContainer = document.getElementById("links");
const status = document.getElementById("status");

// إنشاء لوحة الإدارة
const adminPanel = document.createElement("section");
adminPanel.className = "admin";
adminPanel.hidden = true;

adminPanel.innerHTML = `
  <h2>لوحة إدارة الروابط</h2>
  <form id="addLinkForm">
    <input id="linkTitle" type="text"
      placeholder="اسم الرابط" required maxlength="80">

    <input id="linkUrl" type="url"
      placeholder="رابط الموقع https://..." required>

    <button type="submit" class="btn">
      إضافة الرابط
    </button>
  </form>
  <p id="adminMessage"></p>
  <div id="manageLinks"></div>
`;

document.querySelector(".links-section")
  .after(adminPanel);

const addLinkForm = document.getElementById("addLinkForm");
const adminMessage = document.getElementById("adminMessage");
const manageLinks = document.getElementById("manageLinks");

// رسائل الحالة
function showMessage(text, color = "#d6b56d") {
  message.textContent = text;
  message.style.color = color;
}

// عرض الروابط للزوار
function displayLink(id, data) {
  const a = document.createElement("a");
  a.className = "link";
  a.href = data.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = data.title;
  return a;
}

// متابعة الروابط مباشرة من Firestore
const linksQuery = query(
  collection(db, "links"),
  orderBy("createdAt", "desc")
);

onSnapshot(linksQuery, (snapshot) => {
  linksContainer.replaceChildren();
  manageLinks.replaceChildren();

  if (snapshot.empty) {
    const empty = document.createElement("p");
    empty.className = "link";
    empty.textContent = "لا توجد روابط حالياً";
    linksContainer.appendChild(empty);
    return;
  }

  snapshot.forEach((item) => {
    const data = item.data();

    linksContainer.appendChild(displayLink(item.id, data));

    // أزرار الإدارة تظهر للمدير فقط
    if (auth.currentUser?.uid === ADMIN_UID) {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;gap:10px;align-items:center;margin:10px 0;";

      const title = document.createElement("span");
      title.textContent = data.title;
      title.style.flex = "1";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "btn";
      deleteButton.textContent = "حذف";
      deleteButton.style.background = "#492020";

      deleteButton.addEventListener("click", async () => {
        if (!confirm("هل تريد حذف هذا الرابط؟")) return;

        try {
          await deleteDoc(doc(db, "links", item.id));
          adminMessage.textContent = "تم حذف الرابط بنجاح";
        } catch (error) {
          adminMessage.textContent = "تعذر حذف الرابط: " + error.message;
        }
      });

      row.append(title, deleteButton);
      manageLinks.appendChild(row);
    }
  });
}, (error) => {
  console.error(error);
  showMessage("تعذر تحميل الروابط. تحقق من قواعد Firestore.", "#ff7777");
});

// تسجيل الدخول
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    showMessage("فشل تسجيل الدخول. تحقق من البريد وكلمة المرور.", "#ff7777");
    console.error(error);
  }
});

// إضافة رابط جديد
addLinkForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (auth.currentUser?.uid !== ADMIN_UID) {
    adminMessage.textContent = "ليس لديك صلاحية الإدارة";
    return;
  }

  const title = document.getElementById("linkTitle").value.trim();
  const url = document.getElementById("linkUrl").value.trim();

  try {
    const parsedUrl = new URL(url);

    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      throw new Error("رابط غير صالح");
    }

    await addDoc(collection(db, "links"), {
      title,
      url: parsedUrl.href,
      createdAt: serverTimestamp()
    });

    addLinkForm.reset();
    adminMessage.textContent = "تمت إضافة الرابط بنجاح";
  } catch (error) {
    adminMessage.textContent = "تعذرت إضافة الرابط: " + error.message;
  }
});

// تسجيل الخروج
logoutButton.addEventListener("click", async () => {
  await signOut(auth);
});

// متابعة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
  if (user && user.uid === ADMIN_UID) {
    loginForm.hidden = true;
    logoutButton.hidden = false;
    adminPanel.hidden = false;
    status.textContent = "مرحباً بك في لوحة الإدارة";
    showMessage("تم تسجيل الدخول بنجاح");
  } else {
    loginForm.hidden = false;
    logoutButton.hidden = true;
    adminPanel.hidden = true;

    if (user) {
      status.textContent = "حساب غير مصرح له";
      showMessage("هذا الحساب ليس حساب المدير.", "#ff7777");
    } else {
      status.textContent = "منصة الروابط الشخصية";
      showMessage("");
    }
  }
});

