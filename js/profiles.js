/**
 * profiles.js
 * Handles fetching, rendering, and interactions for Teacher and Student profiles.
 * Upload foto via Cloudinary, simpan ke Firestore.
 */

import { auth, db } from "../firebase-config.js";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Upload foto ke Cloudinary, return URL
async function uploadToCloudinary(file, folder = "profiles") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) throw new Error("Upload gagal");
  const data = await res.json();
  return data.secure_url;
}

document.addEventListener("DOMContentLoaded", () => {
  const teachersGrid = document.getElementById("teachers-grid");
  const studentsGrid = document.getElementById("students-grid");

  const profileModal = document.getElementById("profile-modal");
  const pmClose = document.getElementById("profile-modal-close");
  const pmImage = document.getElementById("pm-image");
  const pmPrev = document.getElementById("pm-prev");
  const pmNext = document.getElementById("pm-next");
  const pmIndicators = document.getElementById("pm-indicators");
  const pmName = document.getElementById("pm-name");
  const pmBirth = document.getElementById("pm-birth");
  const pmBio = document.getElementById("pm-bio");
  const pmSocials = document.getElementById("pm-socials");

  const editModal = document.getElementById("edit-modal");
  const editClose = document.getElementById("edit-modal-close");
  const editCancel = document.getElementById("btn-cancel-edit");
  const editForm = document.getElementById("edit-form");
  const btnAddGallery = document.getElementById("btn-add-gallery");
  const editGalleryContainer = document.getElementById(
    "edit-gallery-container",
  );

  let teachersData = [];
  let studentsData = [];
  let modalImages = [];
  let currentModalIdx = 0;

  fetchData();

  document.addEventListener("authStateChanged", () => {
    renderProfiles(teachersData, teachersGrid, "teacher");
    renderProfiles(studentsData, studentsGrid, "student");
  });

  async function fetchData() {
    try {
      const [teachersSnap, studentsSnap] = await Promise.all([
        getDocs(collection(db, "teachers")),
        getDocs(collection(db, "students")),
      ]);
      teachersData = teachersSnap.docs.map((d) => ({
        ...d.data(),
        firestoreId: d.id,
      }));
      studentsData = studentsSnap.docs.map((d) => ({
        ...d.data(),
        firestoreId: d.id,
      }));
      renderProfiles(teachersData, teachersGrid, "teacher");
      renderProfiles(studentsData, studentsGrid, "student");
    } catch (err) {
      console.error("Error fetch Firestore:", err);
      if (teachersGrid)
        teachersGrid.innerHTML = '<p class="loader">Gagal memuat data.</p>';
      if (studentsGrid)
        studentsGrid.innerHTML = '<p class="loader">Gagal memuat data.</p>';
    }
  }

  function renderProfiles(data, container, type) {
    if (!container) return;
    container.innerHTML = "";
    if (data.length === 0) {
      container.innerHTML = '<p class="loader">Belum ada data.</p>';
      return;
    }

    data.forEach((person, index) => {
      const card = document.createElement("div");
      card.className = "profile-card";
      if (window.innerWidth > 768) {
        card.setAttribute(
          "data-aos",
          type === "student" ? "zoom-in" : "fade-up",
        );
        card.setAttribute("data-aos-delay", (index % 4) * 100);
      }

      const currentUser = auth.currentUser;
      const isOwner =
        currentUser !== null &&
        currentUser.email !== null &&
        currentUser.email.toLowerCase() === person.ownerEmail.toLowerCase();

      let badgeHTML = "";
      let editBtnHTML = "";
      if (isOwner) {
        badgeHTML = `<div class="profile-badge-owner"><i class="fa-solid fa-user-check"></i> Profil Saya</div>`;
        editBtnHTML = `<button class="btn-edit-floating" onclick="openEditModal(event, ${person.id}, '${type}')" title="Edit Profil"><i class="fa-solid fa-pen"></i></button>`;
      }

      const avatarUrl = person.avatar?.startsWith("http")
        ? person.avatar
        : `https://drive.google.com/uc?export=view&id=${person.avatar}`;

      card.innerHTML = `
        ${badgeHTML}
        ${editBtnHTML}
        <img src="${avatarUrl}" alt="${person.name}" class="profile-card-img">
        <div class="profile-card-overlay">
          <h3>${person.name}</h3>
          <p>${type === "teacher" ? person.subject : ""}</p>
        </div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".btn-edit-floating")) return;
        openProfileModal(person, type);
      });

      container.appendChild(card);
    });

    if (typeof AOS !== "undefined") AOS.refresh();
  }

  // --- Profile Detail Modal ---
  function openProfileModal(person, type) {
    pmName.textContent = person.name;
    pmBirth.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${person.birthInfo || "Data belum diisi"}`;
    pmBio.textContent = person.bio || "Belum ada bio.";

    pmSocials.innerHTML = "";
    if (person.social) {
      const socialIcons = {
        instagram: "fa-instagram",
        whatsapp: "fa-whatsapp",
        twitter: "fa-twitter",
        linkedin: "fa-linkedin",
      };
      for (const [platform, url] of Object.entries(person.social)) {
        if (url && socialIcons[platform]) {
          const a = document.createElement("a");
          a.href = url;
          a.target = "_blank";
          a.className = "social-link";
          a.innerHTML = `<i class="fa-brands ${socialIcons[platform]}"></i>`;
          pmSocials.appendChild(a);
        }
      }
    }

    const avatarUrl = person.avatar?.startsWith("http")
      ? person.avatar
      : `https://drive.google.com/uc?export=view&id=${person.avatar}`;
    modalImages = [avatarUrl];

    if (person.gallery && person.gallery.length > 0) {
      person.gallery.forEach((url) => {
        const resolved = url.startsWith("http")
          ? url
          : `https://drive.google.com/uc?export=view&id=${url}`;
        modalImages.push(resolved);
      });
    }

    currentModalIdx = 0;
    updateModalCarousel();
    profileModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function updateModalCarousel() {
    if (modalImages.length === 0) return;
    pmImage.style.opacity = 0;
    setTimeout(() => {
      pmImage.src = modalImages[currentModalIdx];
      pmImage.onload = () => (pmImage.style.opacity = 1);
    }, 150);

    if (modalImages.length > 1) {
      pmPrev.classList.remove("hidden");
      pmNext.classList.remove("hidden");
    } else {
      pmPrev.classList.add("hidden");
      pmNext.classList.add("hidden");
    }

    pmIndicators.innerHTML = "";
    if (modalImages.length > 1) {
      modalImages.forEach((_, idx) => {
        const dot = document.createElement("div");
        dot.className = `pm-dot ${idx === currentModalIdx ? "active" : ""}`;
        pmIndicators.appendChild(dot);
      });
    }
  }

  if (pmNext)
    pmNext.addEventListener("click", (e) => {
      e.stopPropagation();
      currentModalIdx = (currentModalIdx + 1) % modalImages.length;
      updateModalCarousel();
    });

  if (pmPrev)
    pmPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      currentModalIdx =
        (currentModalIdx - 1 + modalImages.length) % modalImages.length;
      updateModalCarousel();
    });

  // --- Edit Profile Modal ---
  window.openEditModal = function (e, id, type) {
    e.stopPropagation();

    const dataset = type === "teacher" ? teachersData : studentsData;
    const person = dataset.find((p) => p.id === id);
    if (!person) return;

    document.getElementById("edit-id").value = id;
    document.getElementById("edit-type").value = type;
    document.getElementById("edit-name").value = person.name;
    document.getElementById("edit-birth").value = person.birthInfo || "";
    document.getElementById("edit-name").setAttribute("readonly", true);
    document.getElementById("edit-birth").setAttribute("readonly", true);
    document.getElementById("edit-bio").value = person.bio || "";
    document.getElementById("edit-instagram").value =
      person.social?.instagram || "";
    document.getElementById("edit-linkedin").value =
      person.social?.linkedin || "";
    // Simpan URL avatar ke hidden input
    document.getElementById("edit-avatar").value = person.avatar || "";

    // Preview avatar saat ini
    const avatarPreview = document.getElementById("edit-avatar-preview");
    if (avatarPreview && person.avatar) {
      avatarPreview.src = person.avatar.startsWith("http")
        ? person.avatar
        : `https://drive.google.com/uc?export=view&id=${person.avatar}`;
      avatarPreview.style.display = "block";
    }

    // Populate gallery
    editGalleryContainer.innerHTML = "";
    if (person.gallery && person.gallery.length > 0) {
      person.gallery.forEach((url) => addGalleryItem(url));
    }

    editModal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  // Tambah item galeri — tampilkan preview + tombol hapus
  function addGalleryItem(url = "") {
    const div = document.createElement("div");
    div.className = "gallery-input-row";
    div.innerHTML = `
      <div class="gallery-preview-wrap">
        ${url ? `<img src="${url}" class="gallery-preview-img" alt="">` : ""}
        <input type="hidden" class="gallery-url-input" value="${url}">
        <button type="button" class="btn-remove-gallery" title="Hapus">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    div
      .querySelector(".btn-remove-gallery")
      .addEventListener("click", () => div.remove());
    editGalleryContainer.appendChild(div);
  }

  // Tombol tambah foto galeri — upload Cloudinary
  if (btnAddGallery) {
    btnAddGallery.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = true;
      document.body.appendChild(input); // append dulu ke DOM
      input.onchange = async () => {
        const files = Array.from(input.files);
        document.body.removeChild(input); // bersihkan setelah dipilih
        if (!files.length) return;
        btnAddGallery.disabled = true;
        btnAddGallery.innerHTML = `Mengupload 0/${files.length}...`;
        try {
          for (let i = 0; i < files.length; i++) {
            btnAddGallery.innerHTML = `Mengupload ${i + 1}/${files.length}...`;
            const url = await uploadToCloudinary(files[i], "profiles/gallery");
            addGalleryItem(url);
          }
        } catch (err) {
          alert("Upload gagal: " + err.message);
        } finally {
          btnAddGallery.disabled = false;
          btnAddGallery.innerHTML = "+ Tambah Foto Galeri";
        }
      };
      input.click();
    });
  }

  // Upload avatar — trigger saat klik preview
  const avatarUploadBtn = document.getElementById("btn-upload-avatar");
  if (avatarUploadBtn) {
    avatarUploadBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        avatarUploadBtn.disabled = true;
        avatarUploadBtn.textContent = "Mengupload...";
        try {
          const url = await uploadToCloudinary(file, "profiles/avatar");
          document.getElementById("edit-avatar").value = url;
          const preview = document.getElementById("edit-avatar-preview");
          if (preview) {
            preview.src = url;
            preview.style.display = "block";
          }
        } catch (err) {
          alert("Upload gagal: " + err.message);
        } finally {
          avatarUploadBtn.disabled = false;
          avatarUploadBtn.textContent = "Ganti Foto";
        }
      };
      input.click();
    });
  }

  // Submit edit form — simpan ke Firestore
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = parseInt(document.getElementById("edit-id").value);
      const type = document.getElementById("edit-type").value;
      const dataset = type === "teacher" ? teachersData : studentsData;
      const personIndex = dataset.findIndex((p) => p.id === id);
      if (personIndex === -1) return;

      const submitBtn = editForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Menyimpan...";

      try {
        const updatedPerson = { ...dataset[personIndex] };
        updatedPerson.name = document.getElementById("edit-name").value;
        updatedPerson.birthInfo = document.getElementById("edit-birth").value;
        updatedPerson.bio = document.getElementById("edit-bio").value;
        updatedPerson.avatar = document.getElementById("edit-avatar").value;

        // Collect gallery URLs dari hidden inputs
        const galleryInputs = document.querySelectorAll(".gallery-url-input");
        updatedPerson.gallery = Array.from(galleryInputs)
          .map((i) => i.value.trim())
          .filter((v) => v !== "");

        // Simpan ke Firestore
        const collectionName = type === "teacher" ? "teachers" : "students";
        await updateDoc(doc(db, collectionName, String(id).padStart(2, "0")), {
          name: updatedPerson.name,
          birthInfo: updatedPerson.birthInfo,
          bio: updatedPerson.bio,
          avatar: updatedPerson.avatar,
          gallery: updatedPerson.gallery,
          social: {
            instagram: document.getElementById("edit-instagram").value.trim(),
            linkedin: document.getElementById("edit-linkedin").value.trim(),
          },
        });

        // Update local data
        dataset[personIndex] = updatedPerson;

        if (type === "teacher")
          renderProfiles(teachersData, teachersGrid, "teacher");
        else renderProfiles(studentsData, studentsGrid, "student");

        closeModals();
      } catch (err) {
        alert("Gagal menyimpan: " + err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Simpan Perubahan";
      }
    });
  }

  function closeModals() {
    profileModal.classList.remove("active");
    editModal.classList.remove("active");
    document.body.style.overflow = "";
  }

  if (pmClose) pmClose.addEventListener("click", closeModals);
  if (editClose) editClose.addEventListener("click", closeModals);
  if (editCancel) editCancel.addEventListener("click", closeModals);

  [profileModal, editModal].forEach((modal) => {
    if (modal)
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModals();
      });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModals();
  });
});
console.log("profiles.js loaded");
