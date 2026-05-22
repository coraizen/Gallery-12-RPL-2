// gallery.js
// Grid gallery + lightbox dengan pagination
// Data dari Firestore

import { db } from "../firebase-config.js";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

const ITEMS_PER_PAGE = 10;
const FALLBACK = [
  {
    src: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
    alt: "Fallback",
    type: "image",
  },
];

let allItems = [];
let currentPage = 1;
let lightboxIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  fetchGalleryData();

  // Lightbox controls
  document
    .getElementById("lightbox-close")
    ?.addEventListener("click", closeLightbox);
  document
    .getElementById("lightbox-prev")
    ?.addEventListener("click", () => navigateLightbox(-1));
  document
    .getElementById("lightbox-next")
    ?.addEventListener("click", () => navigateLightbox(1));

  document
    .getElementById("gallery-lightbox")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "gallery-lightbox") closeLightbox();
    });

  document.addEventListener("keydown", (e) => {
    const lb = document.getElementById("gallery-lightbox");
    if (!lb?.classList.contains("active")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") navigateLightbox(1);
    if (e.key === "ArrowLeft") navigateLightbox(-1);
  });

  // Refresh saat admin upload
  document.addEventListener("galleryUpdated", () => fetchGalleryData());
});

// ============================================================
// FETCH DATA
// ============================================================
async function fetchGalleryData() {
  try {
    const snap = await getDocs(
      query(collection(db, "gallery"), orderBy("uploadedAt", "desc")),
    );
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (data.length === 0) throw new Error("empty");
    allItems = data;
  } catch {
    allItems = FALLBACK;
  }
  currentPage = 1;
  renderGrid();
  renderPagination();
}

// ============================================================
// RENDER GRID
// ============================================================
function renderGrid() {
  const grid = document.getElementById("gallery-grid");
  if (!grid) return;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = allItems.slice(start, start + ITEMS_PER_PAGE);

  grid.innerHTML = "";
  pageItems.forEach((item, i) => {
    const globalIndex = start + i;
    const el = document.createElement("div");
    el.className = "gallery-item";
    el.dataset.index = globalIndex;

    const isVideo =
      item.type === "video" ||
      item.src?.includes("video") ||
      item.resourceType === "video";

    if (isVideo) {
      el.innerHTML = `
        <video src="${item.src}" muted preload="metadata" class="gallery-media"></video>
        <div class="gallery-play-icon"><i class="fa-solid fa-play"></i></div>
      `;
    } else {
      el.innerHTML = `<img src="${item.src}" alt="${item.alt || ""}" class="gallery-media" loading="lazy">`;
    }

    el.addEventListener("click", () => openLightbox(globalIndex));
    grid.appendChild(el);
  });
}

// ============================================================
// PAGINATION
// ============================================================
function renderPagination() {
  const pag = document.getElementById("gallery-pagination");
  if (!pag) return;

  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  if (totalPages <= 1) {
    pag.innerHTML = "";
    return;
  }

  pag.innerHTML = "";

  // Prev
  const prev = document.createElement("button");
  prev.className = "pag-btn" + (currentPage === 1 ? " disabled" : "");
  prev.innerHTML = `<i class="fa-solid fa-chevron-left"></i>`;
  prev.addEventListener("click", () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  });
  pag.appendChild(prev);

  // Pages
  // Pages
  const delta = 2;
  const range = [];
  for (
    let i = Math.max(2, currentPage - delta);
    i <= Math.min(totalPages - 1, currentPage + delta);
    i++
  ) {
    range.push(i);
  }

  // First page
  const first = document.createElement("button");
  first.className = "pag-btn" + (1 === currentPage ? " active" : "");
  first.textContent = 1;
  first.addEventListener("click", () => goToPage(1));
  pag.appendChild(first);

  // Ellipsis kiri
  if (range[0] > 2) {
    const dots = document.createElement("span");
    dots.className = "pag-dots";
    dots.textContent = "...";
    pag.appendChild(dots);
  }

  // Middle pages
  range.forEach((i) => {
    const btn = document.createElement("button");
    btn.className = "pag-btn" + (i === currentPage ? " active" : "");
    btn.textContent = i;
    btn.addEventListener("click", () => goToPage(i));
    pag.appendChild(btn);
  });

  // Ellipsis kanan
  if (range[range.length - 1] < totalPages - 1) {
    const dots = document.createElement("span");
    dots.className = "pag-dots";
    dots.textContent = "...";
    pag.appendChild(dots);
  }

  // Last page
  if (totalPages > 1) {
    const last = document.createElement("button");
    last.className = "pag-btn" + (totalPages === currentPage ? " active" : "");
    last.textContent = totalPages;
    last.addEventListener("click", () => goToPage(totalPages));
    pag.appendChild(last);
  }

  // Next
  const next = document.createElement("button");
  next.className = "pag-btn" + (currentPage === totalPages ? " disabled" : "");
  next.innerHTML = `<i class="fa-solid fa-chevron-right"></i>`;
  next.addEventListener("click", () => {
    if (currentPage < totalPages) goToPage(currentPage + 1);
  });
  pag.appendChild(next);
}

function goToPage(page) {
  currentPage = page;
  renderGrid();
  renderPagination();
  document
    .getElementById("gallery")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================================
// LIGHTBOX
// ============================================================
function openLightbox(index) {
  lightboxIndex = index;
  const lb = document.getElementById("gallery-lightbox");
  lb.classList.add("active");
  document.body.style.overflow = "hidden";
  renderLightboxContent();
  renderThumbs();
}

function closeLightbox() {
  document.getElementById("gallery-lightbox")?.classList.remove("active");
  document.body.style.overflow = "";
}

function navigateLightbox(dir) {
  lightboxIndex = (lightboxIndex + dir + allItems.length) % allItems.length;
  renderLightboxContent();
  syncThumbScroll();
}

function renderLightboxContent() {
  const item = allItems[lightboxIndex];
  const main = document.getElementById("lightbox-main");
  const counter = document.getElementById("lightbox-counter");
  const caption = document.getElementById("lightbox-caption");
  if (!main || !item) return;

  counter.textContent = `${lightboxIndex + 1} / ${allItems.length}`;
  caption.textContent = "";

  const isVideo = item.type === "video" || item.resourceType === "video";

  if (isVideo) {
    main.innerHTML = `
      <video src="${item.src}" controls autoplay class="lightbox-media"></video>
    `;
  } else {
    main.innerHTML = `<img src="${item.src}" alt="${item.alt || ""}" class="lightbox-media">`;
  }

  // Highlight thumb aktif
  document.querySelectorAll(".thumb-item").forEach((t, i) => {
    t.classList.toggle("active", i === lightboxIndex);
  });
}

function renderThumbs() {
  const thumbs = document.getElementById("lightbox-thumbs");
  if (!thumbs) return;

  thumbs.innerHTML = "";
  allItems.forEach((item, i) => {
    const t = document.createElement("div");
    t.className = "thumb-item" + (i === lightboxIndex ? " active" : "");
    const isVideo = item.type === "video" || item.resourceType === "video";
    t.innerHTML = isVideo
      ? `<video src="${item.src}" class="thumb-media" muted></video>`
      : `<img src="${item.src}" class="thumb-media" loading="lazy">`;
    t.addEventListener("click", () => {
      lightboxIndex = i;
      renderLightboxContent();
      syncThumbScroll();
    });
    thumbs.appendChild(t);
  });
}

function syncThumbScroll() {
  const thumbs = document.getElementById("lightbox-thumbs");
  const active = thumbs?.querySelectorAll(".thumb-item")[lightboxIndex];
  active?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });
}

// Expose untuk window
window.openGlobalLightbox = (items, startIdx = 0) => openLightbox(startIdx);
