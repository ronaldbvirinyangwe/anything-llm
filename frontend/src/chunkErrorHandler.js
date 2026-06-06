// src/chunkErrorHandler.js
window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});