/**
 * app.js
 * Main Entry Point - Initializes AOS and sets up any global events.
 */
import { initTextType } from "./TextType.js";
import { initScrollVelocity } from "./scroll-velocity.js";

// Taruh di luar DOMContentLoaded (baris paling atas)
document.addEventListener("DOMContentLoaded", () => {
  // Initialize AOS Animation Library
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 800,
      easing: "ease-out-cubic",
      once: true,
      offset: 50,
      disable: window.innerWidth < 768, // Optionally disable animations on mobile for performance
    });
    initTextType(
      "#hero-subtitle",
      ["Kenangan Indah Tahun 2026", "Momen yang Tak Terlupakan"],
      {
        typingSpeed: 65,
        deletingSpeed: 35,
        pauseDuration: 2500,
        initialDelay: 800,
      },
    );
    initScrollVelocity(".velocity-track", {
      baseSpeed: 0.8,
      velocityMultiplier: 8,
      damping: 0.92,
    });
  }

  // Custom toast notification logic can be added here
});
