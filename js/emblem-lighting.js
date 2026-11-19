/* Relight the vector's bevel, rather than sweeping an overlay over it. */
(function () {
  "use strict";
  const emblem = document.querySelector("[data-motion-emblem]");
  if (!emblem) return;
  const controls = document.querySelector("[data-emblem-controls]");
  const button = document.querySelector("[data-emblem-lighting]");
  const status = document.querySelector("[data-emblem-status]");
  const lights = emblem.querySelectorAll("feDistantLight");
  const point = emblem.querySelector("fePointLight");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const orientation = window.DeviceOrientationEvent;
  let enabled = false;
  let pending = false;
  let visible = true;
  let baseline = null;
  let frame = 0;
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  let sensorTimeout;
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
    baseline = null;
    target = current = { x: 0, y: 0 };
    paint(0, 0);
  }

  function onOrientation(event) {
    if (!enabled || reduced.matches || !visible || document.hidden ||
        !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    clearTimeout(sensorTimeout);
    status.textContent = "";
    if (!baseline) baseline = { beta: event.beta, gamma: event.gamma };
    // Shortest angular distance prevents a jump across the +/-180 seam.
    const delta = (value, initial) => ((value - initial + 540) % 360) - 180;
    const x = delta(event.gamma, baseline.gamma) / 28;
    const y = delta(event.beta, baseline.beta) / 28;
    const angle = ((window.screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI) / 180;
    aim(x * Math.cos(angle) + y * Math.sin(angle), y * Math.cos(angle) - x * Math.sin(angle));
  }

  function stop() {
    enabled = false;
    clearTimeout(sensorTimeout);
    window.removeEventListener("deviceorientation", onOrientation);
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Enable tilt lighting";
    reset();
  }

  button.addEventListener("click", async function () {
    if (pending) return;
    if (enabled) {
      stop();
      status.textContent = "Tilt lighting off.";
      return;
    }
    pending = true;
    button.disabled = true;
    try {
      // Call directly from this tap: Safari requires user activation.
      const permission = typeof orientation.requestPermission === "function"
        ? await orientation.requestPermission() : "granted";
      if (permission !== "granted") {
        status.textContent = "Motion access is off. Default lighting stays on.";
        return;
      }
      if (reduced.matches) return;
      enabled = true;
      baseline = null;
      button.setAttribute("aria-pressed", "true");
      button.textContent = "Disable tilt lighting";
      status.textContent = "Tilt your phone gently to catch the light.";
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
      sensorTimeout = window.setTimeout(function () {
        stop();
        status.textContent = "No motion data available. Default lighting stays on.";
      }, 6000);
    } catch (error) {
      stop();
      status.textContent = "Tilt lighting unavailable. Default lighting stays on.";
    } finally {
      pending = false;
      button.disabled = false;
    }
  });

  function updatePreference() {
    controls.hidden = reduced.matches || !window.isSecureContext || !orientation || fine.matches;
    if (reduced.matches) {
      stop();
      status.textContent = "";
    }
  }
  reduced.addEventListener("change", updatePreference);
  fine.addEventListener("change", updatePreference);
  updatePreference();

  emblem.addEventListener("pointermove", function (event) {
    if (!fine.matches || enabled || event.pointerType === "touch") return;
    const rect = emblem.getBoundingClientRect();
    aim(((event.clientX - rect.left) / rect.width - 0.5) * 2,
      ((event.clientY - rect.top) / rect.height - 0.5) * 2);
  });
  emblem.addEventListener("pointerleave", function () {
    if (!enabled) aim(0, 0);
  });
  document.addEventListener("visibilitychange", reset);
  window.addEventListener("orientationchange", reset);
  window.screen.orientation?.addEventListener("change", reset);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (!visible) reset();
    }).observe(emblem);
  }
})();
