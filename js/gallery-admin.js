// gallery-admin.js
// Upload foto galeri section 2 — hanya untuk role admin
// Menggunakan Cloudinary untuk storage foto

import { auth, db } from "../firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Cek apakah user adalah admin
async function isAdmin(user) {
  if (!user) return false;
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    return snap.exists() && snap.data().role === "admin";
  } catch {
    return false;
  }
}

// Render panel admin di section gallery
async function initAdminGallery() {
  onAuthStateChanged(auth, async (user) => {
    const adminPanel = document.getElementById("gallery-admin-panel");
    if (!adminPanel) return;
    if (await isAdmin(user)) {
      adminPanel.style.display = "block";
      loadGalleryItems();
    } else {
      adminPanel.style.display = "none";
    }
  });
}

// Load semua foto galeri dari Firestore
async function loadGalleryItems() {
  const list = document.getElementById("admin-gallery-list");
  if (!list) return;
  list.innerHTML = "";
  const snap = await getDocs(collection(db, "gallery"));
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const item = document.createElement("div");
    item.className = "admin-gallery-item";
    item.innerHTML = `
      <img src="${data.src}" alt="${data.alt || ""}">
      <button class="btn-delete-gallery" data-id="${docSnap.id}">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll(".btn-delete-gallery").forEach((btn) => {
    btn.addEventListener("click", () => deleteGalleryItem(btn.dataset.id));
  });
}

// Upload satu foto ke Cloudinary + simpan ke Firestore
async function uploadSinglePhoto(file) {
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/"))
    return;
  if (file.size > 50 * 1024 * 1024)
    throw new Error(`${file.name} melebihi 50MB`);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "gallery");

  const resourceType = file.type.startsWith("video/") ? "video" : "image";

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: formData },
  );

  if (!res.ok) throw new Error(`Upload gagal: ${file.name}`);
  const data = await res.json();

  await addDoc(collection(db, "gallery"), {
    src: data.secure_url,
    publicId: data.public_id,
    alt: file.name.replace(/\.[^/.]+$/, ""),
    type: resourceType,
    uploadedAt: new Date(),
  });
}

// Upload banyak file sekaligus
async function uploadGalleryPhoto(file) {
  await uploadSinglePhoto(file);
  loadGalleryItems();
  document.dispatchEvent(new Event("galleryUpdated"));
}

// Hapus foto dari Firestore
async function deleteGalleryItem(docId) {
  if (!confirm("Hapus foto ini dari galeri?")) return;
  try {
    await deleteDoc(doc(db, "gallery", docId));
    loadGalleryItems();
    document.dispatchEvent(new Event("galleryUpdated"));
  } catch (err) {
    alert("Gagal hapus: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminGallery();

  const uploadInput = document.getElementById("gallery-upload-input");
  const progressBar = document.getElementById("gallery-upload-progress");
  const progressFill = document.getElementById("gallery-progress-fill");
  const statusText = document.getElementById("gallery-upload-status");

  async function handleFiles(files) {
    if (!files.length) return;

    progressBar.style.display = "block";
    statusText.textContent = `Mengupload 0/${files.length}...`;
    progressFill.style.width = "0%";

    let success = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        statusText.textContent = `Mengupload ${i + 1}/${files.length}...`;
        progressFill.style.width = `${((i + 1) / files.length) * 100}%`;
        await uploadSinglePhoto(files[i]);
        success++;
      } catch (err) {
        console.error(err.message);
      }
    }

    statusText.textContent = `Selesai! ${success}/${files.length} foto terupload.`;
    progressFill.style.width = "100%";

    loadGalleryItems();
    document.dispatchEvent(new Event("galleryUpdated"));

    setTimeout(() => {
      progressBar.style.display = "none";
      progressFill.style.width = "0%";
      statusText.textContent = "";
    }, 3000);

    if (uploadInput) uploadInput.value = "";
  }

  if (uploadInput) {
    uploadInput.addEventListener("change", (e) => {
      handleFiles(Array.from(e.target.files));
    });
  }

  const dropArea = document.getElementById("gallery-drop-area");
  if (dropArea) {
    dropArea.addEventListener("click", () => uploadInput?.click());
    dropArea.addEventListener("dragover", (e) => e.preventDefault());
    dropArea.addEventListener("drop", (e) => {
      e.preventDefault();
      handleFiles(Array.from(e.dataTransfer.files));
    });
  }
});

window.uploadGalleryPhoto = uploadGalleryPhoto;
