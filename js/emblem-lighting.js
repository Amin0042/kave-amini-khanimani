/* Relight the vector's bevel, rather than sweeping an overlay over it. */
(function () {
  "use strict";
  const emblem = document.querySelector("[data-motion-emblem]");
  if (!emblem) return;
  const lights = emblem.querySelectorAll("feDistantLight");
  const point = emblem.querySelector("fePointLight");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  let visible = true;
  let frame = 0;
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  const clamp = (value, limit = 1) => Math.max(-limit, Math.min(limit, value));

  function paint(x, y) {
    lights.forEach(function (light, index) {
      light.setAttribute("azimuth", (225 + x * 48).toFixed(2));
      light.setAttribute("elevation", ((index ? 52 : 55) + y * 20).toFixed(2));
    });
    point.setAttribute("x", (-140 + x * 650).toFixed(2));
    point.setAttribute("y", (-200 + y * 650).toFixed(2));
  }

  function tick() {
    frame = 0;
    current.x += (target.x - current.x) * 0.16;
    current.y += (target.y - current.y) * 0.16;
    paint(current.x, current.y);
    if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.003) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  function aim(x, y) {
    if (reduced.matches || !visible || document.hidden) return;
    target = { x: clamp(x), y: clamp(y) };
    if (!frame) frame = window.requestAnimationFrame(tick);
  }

  function reset() {
    window.cancelAnimationFrame(frame);
    frame = 0;
    target = current = { x: 0, y: 0 };
    paint(0, 0);
  }

  function updatePreference() {
    if (reduced.matches || !fine.matches) reset();
  }
  reduced.addEventListener("change", updatePreference);
  fine.addEventListener("change", updatePreference);
  updatePreference();

  emblem.addEventListener("pointermove", function (event) {
    if (!fine.matches || event.pointerType === "touch") return;
    const rect = emblem.getBoundingClientRect();
    aim(((event.clientX - rect.left) / rect.width - 0.5) * 2,
      ((event.clientY - rect.top) / rect.height - 0.5) * 2);
  });
  emblem.addEventListener("pointerleave", function () {
    aim(0, 0);
  });
  document.addEventListener("visibilitychange", reset);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (!visible) reset();
    }).observe(emblem);
  }
})();
