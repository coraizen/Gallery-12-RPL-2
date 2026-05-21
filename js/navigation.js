/**
 * navigation.js
 * Handles Smooth Scrolling and Navbar styles.
 */

document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.getElementById("navbar");
  const scrollLinks = document.querySelectorAll(".cta-scroll");

  // Throttle scroll event for performance
  let isScrolling = false;

  window.addEventListener("scroll", () => {
    if (!isScrolling) {
      window.requestAnimationFrame(() => {
        handleScroll();
        isScrolling = false;
      });
      isScrolling = true;
    }
  });

  function handleScroll() {
    // Di mobile, trigger lebih awal (30px instead of 50px)
    const scrollTrigger = window.innerWidth < 768 ? 880 : 660;

    if (window.scrollY > scrollTrigger) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }

  // Smooth scroll for anchor links
  scrollLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");

      // Only handle hash links
      if (targetId.startsWith("#") && targetId.length > 1) {
        e.preventDefault();

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          // Calculate offset taking navbar height into account
          const navbarHeight = navbar.offsetHeight;
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition =
            elementPosition + window.scrollY - navbarHeight;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth",
          });
        }
      }
    });
  });
});
