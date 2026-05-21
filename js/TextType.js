// texttype.js
// Efek typing vanilla JS — tanpa React

function initTextType(selector, texts, options = {}) {
  const el = document.querySelector(selector);
  if (!el) return;

  const {
    typingSpeed = 60,
    deletingSpeed = 35,
    pauseDuration = 2000,
    initialDelay = 500,
    loop = true,
    showCursor = true,
    cursorCharacter = "|",
  } = options;

  // Bungkus konten dengan span
  el.innerHTML = `
    <span class="texttype-content"></span>
    ${showCursor ? `<span class="texttype-cursor">${cursorCharacter}</span>` : ""}
  `;

  const contentEl = el.querySelector(".texttype-content");
  const cursorEl = el.querySelector(".texttype-cursor");

  let currentTextIndex = 0;
  let currentCharIndex = 0;
  let isDeleting = false;
  let timeout;

  // Cursor blink
  if (cursorEl) {
    setInterval(() => {
      cursorEl.style.opacity = cursorEl.style.opacity === "0" ? "1" : "0";
    }, 500);
  }

  function tick() {
    const currentText = texts[currentTextIndex];

    if (isDeleting) {
      contentEl.textContent = currentText.slice(0, currentCharIndex - 1);
      currentCharIndex--;

      if (currentCharIndex === 0) {
        isDeleting = false;
        currentTextIndex = (currentTextIndex + 1) % texts.length;
        if (!loop && currentTextIndex === 0) return;
        timeout = setTimeout(tick, 400);
        return;
      }
      timeout = setTimeout(tick, deletingSpeed);
    } else {
      contentEl.textContent = currentText.slice(0, currentCharIndex + 1);
      currentCharIndex++;

      if (currentCharIndex === currentText.length) {
        if (texts.length === 1 && !loop) return;
        timeout = setTimeout(() => {
          isDeleting = true;
          tick();
        }, pauseDuration);
        return;
      }
      timeout = setTimeout(tick, typingSpeed);
    }
  }

  setTimeout(tick, initialDelay);
}

export { initTextType };
