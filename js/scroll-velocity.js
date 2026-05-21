// scroll-velocity.js
function initScrollVelocity(selector, options = {}) {
  const containers = document.querySelectorAll(selector);
  if (!containers.length) return;

  const { baseSpeed = 1, damping = 0.95 } = options;

  let lastScrollY = window.scrollY;
  let velocity = 0;

  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;
    velocity = (currentScrollY - lastScrollY) * 0.3;
    lastScrollY = currentScrollY;
  });

  containers.forEach((container) => {
    const direction = container.dataset.direction === "right" ? 1 : -1;
    let x = 0;

    // Clone semua children untuk infinite loop
    const original = Array.from(container.children);
    original.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      container.appendChild(clone);
    });

    // Tunggu render untuk dapat totalWidth yang akurat
    requestAnimationFrame(() => {
      const totalWidth = container.scrollWidth / 2;

      function animate() {
        const speed = baseSpeed + Math.abs(velocity) * 0.5;
        x += speed * direction * -1;

        // Reset infinite loop
        if (x <= -totalWidth) x += totalWidth;
        if (x >= 0) x -= totalWidth;

        container.style.transform = `translateX(${x}px)`;
        velocity *= damping;

        requestAnimationFrame(animate);
      }

      animate();
    });
  });
}

export { initScrollVelocity };
