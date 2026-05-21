// auth.js — Firebase Authentication

import { auth, db } from "../firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

let allUsers = [];

async function preloadUsersForAuth() {
  try {
    const [studentsSnap, teachersSnap] = await Promise.all([
      getDocs(collection(db, "students")),
      getDocs(collection(db, "teachers")),
    ]);
    allUsers = [
      ...studentsSnap.docs.map((d) => ({ ...d.data(), role: "student" })),
      ...teachersSnap.docs.map((d) => ({ ...d.data(), role: "teacher" })),
    ];
    populateAuthDropdowns();
  } catch (err) {
    console.error("Gagal load users:", err);
  }
}

function populateAuthDropdowns() {
  const loginSelect = document.getElementById("login-name");
  const registerSelect = document.getElementById("register-name");
  const registerRoleSelect = document.getElementById("register-role");
  if (!loginSelect || !registerSelect) return;

  loginSelect.innerHTML = '<option value="">-- Pilih Nama --</option>';
  allUsers.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.ownerEmail;
    opt.textContent = u.name;
    loginSelect.appendChild(opt);
  });

  const updateRegisterSelect = () => {
    registerSelect.innerHTML = '<option value="">-- Pilih Nama --</option>';
    const role = registerRoleSelect?.value;
    allUsers
      .filter((u) => u.role === role)
      .forEach((u) => {
        const opt = document.createElement("option");
        opt.value = u.ownerEmail;
        opt.textContent = u.name;
        registerSelect.appendChild(opt);
      });
  };

  registerRoleSelect?.addEventListener("change", updateRegisterSelect);
  updateRegisterSelect();
}

document.addEventListener("DOMContentLoaded", () => {
  preloadUsersForAuth();

  const authModal = document.getElementById("auth-modal");
  const btnLoginModal = document.getElementById("btn-login-modal");
  const authModalClose = document.getElementById("auth-modal-close");
  const loginForm = document.getElementById("auth-login-form");
  const registerForm = document.getElementById("auth-register-form");
  const tabLogin = document.getElementById("tab-login");
  const tabRegister = document.getElementById("tab-register");
  const authHeaderText = document.getElementById("auth-header-text");

  btnLoginModal?.addEventListener("click", (e) => {
    e.preventDefault();
    authModal.classList.add("active");
  });

  authModalClose?.addEventListener("click", () =>
    authModal.classList.remove("active"),
  );

  tabLogin?.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    authHeaderText.innerHTML =
      "<h3>Masuk ke Dashboard</h3><p>Pilih nama kamu dan masukkan password.</p>";
  });

  tabRegister?.addEventListener("click", () => {
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    registerForm.style.display = "block";
    loginForm.style.display = "none";
    authHeaderText.innerHTML =
      "<h3>Buat Akun</h3><p>Pilih nama dan buat password baru.</p>";
  });

  // LOGIN
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-name").value;
    const pass = document.getElementById("login-password").value;
    if (!email) return alert("Pilih nama dulu.");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      authModal.classList.remove("active");
      document.getElementById("login-password").value = "";
    } catch (err) {
      alert(getErrMsg(err.code));
    }
  });

  // REGISTER
  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("register-name").value;
    const pass = document.getElementById("register-password").value;
    const role = document.getElementById("register-role")?.value || "student";
    if (!email) return alert("Pilih nama dulu.");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      // Simpan ke Firestore collection users
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        role,
        createdAt: new Date(),
      });
      authModal.classList.remove("active");
      document.getElementById("register-password").value = "";
    } catch (err) {
      alert(getErrMsg(err.code));
    }
  });

  // Observer auth state
  onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
    document.dispatchEvent(
      new CustomEvent("authStateChanged", { detail: user }),
    );
  });
});

function updateAuthUI(user) {
  const authContainer = document.getElementById("auth-state");
  if (!authContainer) return;

  if (user) {
    authContainer.innerHTML = `
      <div class="user-badge">
        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=4f46e5&color=fff" alt="User">
        <span>${user.email.split("@")[0]}</span>
        <button class="btn-logout" id="btn-logout" title="Logout">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    `;
    document
      .getElementById("btn-logout")
      ?.addEventListener("click", async () => {
        await signOut(auth);
      });
  } else {
    authContainer.innerHTML = `
      <button class="btn btn-primary" id="btn-login-modal">Login</button>
    `;
    document
      .getElementById("btn-login-modal")
      ?.addEventListener("click", () => {
        document.getElementById("auth-modal")?.classList.add("active");
      });
  }
}

function getErrMsg(code) {
  const map = {
    "auth/user-not-found": "Akun tidak ditemukan.",
    "auth/wrong-password": "Password salah.",
    "auth/invalid-credential": "Email atau password salah.",
    "auth/email-already-in-use": "Email sudah terdaftar.",
    "auth/weak-password": "Password minimal 6 karakter.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
  };
  return map[code] || "Terjadi kesalahan: " + code;
}
