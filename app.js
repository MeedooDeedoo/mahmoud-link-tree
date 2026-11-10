
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
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWBoKbZlRNLxQifeLO6Dyjud9q83pvpAk",
  authDomain: "mahmoud-link-tree.firebaseapp.com",
  projectId: "mahmoud-link-tree",
  storageBucket: "mahmoud-link-tree.firebasestorage.app",
  messagingSenderId: "1076994327761",
  appId: "1:1076994327761:web:dce10861cea6878c79f1f0",
  measurementId: "G-F8EGZ5EV3M"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_UID = "N0t92vyGBzVXfT4VgUM4vQZyvvS2";

const loginForm = document.getElementById("loginForm");
const logoutButton = document.getElementById("logout");
const message = document.getElementById("message");
const linksContainer = document.getElementById("links");
const status = document.getElementById("status");

const adminPanel = document.createElement("section");
adminPanel.className = "admin";
adminPanel.hidden = true;

adminPanel.innerHTML = `
  <h2>إدارة الروابط</h2>
  <form id="addLinkForm">
    <input id="linkTitle" placeholder="اسم الرابط"
      required maxlength="80">
    <input id="linkUrl" type="url"
      placeholder="https://example.com" required>
    <button class="btn" type="submit">إضافة رابط جديد</button>
  </form>
  <p id="adminMessage"></p>
  <div id="manageLinks"></div>
`;

document.querySelector(".links-section").after(adminPanel);

const addLinkForm = document.getElementById("addLinkForm");
const adminMessage = document.getElementById("adminMessage");
const manageLinks = document.getElementById("manageLinks");

let allLinks = [];
let currentUser = null;

function isAdmin() {
  return currentUser?.uid === ADMIN_UID;
}

function showMessage(text, color = "#d6b56d") {
  message.textContent = text;
  message.style.color = color;
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

// عرض الروابط للزوار
function renderLinks() {
  linksContainer.replaceChildren();

  if (allLinks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "link";
    empty.textContent = "لا توجد روابط حالياً";
    linksContainer.appendChild(empty);
    return;
  }

  allLinks.forEach(item => {
    const link = document.createElement("a");
    link.className = "link";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = item.title;
    linksContainer.appendChild(link);
  });
}

// عرض لوحة الإدارة
function renderAdminLinks() {
  manageLinks.replaceChildren();

  if (!isAdmin()) return;

  allLinks.forEach(item => {
    const row = document.createElement("div");
    row.style.cssText =
      "background:#252525;padding:12px;border-radius:12px;margin:12px 0;";

    const title = document.createElement("p");
    title.textContent = item.title;
    title.style.cssText = "color:white;margin-bottom:10px;";

    const edit = document.createElement("button");
    edit.className = "btn";
    edit.type = "button";
    edit.textContent = "تعديل";

    edit.addEventListener("click", async () => {
      const newTitle = prompt("اسم الرابط الجديد:", item.title);
      if (newTitle === null) return;

      const cleanTitle = newTitle.trim();
      if (!cleanTitle || cleanTitle.length > 80) {
        alert("اكتب اسماً صحيحاً لا يتجاوز 80 حرفاً");
        return;
      }

      const newUrl = prompt("الرابط الجديد:", item.url);
      if (newUrl === null) return;

      const cleanUrl = newUrl.trim();

      if (!validUrl(cleanUrl)) {
        alert("الرابط غير صالح. استخدم https أو http");
        return;
      }

      try {
        await updateDoc(doc(db, "links", item.id), {
          title: cleanTitle,
          url: cleanUrl
        });
        adminMessage.textContent = "تم تعديل الرابط بنجاح";
      } catch (error) {
        adminMessage.textContent = "تعذر التعديل: " + error.message;
      }
    });

    const remove = document.createElement("button");
    remove.className = "btn";
    remove.type = "button";
    remove.textContent = "حذف";
    remove.style.cssText =
      "background:#492020;border-color:#a44;margin-right:8px;";

    remove.addEventListener("click", async () => {
      if (!confirm("هل أنت متأكد من حذف هذا الرابط؟")) return;

      try {
        await deleteDoc(doc(db, "links", item.id));
        adminMessage.textContent = "تم حذف الرابط بنجاح";
      } catch (error) {
        adminMessage.textContent = "تعذر الحذف: " + error.message;
      }
    });

    row.append(title, edit, remove);
    manageLinks.appendChild(row);
  });
}

function renderAll() {
  renderLinks();
  renderAdminLinks();
}

// متابعة قاعدة البيانات
const linksQuery = query(
  collection(db, "links"),
  orderBy("createdAt", "desc")
);

onSnapshot(linksQuery, snapshot => {
  allLinks = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  renderAll();
}, error => {
  console.error(error);
  showMessage("تعذر تحميل الروابط. تحقق من إعدادات Firestore.", "#ff7777");
});

// تسجيل الدخول
loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    showMessage("تعذر تسجيل الدخول. تحقق من بيانات الحساب.", "#ff7777");
    console.error(error);
  }
});

// إضافة رابط
addLinkForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin()) {
    adminMessage.textContent = "ليس لديك صلاحية الإدارة";
    return;
  }

  const title = document.getElementById("linkTitle").value.trim();
  const url = document.getElementById("linkUrl").value.trim();

  if (!title || title.length > 80 || !validUrl(url)) {
    adminMessage.textContent = "يرجى إدخال اسم ورابط صحيحين";
    return;
  }

  try {
    await addDoc(collection(db, "links"), {
      title,
      url,
      createdAt: serverTimestamp()
    });

    addLinkForm.reset();
    adminMessage.textContent = "تمت إضافة الرابط بنجاح";
  } catch (error) {
    adminMessage.textContent = "تعذرت الإضافة: " + error.message;
  }
});

// تسجيل الخروج
logoutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    showMessage("تعذر تسجيل الخروج", "#ff7777");
  }
});

// مراقبة الحساب
onAuthStateChanged(auth, user => {
  currentUser = user;

  if (isAdmin()) {
    loginForm.hidden = true;
    logoutButton.hidden = false;
    adminPanel.hidden = false;
    status.textContent = "لوحة إدارة محمود";
    showMessage("أهلاً بك في لوحة الإدارة");
  } else {
    loginForm.hidden = false;
    logoutButton.hidden = true;
    adminPanel.hidden = true;

    status.textContent = "منصة الروابط الشخصية";

    if (user) {
      showMessage("هذا الحساب غير مصرح له بالإدارة.", "#ff7777");
    } else {
      showMessage("");
    }
  }

  renderAll();
});
