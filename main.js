function initializeThemeToggle() {
  if (typeof document === "undefined") {
    return;
  }

  const navbarContainer = document.querySelector(".navbar .container-fluid");

  if (!navbarContainer || navbarContainer.querySelector(".theme-toggle-btn")) {
    return;
  }

  const themeButton = document.createElement("button");
  themeButton.type = "button";
  themeButton.className = "theme-toggle-btn";
  themeButton.setAttribute("aria-label", "Toggle light and dark mode");
  themeButton.setAttribute("title", "Toggle light and dark mode");
  themeButton.innerHTML = `
    <img class="theme-toggle-icon theme-icon-sun" src="/Assets/Icons/sun.svg" alt="Sun" aria-hidden="true" />
    <img class="theme-toggle-icon theme-icon-moon" src="/Assets/Icons/moon.svg" alt="Moon" aria-hidden="true" />
  `;

  // Insert as a list item in the navbar menu for desktop
  const navbarNav = navbarContainer.querySelector(".navbar-nav");
  
  if (navbarNav) {
    const themeToggleItem = document.createElement("li");
    themeToggleItem.className = "nav-item theme-toggle-item";
    themeToggleItem.appendChild(themeButton);
    navbarNav.appendChild(themeToggleItem);
  } else {
    // Fallback for mobile: insert before navbar-toggler
    const navToggler = navbarContainer.querySelector(".navbar-toggler");
    if (navToggler) {
      navbarContainer.insertBefore(themeButton, navToggler);
    } else {
      navbarContainer.appendChild(themeButton);
    }
  }

  const setTheme = function (isLight) {
    document.body.classList.toggle("light", isLight);
    themeButton.setAttribute("aria-pressed", String(isLight));
    themeButton.setAttribute(
      "aria-label",
      isLight ? "Switch to dark mode" : "Switch to light mode"
    );
    themeButton.title = isLight ? "Switch to dark mode" : "Switch to light mode";

    try {
      window.localStorage.setItem(
        "january8th-theme",
        isLight ? "light" : "dark"
      );
    } catch (error) {
      // Ignore storage access failures (private browsing, disabled cookies, etc.).
    }
  };

  // Default to dark mode for first-time visitors (no saved preference) —
  // the site no longer follows the OS light/dark preference on first load,
  // it only follows it once a visitor has explicitly chosen light mode
  // and we remember that choice.
  let prefersLight = false;

  try {
    const savedTheme = window.localStorage.getItem("january8th-theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      prefersLight = savedTheme === "light";
    }
  } catch (error) {
    prefersLight = false;
  }

  setTheme(prefersLight);

  themeButton.addEventListener("click", function () {
    const nextTheme = !document.body.classList.contains("light");
    setTheme(nextTheme);
  });
}

function initializeContactHints() {
  if (typeof document === "undefined") {
    return;
  }

  const fields = document.querySelectorAll(".contact-field");

  fields.forEach(function (field) {
    const input = field.querySelector("input, textarea");
    const hint = field.querySelector(".contact-hint");

    if (!input || !hint) {
      return;
    }

    const showHint = function () {
      field.classList.add("is-focused");
      hint.setAttribute("aria-hidden", "false");
    };

    const hideHint = function () {
      field.classList.remove("is-focused");
      hint.setAttribute("aria-hidden", "true");
    };

    input.addEventListener("focus", showHint);
    input.addEventListener("click", showHint);
    input.addEventListener("blur", hideHint);

    hideHint();
  });
}

function initializeContactForm() {
  if (typeof document === "undefined") {
    return;
  }

  const form = document.querySelector("#contact-form");

  if (!form) {
    return;
  }

  const status = form.querySelector("#contact-form-status");
  const submitButton = form.querySelector('button[type="submit"]');

  const setStatus = function (message, tone) {
    if (!status) {
      return;
    }
    status.textContent = message;
    status.classList.remove("is-success", "is-error");
    if (tone) {
      status.classList.add(tone);
    }
  };

  form.addEventListener("submit", function (event) {
    // FormSubmit.co is a hosted relay: it accepts this POST and forwards it
    // as an email to the address in the form's action attribute, with no
    // backend of our own required. Submitting via fetch (instead of a plain
    // form POST) keeps the visitor on this page — a normal submit would
    // navigate them away to FormSubmit's own confirmation page — and lets
    // us show a message in place, matching the rest of the site's feel.
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
    }
    setStatus("Sending your message...", null);

    const formData = new FormData(form);

    fetch(form.action, {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" },
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Request failed with status " + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        // FormSubmit replies with HTTP 200 even when it did NOT deliver the
        // email — e.g. while its one-time per-domain activation is still
        // pending, or if it silently rejects the request for some other
        // reason. The real signal is the JSON body's own success field, not
        // the HTTP status, so that case has to be treated as a failure here
        // rather than shown to the visitor as "message sent."
        if (data && String(data.success).toLowerCase() === "false") {
          throw new Error(data.message || "FormSubmit rejected the request");
        }
        form.reset();
        setStatus(
          "Message sent — thank you. I'll get back to you soon.",
          "is-success"
        );
      })
      .catch(function () {
        setStatus(
          "Something went wrong sending that. Please try again, or email amini.kave95@gmail.com directly.",
          "is-error"
        );
      })
      .finally(function () {
        if (submitButton) {
          submitButton.disabled = false;
        }
      });
  });
}

function initializePageTransitions() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    return;
  }

  // Must match the --chamber-duration value in style.css exactly — this is
  // how long the doors take to swing shut before we actually change pages.
  const CHAMBER_DURATION_MS = 650;

  document.addEventListener("click", function (event) {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const link = event.target.closest("a[href]");

    if (!link) {
      return;
    }

    const href = link.getAttribute("href");

    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      return;
    }

    if (link.target && link.target !== "_self") {
      return;
    }

    if (link.hasAttribute("download")) {
      return;
    }

    let destination;

    try {
      destination = new URL(href, window.location.href);
    } catch (error) {
      return;
    }

    // Different site entirely — let the browser navigate away plainly,
    // there is no next chamber of this cathedral to reveal.
    if (destination.origin !== window.location.origin) {
      return;
    }

    // A link to an anchor on the page already open is an in-page scroll,
    // not a move between chambers — leave it alone.
    if (
      destination.pathname === window.location.pathname &&
      destination.hash
    ) {
      return;
    }

    event.preventDefault();
    document.body.classList.add("chamber-exit");

    window.setTimeout(function () {
      window.location.href = destination.href;
    }, CHAMBER_DURATION_MS);
  });

  // A back/forward navigation can restore this exact document from bfcache
  // with .chamber-exit still applied from the moment it was left — drop it
  // so the doors are open, not stuck sealed, on the restored page.
  window.addEventListener("pageshow", function () {
    document.body.classList.remove("chamber-exit");
    settleChamber();
  });

  // Safety net: the opening reveal is a CSS animation left to play on its
  // own, and mobile browsers can pause or drop it mid-frame — the tab gets
  // backgrounded, the OS takes a screenshot, Low Power Mode throttles it —
  // with nothing to resume it, leaving the doors/guardians frozen part-open
  // over the real page forever instead of finishing their swing. Once
  // enough time has passed for the reveal to have genuinely finished,
  // .chamber-settled forces the true "fully open" end state directly (see
  // style.css), overriding whatever frame the animation actually stalled
  // on. It has no effect on a later chamber-exit close, since an *active*
  // animation's transform always outranks this static fallback.
  function settleChamber() {
    window.setTimeout(function () {
      if (!document.body.classList.contains("chamber-exit")) {
        document.body.classList.add("chamber-settled");
      }
    }, CHAMBER_DURATION_MS + 100);
  }

  settleChamber();
}

function initializeChamberGuardians() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Same call as the doors themselves: no sentries without the doors that
  // carry them, and a static, unanimated lion left sitting over the page
  // would just be clutter under reduced motion.
  if (reduceMotion) {
    return;
  }

  [
    ["chamber-guardian-left", "chamber-guardian-art"],
    ["chamber-guardian-right", "chamber-guardian-art"],
  ].forEach(function (classes) {
    const guardian = document.createElement("div");
    guardian.className = "chamber-guardian " + classes[0];
    guardian.setAttribute("aria-hidden", "true");

    const art = document.createElement("div");
    art.className = classes[1];
    guardian.appendChild(art);

    document.body.appendChild(guardian);
  });
}

function initializeMagneticFooterLinks() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    return;
  }

  const links = document.querySelectorAll(
    ".footer-navigation a, .footer-contact a, .footer-title a"
  );

  if (!links.length) {
    return;
  }

  // How far a link is allowed to be pulled toward the cursor, in pixels,
  // and how far outside its own box the pull field still reaches.
  const maxPull = 10;
  const catchRadius = 28;

  links.forEach(function (link) {
    let frame = null;

    const settle = function (x, y, ease) {
      link.style.transition = ease
        ? "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)"
        : "transform 0.05s linear";
      link.style.transform = "translate(" + x + "px, " + y + "px)";
    };

    const onMove = function (event) {
      if (event.pointerType === "touch") {
        return;
      }

      const rect = link.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      const reach = Math.max(rect.width, rect.height) / 2 + catchRadius;
      const distance = Math.hypot(dx, dy);

      if (distance > reach) {
        return;
      }

      // Pull strength fades to 0 at the edge of the catch radius and peaks
      // at the link's own center, so the tug feels magnetic, not linear.
      const pull = 1 - distance / reach;
      const targetX = (dx / reach) * maxPull * pull;
      const targetY = (dy / reach) * maxPull * pull;

      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(function () {
        settle(targetX, targetY, false);
      });
    };

    const onLeave = function () {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      settle(0, 0, true);
    };

    link.addEventListener("pointermove", onMove);
    link.addEventListener("pointerleave", onLeave);
  });
}

function initializeLogoSignatureAnimation() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion) {
    return;
  }

  // The rose-medallion's sacred "breath" (grow, bloom with holy light,
  // settle) is driven by CSS on :hover/:focus-visible for pointer users.
  // Touch devices never fire :hover, so a tap here adds the same
  // .glyph-spin class the CSS keyframe listens for, and removes it once
  // the animation finishes so the very next tap can replay it.
  const marks = document.querySelectorAll(".navbar-brand, .footer-title a");

  marks.forEach(function (mark) {
    // Each mark now holds two stacked images (.logo-dark / .logo-light) so
    // the lion glyph can swap with the light/dark theme — only one is ever
    // visible at a time, but a tap should replay the breath on whichever
    // one that is, so both are wired up here rather than just the first.
    const glyphs = mark.querySelectorAll("img");

    if (!glyphs.length) {
      return;
    }

    glyphs.forEach(function (glyph) {
      glyph.addEventListener("animationend", function (event) {
        if (event.animationName === "glyph-awaken") {
          glyph.classList.remove("glyph-spin");
        }
      });
    });

    mark.addEventListener("click", function () {
      glyphs.forEach(function (glyph) {
        glyph.classList.remove("glyph-spin");
        void glyph.offsetWidth; // restart the animation even on rapid repeat taps
        glyph.classList.add("glyph-spin");
      });
    });
  });
}

// Navbar brand: the Iranian flag that unfurls from the bar's lower
// border on hover. The unfurl itself is CSS (see .brand-flag in
// style.css); this only feeds it the two lengths CSS cannot work out on
// its own, as custom properties on each flag:
//   --brand-mark-w     the rendered width of the lion mark, which the
//                      flag's own width and hang length are both derived
//                      from. The mark is an SVG whose height follows an
//                      aspect ratio the stylesheet never states, and its
//                      width changes across four breakpoints.
//   --brand-flag-drop  the distance from the bottom of the mark down to
//                      the inside of the bar's lower border, so the
//                      flag hangs from the border rather than from the
//                      logo. It shifts with the bar's height — which
//                      grows when the mobile menu opens.
// Both have CSS fallbacks, so a page where this never runs still shows
// the flag in a sensible place.
function initializeBrandFlag() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const flags = Array.prototype.slice.call(
    document.querySelectorAll(".navbar-brand .brand-flag")
  );

  if (!flags.length) {
    return;
  }

  function measure() {
    flags.forEach(function (flag) {
      const mark = flag.parentElement;
      const navbar = flag.closest(".navbar");

      if (!mark || !navbar) {
        return;
      }

      // Whichever lion is showing for the current theme — the other is
      // display: none and reports a width of 0.
      const icon = Array.prototype.slice
        .call(mark.querySelectorAll(".icon"))
        .filter(function (img) {
          return img.offsetWidth > 0;
        })[0];

      const markRect = mark.getBoundingClientRect();
      const navRect = navbar.getBoundingClientRect();
      const border =
        parseFloat(window.getComputedStyle(navbar).borderBottomWidth) || 0;
      const drop = navRect.bottom - border - markRect.bottom;

      if (icon && icon.offsetWidth) {
        flag.style.setProperty("--brand-mark-w", icon.offsetWidth + "px");
      }

      // Not rounded: the mark can sit at a fractional offset, and it's the
      // unrounded drop that lands the flag's top exactly on the border's
      // whole-pixel edge, keeping the emblem crisp.
      flag.style.setProperty("--brand-flag-drop", Math.max(0, drop) + "px");
    });
  }

  let queued = false;

  function scheduleMeasure() {
    if (queued) {
      return;
    }

    queued = true;
    window.requestAnimationFrame(function () {
      queued = false;
      measure();
    });
  }

  measure();
  window.addEventListener("resize", scheduleMeasure);

  // Cormorant Garamond loading can change the brand's height, and so the
  // drop, after first paint.
  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(scheduleMeasure);
  }

  // The bar itself grows and shrinks when the mobile menu collapses open
  // or shut, which moves the border the flag hangs from.
  if (typeof window.ResizeObserver === "function") {
    const observer = new ResizeObserver(scheduleMeasure);

    flags.forEach(function (flag) {
      const navbar = flag.closest(".navbar");

      if (navbar) {
        observer.observe(navbar);
      }
    });
  }
}

// About page: the beam of gold light that rises from the Ottawa point
// on the Canada map (.about-map-marker) to the bottom of the portrait frame
// (.about-portrait), as if the portrait emerges out of Ottawa. The two
// sit in different sections and move independently with the layout (two
// columns on desktop, stacked on phones), so the curve is measured in

// Footer: the Lion and Sun flag along the bottom edge (#footer::before
// and ::after in style.css). Its emblem is a pre-scaled tile meant to be
// drawn 1:1, but at fractional display scaling (125%, 150%, 175%) the
// page usually ends between device pixels. Scrolled to the bottom, the
// whole page then sits a fraction of a pixel off the screen's grid and
// the browser resamples — and softens — the tile. This measures those
// remainders and hands CSS three small corrections:
//   --footer-flag-pad  extra footer padding (under 8px) so the page ends
//                      on a pixel whole in both CSS and device pixels
//   --footer-flag-nx   horizontal shift of the emblem tile
//   --footer-flag-ny   how far the flag grows upward so its top, where
//                      the tile is anchored, lands on a whole pixel
// All fall back to 0px in CSS, which is already exact at 100%/200%/300%.
function initializeFooterFlag() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const footer = document.getElementById("footer");

  if (!footer) {
    return;
  }

  function measure() {
    const dpr = window.devicePixelRatio || 1;
    const styles = window.getComputedStyle(footer);
    const flagHeight = parseFloat(styles.getPropertyValue("--footer-flag-h"));
    const emblemWidth = parseFloat(
      styles.getPropertyValue("--footer-flag-emblem-w")
    );

    if (!flagHeight || !emblemWidth) {
      return;
    }

    const rect = footer.getBoundingClientRect();
    const currentPad =
      parseFloat(footer.style.getPropertyValue("--footer-flag-pad")) || 0;
    // Page coordinates, without the padding this function added last time.
    const pageEnd = rect.bottom + window.scrollY - currentPad;
    // The browser's furthest scroll position is always a whole CSS pixel,
    // so the page has to end on a whole CSS pixel that is *also* a whole
    // device pixel (a multiple of 4px at 125%/175%, 2px at 150%) for the
    // flag to land on the screen's grid when scrolled to the bottom. At
    // unusual zoom levels with no such pixel close by, a whole CSS pixel
    // is the best available.
    let end = Math.ceil(pageEnd - 0.001);

    for (let candidate = end; candidate < end + 8; candidate += 1) {
      const devicePixels = candidate * dpr;

      if (Math.abs(devicePixels - Math.round(devicePixels)) < 0.01) {
        end = candidate;
        break;
      }
    }

    const top = (end - flagHeight) * dpr;
    // Same rule sideways: the browser places boxes on whole CSS pixels, so
    // the emblem takes the nearest one that's also a whole device pixel —
    // never more than 2px off true centre.
    const centred =
      rect.left + window.scrollX + (rect.width - emblemWidth) / 2;
    let left = Math.round(centred);

    for (let step = 0; step <= 4; step += 1) {
      const options = [Math.round(centred) - step, Math.round(centred) + step];
      const match = options.filter(function (candidate) {
        const devicePixels = candidate * dpr;
        return Math.abs(devicePixels - Math.round(devicePixels)) < 0.01;
      })[0];

      if (match !== undefined) {
        left = match;
        break;
      }
    }

    footer.style.setProperty(
      "--footer-flag-pad",
      Math.max(0, end - pageEnd) + "px"
    );
    footer.style.setProperty(
      "--footer-flag-ny",
      (top - Math.floor(top + 0.001)) / dpr + "px"
    );
    footer.style.setProperty("--footer-flag-nx", left - centred + "px");
  }

  let queued = false;

  function scheduleMeasure() {
    if (queued) {
      return;
    }

    queued = true;
    window.requestAnimationFrame(function () {
      queued = false;
      measure();
    });
  }

  measure();
  // Resize also fires on browser zoom, which changes devicePixelRatio.
  window.addEventListener("resize", scheduleMeasure);
  window.addEventListener("load", scheduleMeasure);

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(scheduleMeasure);
  }

  // Anything above the footer changing height (images and videos
  // loading, panels expanding) moves the footer's offset on the page.
  if (typeof window.ResizeObserver === "function") {
    new ResizeObserver(scheduleMeasure).observe(document.body);
  }
}

// page coordinates and redrawn whenever the layout can change. The SVG
// is sized to the curve's own bounds so it never widens the page.
function initializeAboutConnector() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const connector = document.querySelector(".about-connector");
  const marker = document.querySelector(".about-map-marker");
  const portrait = document.querySelector(".about-portrait");

  if (!connector || !marker || !portrait) {
    return;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  const bloom = connector.querySelector(".about-beam-bloom");
  const glow = connector.querySelector(".about-beam-glow");
  const core = connector.querySelector(".about-beam-core");
  const source = connector.querySelector(".about-beam-source");
  const rays = connector.querySelector(".about-beam-rays");
  const motes = connector.querySelector(".about-beam-motes");
  const flare = connector.querySelector(".about-beam-flare");
  const gradients = connector.querySelectorAll("linearGradient");
  // Room around the curve for the widest, softest layer's blur.
  const PAD = 90;
  const SAMPLES = 64;

  // Fixed pseudo-random sequence, so the motes and rays land in the same
  // places on every visit rather than reshuffling on each load.
  function seeded(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function cubic(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return (
      u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3
    );
  }

  // A closed shape that follows the curve, `from` wide at Ottawa and `to`
  // wide at the frame: the taper is what turns a line into a beam of
  // light spreading out as it rises.
  function taper(points, from, to, easing) {
    const leftSide = [];
    const rightSide = [];

    points.forEach(function (point, i) {
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dx = next[0] - prev[0];
      const dy = next[1] - prev[1];
      const length = Math.hypot(dx, dy) || 1;
      const half =
        (from + (to - from) * Math.pow(i / (points.length - 1), easing)) / 2;
      const nx = (-dy / length) * half;
      const ny = (dx / length) * half;
      leftSide.push(
        (point[0] + nx).toFixed(1) + " " + (point[1] + ny).toFixed(1)
      );
      rightSide.unshift(
        (point[0] - nx).toFixed(1) + " " + (point[1] - ny).toFixed(1)
      );
    });

    return "M" + leftSide.join("L") + "L" + rightSide.join("L") + "Z";
  }

  function measure() {
    const markerRect = marker.getBoundingClientRect();
    const portraitRect = portrait.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Ottawa (start) and the middle of the frame's lower edge (end).
    const sx = markerRect.left + markerRect.width / 2 + scrollX;
    const sy = markerRect.top + markerRect.height / 2 + scrollY;
    const ex = portraitRect.left + portraitRect.width / 2 + scrollX;
    const ey = portraitRect.bottom + scrollY;

    if (!markerRect.width || !portraitRect.width || sy <= ey) {
      connector.style.display = "none";
      return;
    }

    connector.style.display = "";

    const left = Math.min(sx, ex) - PAD;
    const top = ey - PAD;
    const width = Math.abs(sx - ex) + PAD * 2;
    const height = sy - ey + PAD * 2;
    const x0 = sx - left;
    const y0 = sy - top;
    const x1 = ex - left;
    const y1 = ey - top;
    // Leave Ottawa heading straight up and arrive straight up into the
    // frame, easing between the two in a single S-curve.
    const bend = (y0 - y1) * 0.5;
    const points = [];

    for (let i = 0; i <= SAMPLES; i += 1) {
      const t = i / SAMPLES;
      points.push([
        cubic(x0, x0, x1, x1, t),
        cubic(y0, y0 - bend, y1 + bend, y1, t),
      ]);
    }

    // The beam's reach at the frame scales with the frame, within limits.
    const reach = Math.max(40, Math.min(portraitRect.width * 0.42, 140));

    connector.style.left = left + "px";
    connector.style.top = top + "px";
    connector.style.width = width + "px";
    connector.style.height = height + "px";
    connector.setAttribute("viewBox", "0 0 " + width + " " + height);

    bloom.setAttribute("d", taper(points, 10, reach, 1.6));
    glow.setAttribute("d", taper(points, 5, reach * 0.3, 1.4));
    core.setAttribute("d", taper(points, 2.2, 3.2, 1));

    gradients.forEach(function (gradient) {
      gradient.setAttribute("x1", x0);
      gradient.setAttribute("y1", y0);
      gradient.setAttribute("x2", x1);
      gradient.setAttribute("y2", y1);
    });

    // Where the light is born: a glowing source and a starburst of rays,
    // longer upward, as if the light is being thrown toward the frame.
    source.setAttribute("cx", x0);
    source.setAttribute("cy", y0);
    source.setAttribute("r", 34);

    const random = seeded(19);
    rays.textContent = "";

    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2 + (random() - 0.5) * 0.25;
      const upward = Math.max(0, -Math.sin(angle));
      const length = 10 + random() * 8 + upward * 22;
      const ray = document.createElementNS(SVG_NS, "line");
      ray.setAttribute("x1", (x0 + Math.cos(angle) * 7).toFixed(1));
      ray.setAttribute("y1", (y0 + Math.sin(angle) * 7).toFixed(1));
      ray.setAttribute("x2", (x0 + Math.cos(angle) * (7 + length)).toFixed(1));
      ray.setAttribute("y2", (y0 + Math.sin(angle) * (7 + length)).toFixed(1));
      ray.setAttribute("stroke-opacity", (0.35 + random() * 0.45).toFixed(2));
      rays.appendChild(ray);
    }

    // Motes of light suspended in the beam, spreading with it.
    motes.textContent = "";

    for (let i = 0; i < 46; i += 1) {
      const t = Math.pow(random(), 0.8);
      const index = Math.round(t * SAMPLES);
      const spread = (10 + (reach - 10) * Math.pow(t, 1.6)) * 0.5;
      const mote = document.createElementNS(SVG_NS, "circle");
      mote.setAttribute(
        "cx",
        (points[index][0] + (random() - 0.5) * 2 * spread * 0.8).toFixed(1)
      );
      mote.setAttribute("cy", (points[index][1] + (random() - 0.5) * 6).toFixed(1));
      mote.setAttribute("r", (0.6 + random() * 1.5).toFixed(1));
      mote.setAttribute("fill-opacity", (0.3 + random() * 0.6).toFixed(2));
      motes.appendChild(mote);
    }

    // The light pooling along the frame's lower edge.
    flare.setAttribute("cx", x1);
    flare.setAttribute("cy", y1);
    flare.setAttribute("rx", Math.min(portraitRect.width * 0.4, 150));
    flare.setAttribute("ry", 12);
  }

  let queued = false;

  function scheduleMeasure() {
    if (queued) {
      return;
    }

    queued = true;
    window.requestAnimationFrame(function () {
      queued = false;
      measure();
    });
  }

  measure();
  window.addEventListener("resize", scheduleMeasure);
  window.addEventListener("load", scheduleMeasure);

  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    document.fonts.ready.then(scheduleMeasure);
  }

  // Text reflowing or images loading above either end moves them.
  if (typeof window.ResizeObserver === "function") {
    new ResizeObserver(scheduleMeasure).observe(document.body);
  }
}

// About page: the Human / Digital switch above the portrait. "Digital"
// rebuilds the photo as a field of gold pixels on a canvas. The photo is
// sampled on a coarse grid; the cool grey studio backdrop drops out, and
// every remaining cell becomes a square whose size and gold follow the
// photo's light. Brightness is judged against each cell's surroundings
// rather than the whole picture, so the face keeps its features beside
// the much brighter shirt. Pixels near the cursor (or a tap) are pushed
// aside and spring back home; the canvas only animates while something
// is still moving, and is only built the first time "Digital" is chosen.
function initializeDigitalPortrait() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const toggle = document.querySelector(".about-portrait-column .portrait-toggle");
  const portrait = document.querySelector(".about-portrait");
  const photo = portrait && portrait.querySelector(".about-portrait-img");
  const canvas =
    portrait && portrait.querySelector(".about-portrait-digital canvas");

  if (!toggle || !photo || !canvas || !canvas.getContext) {
    return;
  }

  const context = canvas.getContext("2d");
  const buttons = toggle.querySelectorAll("[data-portrait-mode]");
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Grid pitch and the cursor's reach, both in CSS pixels.
  const CELL = 5;
  const RADIUS = 64;
  const PUSH = 3.2;
  const SPRING = 0.07;
  const DAMPING = 0.8;
  // Dark bronze → brand gold → hot gold → warm white, in 16 steps so the
  // whole field is drawn with 16 fill colours instead of one per pixel.
  const RAMP = [
    [70, 52, 22],
    [170, 135, 62],
    [232, 192, 105],
    [255, 226, 160],
    [255, 248, 228],
  ];
  const LEVELS = 16;
  const palette = [];

  for (let level = 0; level < LEVELS; level++) {
    const position = (level / (LEVELS - 1)) * (RAMP.length - 1);
    const index = Math.min(Math.floor(position), RAMP.length - 2);
    const mix = position - index;
    palette.push(
      "rgb(" +
        RAMP[index]
          .map(function (channel, c) {
            return Math.round(channel + (RAMP[index + 1][c] - channel) * mix);
          })
          .join(",") +
        ")"
    );
  }

  let field = null;
  let builtWidth = 0;
  let pointer = null;
  let frame = 0;
  let tapTimer = 0;

  function luminance(data, i) {
    return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }

  // One square per kept cell, in typed arrays: home (hx, hy), position,
  // velocity and size, grouped by colour level for drawing.
  function build() {
    const width = portrait.clientWidth;
    const height = portrait.clientHeight;

    if (!width || !height || !photo.naturalWidth) {
      return false;
    }

    // Up to 3x, so the squares stay razor-edged on high-density phones.
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const cols = Math.floor(width / CELL);
    const rows = Math.floor(height / CELL);
    const offsetX = (width - cols * CELL) / 2 + CELL / 2;
    const offsetY = (height - rows * CELL) / 2 + CELL / 2;

    // Same crop as the <img>: object-fit cover, anchored to the top.
    const sample = document.createElement("canvas");
    sample.width = cols;
    sample.height = rows;
    const sampleContext = sample.getContext("2d", { willReadFrequently: true });
    const scale = Math.max(cols / photo.naturalWidth, rows / photo.naturalHeight);
    const drawWidth = photo.naturalWidth * scale;
    sampleContext.drawImage(
      photo,
      (cols - drawWidth) / 2,
      0,
      drawWidth,
      photo.naturalHeight * scale
    );

    // Each cell's surroundings: the grid shrunk sixfold and stretched
    // back with smoothing, i.e. a cheap blur.
    const blurred = document.createElement("canvas");
    blurred.width = Math.max(1, Math.round(cols / 6));
    blurred.height = Math.max(1, Math.round(rows / 6));
    blurred.getContext("2d").drawImage(sample, 0, 0, blurred.width, blurred.height);
    const surround = document.createElement("canvas");
    surround.width = cols;
    surround.height = rows;
    const surroundContext = surround.getContext("2d", { willReadFrequently: true });
    surroundContext.imageSmoothingQuality = "high";
    surroundContext.drawImage(blurred, 0, 0, cols, rows);

    let pixels;
    let means;

    try {
      pixels = sampleContext.getImageData(0, 0, cols, rows).data;
      means = surroundContext.getImageData(0, 0, cols, rows).data;
    } catch (error) {
      // A cross-origin or file:// photo can't be read back; stay human.
      return false;
    }

    const kept = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = (row * cols + col) * 4;
        const light = luminance(pixels, i);
        const warmth = pixels[i] - pixels[i + 2];

        // The backdrop is a dim, slightly blue grey: skin, tie and shirt
        // are all either warmer than it or much brighter.
        if (light <= 0.42 && !(warmth > 10 && light > 0.16)) {
          continue;
        }

        const mean = luminance(means, i);
        const tone = Math.min(
          1,
          Math.max(0, 0.56 + 0.5 * (mean - 0.55) + 2.4 * (light - mean))
        );
        kept.push(col, row, tone);
      }
    }

    const count = kept.length / 3;
    const byLevel = [];

    for (let level = 0; level < LEVELS; level++) {
      byLevel.push([]);
    }

    field = {
      count: count,
      ratio: ratio,
      width: width,
      height: height,
      hx: new Float32Array(count),
      hy: new Float32Array(count),
      x: new Float32Array(count),
      y: new Float32Array(count),
      vx: new Float32Array(count),
      vy: new Float32Array(count),
      size: new Float32Array(count),
      levels: null,
    };

    for (let n = 0; n < count; n++) {
      const tone = kept[n * 3 + 2];
      field.hx[n] = field.x[n] = offsetX + kept[n * 3] * CELL;
      field.hy[n] = field.y[n] = offsetY + kept[n * 3 + 1] * CELL;
      // Whole device pixels wide, so no square has a blurred edge.
      field.size[n] =
        Math.max(1, Math.round(CELL * (0.2 + 0.6 * tone) * ratio)) / ratio;
      byLevel[Math.round(tone * (LEVELS - 1))].push(n);
    }

    field.levels = byLevel.map(function (list) {
      return Uint32Array.from(list);
    });
    builtWidth = width;
    return true;
  }

  // Each square's corner is snapped to the device-pixel grid as well.
  function draw() {
    const ratio = field.ratio;
    context.clearRect(0, 0, field.width, field.height);

    for (let level = 0; level < LEVELS; level++) {
      const list = field.levels[level];
      context.fillStyle = palette[level];

      for (let k = 0; k < list.length; k++) {
        const n = list[k];
        const size = field.size[n];
        context.fillRect(
          Math.round((field.x[n] - size / 2) * ratio) / ratio,
          Math.round((field.y[n] - size / 2) * ratio) / ratio,
          size,
          size
        );
      }
    }
  }

  // Springs every square toward home, adds the cursor's push, and reports
  // whether anything is still visibly moving.
  function step() {
    const { hx, hy, x, y, vx, vy } = field;
    const reach = RADIUS * RADIUS;
    let moving = false;

    for (let n = 0; n < field.count; n++) {
      let ax = (hx[n] - x[n]) * SPRING;
      let ay = (hy[n] - y[n]) * SPRING;

      if (pointer) {
        const dx = x[n] - pointer.x;
        const dy = y[n] - pointer.y;
        const distance2 = dx * dx + dy * dy;

        if (distance2 < reach && distance2 > 0.01) {
          const distance = Math.sqrt(distance2);
          const force = (1 - distance / RADIUS) * PUSH;
          ax += (dx / distance) * force;
          ay += (dy / distance) * force;
        }
      }

      vx[n] = (vx[n] + ax) * DAMPING;
      vy[n] = (vy[n] + ay) * DAMPING;
      x[n] += vx[n];
      y[n] += vy[n];

      if (
        !moving &&
        (Math.abs(vx[n]) > 0.02 ||
          Math.abs(vy[n]) > 0.02 ||
          Math.abs(hx[n] - x[n]) > 0.05 ||
          Math.abs(hy[n] - y[n]) > 0.05)
      ) {
        moving = true;
      }
    }

    return moving;
  }

  function tick() {
    frame = 0;
    const moving = step();
    draw();

    if (moving) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  function wake() {
    if (!frame && field && !reduceMotion) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  function setMode(mode) {
    const digital = mode === "digital";

    if (digital) {
      if (!photo.complete || !photo.naturalWidth) {
        photo.addEventListener(
          "load",
          function () {
            setMode(mode);
          },
          { once: true }
        );
        return;
      }

      if ((!field || builtWidth !== portrait.clientWidth) && !build()) {
        toggle.hidden = true;
        return;
      }

      draw();
    } else if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }

    portrait.classList.toggle("is-digital", digital);

    // Safari can keep showing a canvas as it was while hidden (blank)
    // after it's revealed; drawing again once it's visible fixes that.
    if (digital) {
      window.requestAnimationFrame(function () {
        if (portrait.classList.contains("is-digital") && field) {
          draw();
        }
      });
    }
    toggle.dataset.mode = mode;
    buttons.forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.portraitMode === mode)
      );
    });
  }

  function pointAt(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointermove", function (event) {
    if (event.pointerType === "mouse") {
      pointer = pointAt(event);
      wake();
    }
  });

  canvas.addEventListener("pointerleave", function () {
    pointer = null;
    wake();
  });

  // Touch has no hover: a tap pushes the pixels aside for a moment.
  canvas.addEventListener("pointerdown", function (event) {
    pointer = pointAt(event);
    wake();
    window.clearTimeout(tapTimer);
    tapTimer = window.setTimeout(function () {
      if (event.pointerType !== "mouse") {
        pointer = null;
      }
    }, 220);
  });

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      setMode(button.dataset.portraitMode);
    });
  });

  // The grid is built for the frame's width; rebuild when the layout
  // changes it (two columns ↔ stacked), but only while it's on show.
  if (typeof window.ResizeObserver === "function") {
    new ResizeObserver(function () {
      if (
        field &&
        portrait.classList.contains("is-digital") &&
        builtWidth !== portrait.clientWidth &&
        build()
      ) {
        draw();
      }
    }).observe(portrait);
  }

  toggle.hidden = false;
}

// Hero images: the Iran / Memory switch. "Memory" rebuilds the hero photo
// as gold sand on an ink ground, the way a place survives in memory: the
// stone kept, the sky gone dark, the light still there. The photo is
// sampled on a grid sized to the hero (about 60k grains whatever the
// screen); blue sky drops out, clouds and green thin to a faint dust,
// warm stone is kept whole, and each grain's size and gold follow its
// light judged against its surroundings, so carved edges and joints stay
// legible. Grains are jittered off the grid so they read as sand, not
// pixels. On entering Memory the sand rises and settles course by course
// from the ground up; afterwards the cursor (or a tap) scatters it and it
// settles back. The stone layer only redraws while something is moving;
// a second, light canvas of motes drifts in the sun's beam and is the
// only thing animating at rest, and it stops whenever the hero is off
// screen, the tab is hidden or Iran is chosen.
//
// Markup: <section data-memory-hero data-memory-src="…"
// [data-memory-src-small="…"] [data-memory-focus-y="0.12"]
// [data-memory-sun="x, y"] [data-memory-profile="cyrus|cliff|relief"]
// [data-memory-key="hero-view"]> holding .hero-memory (two canvases) and
// a .hero-toggle. focus-y matches the CSS background-position's vertical
// percentage so the crops line up. The profile says how that photo's
// surfaces are read (MEMORY_PROFILES); the key is where the choice is
// remembered, and must match the page's inline boot script.
function initializeMemoryHeroes() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const root = document.documentElement;
  const heroes = document.querySelectorAll("[data-memory-hero]");
  let pending = heroes.length;

  // The inline boot script in the page covers the hero in ink until the
  // sand is ready; each hero reports in once it has either built or
  // given up, and the cover lifts when the last one has.
  function settle() {
    pending -= 1;

    if (pending <= 0) {
      root.classList.remove("memory-boot");
    }
  }

  if (!pending) {
    root.classList.remove("memory-boot");
    return;
  }

  heroes.forEach(function (hero) {
    setupMemoryHero(hero, settle);
  });
}

// How each photo's surfaces are read into sand. A profile fills
// `surface` ({presence, tone}) for one cell and returns false to leave
// the cell as ink. r, g, b and light are 0–1; detail is the cell's light
// against its surroundings; sunDistance is in units of the sun's reach
// (<1 inside it); photoY is the cell's height in the photo, 0 at its top
// edge and 1 at its foot. Chosen with data-memory-profile; "cyrus" by
// default.
function clampUnit(value) {
  return Math.min(1, Math.max(0, value));
}

// Tomb of Cyrus (home). The subject is the stone, and backlit stone is
// darker than the clouds behind it (luminance ~0.3–0.45 against
// 0.65–0.95). So the stone's narrow range is stretched across almost all
// of the ramp, the clouds pushed back to a faint bronze dust, the sky to
// ink. Local contrast on top keeps joints, courses and the gable's
// shadow line crisp.
function readCyrusSurface(surface, r, g, b, light, detail, sunDistance) {
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const blue = b - Math.max(r, g);
  const green = g - Math.max(r, b);

  if (sunDistance < 1 && light > 0.6) {
    // The sun and its rays: dense and white-hot at the core, thinning
    // out to the haze so there's no edge to the disc.
    const core = 1 - sunDistance;
    surface.presence = core * core * (3 - 2 * core);
    surface.tone = 0.35 + 0.65 * core + detail;
  } else if (blue > 0.08) {
    // Open sky (and the blue hills beyond): gone to ink.
    return false;
  } else if (green > 0.025) {
    // Grass and trees: a thin, dim dust.
    surface.presence = 0.22;
    surface.tone = 0.18 + 0.6 * (light - 0.2) + 1.2 * detail;
  } else if (light > 0.56 && chroma < 0.12) {
    // Clouds and haze: a faint bronze breath behind the tomb.
    surface.presence = 0.34;
    surface.tone = 0.1 + 0.32 * (light - 0.56) + 0.8 * detail;
  } else if (light < 0.2) {
    // Deep shadow and dark ground: scattered, low grains.
    surface.presence = 0.45;
    surface.tone = 0.08 + 0.8 * light + 1.5 * detail;
  } else {
    // Stone: 0.2–0.5 luminance stretched to most of the ramp.
    surface.tone = 0.12 + 2.6 * (light - 0.2) + 2.8 * detail;
  }

  return true;
}
readCyrusSurface.hasSun = true;

// Naqsh-e Rostam (Archive). An overcast day with no sun, and here the
// cliff is bright (luminance ~0.5–0.75), about as bright as the clouds
// and the gravel, so brightness can't tell them apart. Warmth can: the
// carved limestone runs warm (red over blue by +0.11 to +0.21), while
// sky, clouds and gravel are neutral or cool (≤ +0.01). So warmth sorts
// the surfaces, the cliff gets a gentler stretch than Cyrus's stone (it
// is already bright, and its rough texture would turn to noise under the
// same detail gain), and the tomb façades, the warmest and richest stone
// in the frame, are lifted so they read first, ahead of the bare rock.
function readCliffSurface(surface, r, g, b, light, detail) {
  const blue = b - Math.max(r, g);
  const green = g - Math.max(r, b);
  const warm = r - b;

  if (blue > 0.05 && warm < 0) {
    // Open sky: gone to ink.
    return false;
  }

  if (warm < 0.035 && light > 0.86) {
    // Clouds: the barest breath, so the cliff's crest stands against
    // the dark as a clean silhouette.
    surface.presence = 0.1;
    surface.tone = 0.06 + 0.8 * detail;
  } else if (green > -0.025 && light > 0.2) {
    // Grass on the forecourt: a thin, dim dust.
    surface.presence = 0.12;
    surface.tone = 0.08 + 0.3 * (light - 0.2) + 0.8 * detail;
  } else if (warm < 0.06) {
    // Grey gravel and paving: a sparse, low dust, so the cliff
    // stands on dark ground.
    surface.presence = 0.16;
    surface.tone = 0.05 + 0.2 * (light - 0.3) + 0.9 * detail;
  } else {
    // Carved cliff, with the warmest stone (the façades) lifted. The
    // darker rock thins out (presence follows tone), so shade between
    // the cliff's columns and inside the tomb recesses opens to dark
    // air, and the façades, doorways and ledges read against it instead
    // of sinking into an even wall of grain.
    const rich = clampUnit((warm - 0.12) / 0.09);
    const tone = 0.01 + 1.1 * (light - 0.26) + 1.6 * detail + 0.34 * rich;
    surface.tone = tone;
    surface.presence = clampUnit(0.45 + 0.75 * tone);
  }

  return true;
}
readCliffSurface.hasSun = false;

// Persepolis relief wall (Contact). Hard midday sun, a saturated blue
// sky and a wall of low-relief carving whose stone (luminance ~0.3–0.55)
// is close to Cyrus's. Two things set it apart. The gravel at the foot is
// the same warm limestone but brighter (0.55–0.75), so colour can't tell
// it from the wall and it would burn hottest of all; it lies below the
// plinth line, so the cell's height in the photo (photoY, 0 at the top)
// sends it to dust. And the Faravahar, the heart of the wall, is carved
// in feathers finer than a grain and no brighter than the blocks around
// it, so brightness alone loses it. The light point sits on it
// (data-memory-sun), and inside that halo the carved edges are sharpened
// rather than brightened, so wings, ring and figure stand out of the
// stone. The friezes, warmer than the plain blocks (+0.16 to +0.19
// against +0.09), get a small lift so the carving reads before the
// masonry.
function readReliefSurface(
  surface,
  r,
  g,
  b,
  light,
  detail,
  sunDistance,
  photoY
) {
  const blue = b - Math.max(r, g);
  const green = g - Math.max(r, b);
  const warm = r - b;

  if (blue > 0.06) {
    // Sky: gone to ink.
    return false;
  }

  if (photoY > 0.957) {
    // Gravel below the plinth: low, scattered grains.
    surface.presence = 0.35;
    surface.tone = 0.05 + 0.3 * (light - 0.45) + 1.2 * detail;
  } else if (green > -0.06 && light > 0.2) {
    // Dry shrubs at the foot: a thin, dim dust.
    surface.presence = 0.3;
    surface.tone = 0.08 + 0.5 * (light - 0.2) + 1.2 * detail;
  } else if (light < 0.18) {
    // Deep-cut shadow: scattered, low grains.
    surface.presence = 0.5;
    surface.tone = 0.06 + 0.7 * light + 1.6 * detail;
  } else {
    // Carved stone, with the friezes lifted and the Faravahar's edges
    // sharpened inside the halo (smoothstep, ~3 sun reaches wide).
    const rich = clampUnit((warm - 0.1) / 0.08);
    const near = clampUnit(1 - sunDistance / 3.2);
    const halo = near * near * (3 - 2 * near);
    surface.tone =
      0.03 +
      1.6 * (light - 0.26) +
      (2.2 + 2.2 * halo) * detail +
      0.16 * rich +
      0.1 * halo;
  }

  return true;
}
readReliefSurface.hasSun = false;

const MEMORY_PROFILES = {
  cyrus: readCyrusSurface,
  cliff: readCliffSurface,
  relief: readReliefSurface,
};

function setupMemoryHero(hero, settle) {
  const layer = hero.querySelector(".hero-memory");
  const grainCanvas = layer && layer.querySelector(".hero-memory-grains");
  const moteCanvas = layer && layer.querySelector(".hero-memory-motes");
  const toggle = hero.querySelector(".hero-toggle");

  if (
    !layer ||
    !grainCanvas ||
    !moteCanvas ||
    !toggle ||
    !grainCanvas.getContext ||
    !hero.dataset.memorySrc
  ) {
    settle();
    return;
  }

  const grainContext = grainCanvas.getContext("2d");
  const moteContext = moteCanvas.getContext("2d");
  const buttons = toggle.querySelectorAll("[data-hero-mode]");
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallScreen =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 750px)").matches;
  // Same file the stylesheet (and the preload) picked, so it's cached.
  const source =
    smallScreen && hero.dataset.memorySrcSmall
      ? hero.dataset.memorySrcSmall
      : hero.dataset.memorySrc;
  const focusY = Math.min(
    1,
    Math.max(0, parseFloat(hero.dataset.memoryFocusY || "0.5") || 0)
  );
  // Where the sun is in the photo, as fractions of its width and height
  // ("0.478, 0.108"). Optional: without it the brightest neighbourhood in
  // the upper part is taken, which a bright cloud can outshine.
  const sunHint = (hero.dataset.memorySun || "")
    .split(",")
    .map(parseFloat)
    .filter(function (value) {
      return isFinite(value);
    });
  const profile =
    MEMORY_PROFILES[hero.dataset.memoryProfile] || MEMORY_PROFILES.cyrus;
  const clamp = clampUnit;
  // Each hero remembers its own choice (per tab); the page's inline boot
  // script reads the same key.
  const STORE_KEY = hero.dataset.memoryKey || "hero-view";

  // Grains: about this many whatever the hero's size, so a phone and a
  // 4K monitor cost the same to draw.
  const GRAIN_TARGET = 60000;
  // Cursor reach and push in CSS pixels; a softer, heavier spring than
  // the portrait's, so the sand drifts back rather than snapping.
  const RADIUS = 92;
  const PUSH = 2.4;
  const SPRING = 0.05;
  const DAMPING = 0.84;
  // Largest grain's half-width plus a pixel, in CSS pixels: the margin
  // a partial redraw needs so no grain is clipped at its edge.
  const CELL_MAX = 5;
  // Rise-and-settle on entering Memory: the ground course starts first
  // and each course above follows, in milliseconds.
  const RISE_SPREAD = 1150;
  const RISE_JITTER = 420;
  const RISE_DURATION = 950;
  // Dark bronze → brand gold → hot gold → warm white, quantised to 16
  // fills so the field is drawn with 16 colour changes, not 40k.
  const RAMP = [
    [58, 42, 18],
    [150, 116, 52],
    [214, 176, 96],
    [248, 216, 148],
    [255, 246, 222],
  ];
  const LEVELS = 16;
  const palette = [];

  for (let level = 0; level < LEVELS; level++) {
    const position = (level / (LEVELS - 1)) * (RAMP.length - 1);
    const index = Math.min(Math.floor(position), RAMP.length - 2);
    const mix = position - index;
    palette.push(
      "rgb(" +
        RAMP[index]
          .map(function (channel, c) {
            return Math.round(channel + (RAMP[index + 1][c] - channel) * mix);
          })
          .join(",") +
        ")"
    );
  }

  let image = null;
  let field = null;
  let motes = null;
  let mode = null;
  let pointer = null;
  let frame = 0;
  let tapTimer = 0;
  let resizeTimer = 0;
  let visible = true;
  let settled = false;
  let rise = null;
  let unsettled = false;
  let lastTime = 0;

  function reportIn() {
    if (!settled) {
      settled = true;
      settle();
    }
  }

  // Small seeded generator, so a rebuild after a resize scatters the
  // grains the same way and the picture doesn't shimmer.
  function random(seed) {
    let state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function luminance(data, i) {
    return (
      (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
    );
  }

  function build() {
    const width = hero.clientWidth;
    const height = hero.clientHeight;

    if (!width || !height || !image || !image.naturalWidth) {
      return false;
    }

    const area = width * height;
    // Device pixels up to 3x on phones, 2x on big heroes (a 2560-wide
    // hero at 3x would be a 30-megapixel canvas for no visible gain).
    const ratio = Math.min(window.devicePixelRatio || 1, area > 600000 ? 2 : 3);
    // Finer on small heroes, where the grain count would otherwise drop
    // so low the tomb turns to mosaic.
    const cell = Math.min(
      7,
      Math.max(area < 300000 ? 2.6 : 3.4, Math.sqrt(area / GRAIN_TARGET))
    );

    [grainCanvas, moteCanvas].forEach(function (canvas) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    });
    grainContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    moteContext.setTransform(ratio, 0, 0, ratio, 0, 0);

    const cols = Math.ceil(width / cell);
    const rows = Math.ceil(height / cell);

    // Same crop as the CSS background: cover, centred across, anchored
    // at focus-y down.
    const sample = document.createElement("canvas");
    sample.width = cols;
    sample.height = rows;
    const sampleContext = sample.getContext("2d", { willReadFrequently: true });
    const scale = Math.max(
      cols / image.naturalWidth,
      rows / image.naturalHeight
    );
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    sampleContext.imageSmoothingQuality = "high";
    sampleContext.drawImage(
      image,
      (cols - drawWidth) / 2,
      (rows - drawHeight) * focusY,
      drawWidth,
      drawHeight
    );

    // Each cell's surroundings: the grid shrunk eightfold and stretched
    // back with smoothing, i.e. a cheap blur.
    const blurred = document.createElement("canvas");
    blurred.width = Math.max(1, Math.round(cols / 8));
    blurred.height = Math.max(1, Math.round(rows / 8));
    blurred
      .getContext("2d")
      .drawImage(sample, 0, 0, blurred.width, blurred.height);
    const surround = document.createElement("canvas");
    surround.width = cols;
    surround.height = rows;
    const surroundContext = surround.getContext("2d", {
      willReadFrequently: true,
    });
    surroundContext.imageSmoothingQuality = "high";
    surroundContext.drawImage(blurred, 0, 0, cols, rows);

    let pixels;
    let means;

    try {
      pixels = sampleContext.getImageData(0, 0, cols, rows).data;
      means = surroundContext.getImageData(0, 0, cols, rows).data;
    } catch (error) {
      // A cross-origin or file:// photo can't be read back; stay Iran.
      return false;
    }

    const next = random(1977);
    const kept = [];

    // The sun first: the brightest neighbourhood in the upper part, so
    // its rays can be told apart from the clouds.
    let sunLight = -1;
    let sunCol = cols / 2;
    let sunRow = rows * 0.15;

    if (sunHint.length === 2) {
      sunCol = (cols - drawWidth) / 2 + sunHint[0] * drawWidth - 0.5;
      sunRow = (rows - drawHeight) * focusY + sunHint[1] * drawHeight - 0.5;
    } else if (profile.hasSun) {
      for (let row = 0; row < rows * 0.6; row++) {
        for (let col = 0; col < cols; col++) {
          const mean = luminance(means, (row * cols + col) * 4);

          if (mean > sunLight) {
            sunLight = mean;
            sunCol = col;
            sunRow = row;
          }
        }
      }
    }

    const sunReach = Math.max(cols, rows) * 0.07;

    // Each surface is given its own place on the gold ramp, in the way
    // that photo's light asks for (see MEMORY_PROFILES above).
    const surface = { presence: 1, tone: 0 };
    // Where the photo's top edge falls in the grid (negative when the
    // crop cuts it off), for profiles that need a cell's height in it.
    const photoTop = (rows - drawHeight) * focusY;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const i = (row * cols + col) * 4;
        const light = luminance(pixels, i);
        const sunDistance = Math.hypot(col - sunCol, row - sunRow) / sunReach;

        surface.presence = 1;

        if (
          !profile(
            surface,
            pixels[i] / 255,
            pixels[i + 1] / 255,
            pixels[i + 2] / 255,
            light,
            light - luminance(means, i),
            sunDistance,
            (row + 0.5 - photoTop) / drawHeight
          )
        ) {
          continue;
        }

        const presence = surface.presence;
        const tone = clamp(surface.tone);

        if (presence < 1 && next() >= presence) {
          continue;
        }

        if (tone < 0.04) {
          continue;
        }

        kept.push(col, row, tone);
      }
    }

    const count = kept.length / 3;
    const byLevel = [];

    for (let level = 0; level < LEVELS; level++) {
      byLevel.push([]);
    }

    field = {
      count: count,
      width: width,
      height: height,
      ratio: ratio,
      hx: new Float32Array(count),
      hy: new Float32Array(count),
      x: new Float32Array(count),
      y: new Float32Array(count),
      vx: new Float32Array(count),
      vy: new Float32Array(count),
      sx: new Float32Array(count),
      sy: new Float32Array(count),
      delay: new Float32Array(count),
      size: new Float32Array(count),
      levels: null,
      sunX: (sunCol + 0.5) * cell,
      sunY: (sunRow + 0.5) * cell,
    };

    const lift = Math.min(1.4, Math.max(0.6, height / 700));

    for (let n = 0; n < count; n++) {
      const tone = kept[n * 3 + 2];
      const hx = (kept[n * 3] + 0.5 + (next() - 0.5) * 0.55) * cell;
      const hy = (kept[n * 3 + 1] + 0.5 + (next() - 0.5) * 0.55) * cell;
      field.hx[n] = field.x[n] = hx;
      field.hy[n] = field.y[n] = hy;
      // Each grain rises from a little below and to one side of home.
      field.sx[n] = hx + (next() - 0.5) * 70 * lift;
      field.sy[n] = hy + (24 + next() * 90) * lift;
      field.delay[n] =
        (1 - hy / height) * RISE_SPREAD + next() * RISE_JITTER;
      // Whole device pixels wide, so no grain has a blurred edge.
      field.size[n] =
        Math.max(
          1,
          Math.round(cell * (0.18 + 0.7 * tone) * (0.9 + 0.2 * next()) * ratio)
        ) / ratio;
      byLevel[Math.round(tone * (LEVELS - 1))].push(n);
    }

    field.levels = byLevel.map(function (list) {
      return Uint32Array.from(list);
    });

    layer.style.setProperty("--sun-x", (field.sunX / width) * 100 + "%");
    layer.style.setProperty("--sun-y", (field.sunY / height) * 100 + "%");
    buildMotes(width, height, next);
    return true;
  }

  // Motes: a few hundred loose grains of light drifting up through the
  // sun's beam, independent of the photo.
  function buildMotes(width, height, next) {
    const count = Math.round(
      Math.min(520, Math.max(90, (width * height) / 3600))
    );
    motes = {
      count: count,
      x: new Float32Array(count),
      y: new Float32Array(count),
      speed: new Float32Array(count),
      sway: new Float32Array(count),
      phase: new Float32Array(count),
      size: new Float32Array(count),
      alpha: new Float32Array(count),
    };
    const spread = width * 0.16;

    for (let n = 0; n < count; n++) {
      // Roughly Gaussian across the beam (sum of three uniforms).
      const offset = (next() + next() + next() - 1.5) * 2 * spread;
      motes.x[n] = field.sunX + offset;
      motes.y[n] = next() * height;
      motes.speed[n] = 4 + next() * 14;
      motes.sway[n] = 6 + next() * 18;
      motes.phase[n] = next() * Math.PI * 2;
      motes.size[n] =
        Math.max(1, Math.round((0.8 + next() * 1.6) * field.ratio)) /
        field.ratio;
      motes.alpha[n] =
        (0.25 + next() * 0.6) *
        Math.exp(-(offset * offset) / (2 * spread * spread * 1.6));
    }
  }

  // Draws the field, or with `area` ({left, top, right, bottom}) only the
  // grains inside it: while the sand settles after a scatter, that is a
  // few thousand fills instead of the whole field.
  function drawGrains(progress, area) {
    const ratio = field.ratio;
    let left = -Infinity;
    let top = -Infinity;
    let right = Infinity;
    let bottom = Infinity;

    if (area) {
      // Snapped out to whole device pixels so no seam is left behind.
      left = Math.floor(area.left * ratio) / ratio;
      top = Math.floor(area.top * ratio) / ratio;
      right = Math.ceil(area.right * ratio) / ratio;
      bottom = Math.ceil(area.bottom * ratio) / ratio;
      grainContext.save();
      grainContext.beginPath();
      grainContext.rect(left, top, right - left, bottom - top);
      grainContext.clip();
      grainContext.clearRect(left, top, right - left, bottom - top);
      // Grains whose centre is just outside can still overlap the edge.
      left -= CELL_MAX;
      top -= CELL_MAX;
      right += CELL_MAX;
      bottom += CELL_MAX;
    } else {
      grainContext.clearRect(0, 0, field.width, field.height);
    }

    for (let level = 0; level < LEVELS; level++) {
      const list = field.levels[level];
      grainContext.fillStyle = palette[level];

      for (let k = 0; k < list.length; k++) {
        const n = list[k];
        const gx = field.x[n];
        const gy = field.y[n];

        if (gx < left || gx > right || gy < top || gy > bottom) {
          continue;
        }

        let size = field.size[n];

        if (progress) {
          const grown = progress[n];

          if (grown <= 0) {
            continue;
          }

          size = Math.max(1 / ratio, size * Math.min(1, grown * 1.6));
        }

        grainContext.fillRect(
          Math.round((gx - size / 2) * ratio) / ratio,
          Math.round((gy - size / 2) * ratio) / ratio,
          size,
          size
        );
      }
    }

    if (area) {
      grainContext.restore();
    }
  }

  // Rise-and-settle: pure easing toward home, timed per grain.
  function stepRise(now) {
    const elapsed = now - rise.start;
    const { hx, hy, sx, sy, x, y, delay } = field;
    const progress = rise.progress;
    const pace = rise.pace;
    let done = true;

    for (let n = 0; n < field.count; n++) {
      const t = (elapsed - delay[n] * pace) / (RISE_DURATION * pace);

      if (t >= 1) {
        progress[n] = 1;
        x[n] = hx[n];
        y[n] = hy[n];
        continue;
      }

      done = false;

      if (t <= 0) {
        progress[n] = 0;
        continue;
      }

      // Ease-out cubic: quick lift, long soft landing.
      const eased = 1 - (1 - t) * (1 - t) * (1 - t);
      progress[n] = t;
      x[n] = sx[n] + (hx[n] - sx[n]) * eased;
      y[n] = sy[n] + (hy[n] - sy[n]) * eased;
    }

    return !done;
  }

  // Springs every grain toward home, adds the cursor's push with a little
  // grit so it scatters like sand rather than parting like water, and
  // returns the area touched this step (each moving grain's old and new
  // place), or null once everything is home and still.
  function stepSand() {
    const { hx, hy, x, y, vx, vy } = field;
    const reach = RADIUS * RADIUS;
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;

    for (let n = 0; n < field.count; n++) {
      const oldX = x[n];
      const oldY = y[n];
      const near =
        pointer &&
        Math.abs(oldX - pointer.x) < RADIUS &&
        Math.abs(oldY - pointer.y) < RADIUS;

      // Grains at rest and out of the cursor's reach cost one check.
      if (
        !near &&
        vx[n] === 0 &&
        vy[n] === 0 &&
        oldX === hx[n] &&
        oldY === hy[n]
      ) {
        continue;
      }

      let ax = (hx[n] - x[n]) * SPRING;
      let ay = (hy[n] - y[n]) * SPRING;

      if (pointer) {
        const dx = x[n] - pointer.x;
        const dy = y[n] - pointer.y;
        const distance2 = dx * dx + dy * dy;

        if (distance2 < reach && distance2 > 0.01) {
          const distance = Math.sqrt(distance2);
          const force = (1 - distance / RADIUS) * PUSH;
          ax += (dx / distance) * force + (Math.random() - 0.5) * force * 0.9;
          ay += (dy / distance) * force + (Math.random() - 0.5) * force * 0.9;
        }
      }

      vx[n] = (vx[n] + ax) * DAMPING;
      vy[n] = (vy[n] + ay) * DAMPING;
      x[n] += vx[n];
      y[n] += vy[n];

      // Close enough: snap home and come to rest, so it drops out of
      // the loop above on the next step.
      if (
        Math.abs(vx[n]) < 0.02 &&
        Math.abs(vy[n]) < 0.02 &&
        Math.abs(hx[n] - x[n]) < 0.05 &&
        Math.abs(hy[n] - y[n]) < 0.05
      ) {
        vx[n] = vy[n] = 0;
        x[n] = hx[n];
        y[n] = hy[n];
      }

      if (oldX !== x[n] || oldY !== y[n]) {
        left = Math.min(left, oldX, x[n]);
        top = Math.min(top, oldY, y[n]);
        right = Math.max(right, oldX, x[n]);
        bottom = Math.max(bottom, oldY, y[n]);
      }
    }

    if (left > right) {
      return null;
    }

    return {
      left: left - CELL_MAX,
      top: top - CELL_MAX,
      right: right + CELL_MAX,
      bottom: bottom + CELL_MAX,
    };
  }

  function drawMotes(now, dt) {
    const width = field.width;
    const height = field.height;
    const seconds = now / 1000;
    moteContext.clearRect(0, 0, width, height);
    moteContext.fillStyle = "rgb(255, 226, 160)";

    for (let n = 0; n < motes.count; n++) {
      if (dt) {
        motes.y[n] -= motes.speed[n] * dt;

        if (motes.y[n] < -4) {
          motes.y[n] = height + 4;
        }
      }

      const phase = motes.phase[n];
      const twinkle = 0.55 + 0.45 * Math.sin(seconds * 1.3 + phase * 3);
      const size = motes.size[n];
      moteContext.globalAlpha = motes.alpha[n] * twinkle;
      moteContext.fillRect(
        motes.x[n] + Math.sin(seconds * 0.4 + phase) * motes.sway[n] - size / 2,
        motes.y[n] - size / 2,
        size,
        size
      );
    }

    moteContext.globalAlpha = 1;
  }

  function tick(now) {
    frame = 0;
    const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 0;
    lastTime = now;

    if (rise) {
      const rising = stepRise(now);
      drawGrains(rising ? rise.progress : null);

      if (!rising) {
        rise = null;
      }
    } else if (unsettled) {
      const touched = stepSand();
      // Keep stepping while the cursor is over the sand, even when
      // it is resting between moves.
      unsettled = Boolean(touched || pointer);

      if (touched) {
        drawGrains(null, touched);
      }
    }

    drawMotes(now, dt);

    if (mode === "memory" && visible) {
      frame = window.requestAnimationFrame(tick);
    }
  }

  function wake() {
    if (!frame && field && mode === "memory" && visible && !reduceMotion) {
      lastTime = 0;
      frame = window.requestAnimationFrame(tick);
    }
  }

  function sleep() {
    if (frame) {
      window.cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  // Still frame: every grain home, motes where they are.
  function drawStill() {
    rise = null;
    unsettled = false;
    field.x.set(field.hx);
    field.y.set(field.hy);
    field.vx.fill(0);
    field.vy.fill(0);
    drawGrains(null);
    drawMotes(window.performance ? window.performance.now() : 0, 0);
  }

  function startRise(pace) {
    if (reduceMotion) {
      drawStill();
      return;
    }

    field.vx.fill(0);
    field.vy.fill(0);
    rise = {
      start: window.performance.now(),
      pace: pace,
      progress: new Float32Array(field.count),
    };
    grainContext.clearRect(0, 0, field.width, field.height);
  }

  function paintToggle(next) {
    toggle.dataset.mode = next;
    buttons.forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.heroMode === next)
      );
    });
  }

  function remember(next) {
    try {
      window.sessionStorage.setItem(STORE_KEY, next);
    } catch (error) {
      // Private browsing: the choice just isn't remembered.
    }
  }

  function giveUp() {
    mode = "iran";
    sleep();
    hero.classList.remove("is-memory");
    toggle.hidden = true;
    reportIn();
  }

  function setMode(next, options) {
    const firstTime = options && options.first;

    if (next === mode) {
      return;
    }

    if (next === "memory") {
      if (!image.complete || !image.naturalWidth) {
        image.addEventListener(
          "load",
          function () {
            setMode(next, options);
          },
          { once: true }
        );
        return;
      }

      if (!field && !build()) {
        giveUp();
        return;
      }

      mode = "memory";
      hero.classList.add("is-memory");
      // First arrival takes its time; later returns are brisker.
      startRise(firstTime ? 1 : 0.55);
      wake();

      // Safari can keep showing the canvas as it was while hidden after
      // it's revealed; when nothing is animating (reduced motion) draw
      // once more now that it's visible.
      window.requestAnimationFrame(function () {
        if (mode === "memory" && !rise && field) {
          drawGrains(null);
        }
      });
    } else {
      mode = "iran";
      sleep();
      hero.classList.remove("is-memory");
    }

    paintToggle(next);
    toggle.hidden = false;
    reportIn();

    if (!firstTime) {
      remember(next);
    }
  }

  function pointAt(event) {
    const rect = layer.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function disturb(event) {
    if (mode !== "memory" || rise || reduceMotion) {
      return;
    }

    pointer = pointAt(event);
    unsettled = true;
    wake();
  }

  layer.addEventListener("pointermove", function (event) {
    if (event.pointerType === "mouse") {
      disturb(event);
    }
  });

  layer.addEventListener("pointerleave", function () {
    pointer = null;
  });

  // Touch has no hover: a tap scatters the sand for a moment.
  layer.addEventListener("pointerdown", function (event) {
    disturb(event);
    window.clearTimeout(tapTimer);
    tapTimer = window.setTimeout(function () {
      if (event.pointerType !== "mouse") {
        pointer = null;
      }
    }, 240);
  });

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      setMode(button.dataset.heroMode);
    });
  });

  // The grid is built for the hero's size; rebuild (without replaying
  // the rise) once a resize has finished.
  if (typeof window.ResizeObserver === "function") {
    new ResizeObserver(function () {
      if (!field) {
        return;
      }

      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (
          Math.abs(field.width - hero.clientWidth) < 1 &&
          Math.abs(field.height - hero.clientHeight) < 1
        ) {
          return;
        }

        if (build()) {
          drawStill();
          wake();
        }
      }, 180);
    }).observe(hero);
  }

  // Off screen, nothing draws.
  if (typeof window.IntersectionObserver === "function") {
    new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;

      if (visible) {
        wake();
      } else {
        sleep();
      }
    }).observe(hero);
  }

  let start = "memory";

  try {
    if (window.sessionStorage.getItem(STORE_KEY) === "iran") {
      start = "iran";
    }
  } catch (error) {
    // No storage: open on Memory as designed.
  }

  if (start === "iran") {
    paintToggle("iran");
    mode = "iran";
    toggle.hidden = false;
    reportIn();
  }

  image = new Image();
  image.decoding = "async";
  image.addEventListener("load", function () {
    if (start === "memory") {
      setMode("memory", { first: true });
    }
  });
  image.addEventListener("error", giveUp);
  image.src = source;
}

// About page — Background section: expands/collapses the truncated
// "Influence" panel (the only column long enough to need a "Read More"
// toggle; see .background-copy.collapsible in style.css, scoped to
// desktop widths only). Generic over any `.read-more-btn` /
// `.collapsible` pair so a second panel could opt in later just by
// carrying the same markup — nothing here is Influence-specific.
function initializeReadMoreSections() {
  if (typeof document === "undefined") {
    return;
  }

  const buttons = document.querySelectorAll(".read-more-btn");

  buttons.forEach(function (button) {
    const targetId = button.getAttribute("aria-controls");
    const copy = targetId ? document.getElementById(targetId) : null;

    if (!copy) {
      return;
    }

    button.addEventListener("click", function () {
      const isExpanded = copy.classList.toggle("expanded");
      button.setAttribute("aria-expanded", String(isExpanded));
      button.textContent = isExpanded ? "Read Less" : "Read More";
    });
  });
}

// Typesetting for text injected at runtime (artwork descriptions, the
// Antiquarium inspector), applying the same rules the static HTML follows:
// typographic apostrophes and quotes, a non-breaking space before an em
// dash so a dash never opens a line, hyphenated compounds kept whole in
// a .nobr span (a browser would otherwise break right after the hyphen),
// and the last two words tied so no word is left alone on the last line.
function typesetText(element, text) {
  const value = String(text || "")
    .replace(/(\w)'(?=\w|\s|[.,;:!?)]|$)/g, "$1’")
    .replace(/(^|[\s(—])"(?=\S)/g, "$1“")
    .replace(/"/g, "”")
    .replace(/(^|[\s(—])'(?=\S)/g, "$1‘")
    .replace(/\s+(?=—)/g, " ")
    .replace(/\s+(\S+\s+\S+)\s*$/, function (match, lastTwo) {
      const tail = lastTwo.split(/\s+/);
      // A very long pair could overflow a phone-width line; leave it free.
      return tail.join(" ").length > 26
        ? match
        : " " + tail.join(" ");
    });

  element.textContent = "";
  value
    .split(/(\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b)/)
    .forEach(function (part, index) {
      if (!part) {
        return;
      }
      if (index % 2) {
        const span = document.createElement("span");
        span.className = "nobr";
        span.textContent = part;
        element.append(span);
      } else {
        element.append(part);
      }
    });
}

if (typeof window !== "undefined") {
  // The Antiquarium's ES modules load after this script and reuse it.
  window.typesetText = typesetText;
}

if (typeof module !== "undefined") {
  module.exports = {
    initializeContactHints,
    initializeContactForm,
    initializeMagneticFooterLinks,
    initializePageTransitions,
    initializeLogoSignatureAnimation,
    initializeChamberGuardians,
    initializeReadMoreSections,
    initializeBrandFlag,
    initializeFooterFlag,
    initializeAboutConnector,
    initializeDigitalPortrait,
    initializeMemoryHeroes,
    typesetText,
  };
}

if (typeof document !== "undefined") {
  initializeThemeToggle();
  initializeContactHints();
  initializeContactForm();
  initializeMagneticFooterLinks();
  initializePageTransitions();
  initializeLogoSignatureAnimation();
  initializeChamberGuardians();
  initializeReadMoreSections();
  initializeBrandFlag();
  initializeFooterFlag();
  initializeAboutConnector();
  initializeDigitalPortrait();
  initializeMemoryHeroes();

  function normalizePathname(pathname) {
    if (!pathname) {
      return "/";
    }

    const normalized = pathname.replace(/\/index\.html$/i, "/");

    if (normalized.length > 1 && normalized.endsWith("/")) {
      return normalized.slice(0, -1);
    }

    return normalized || "/";
  }

  // Pages that live "inside" the Archive section but have no nav-link of
  // their own (category pages, vault pages nested under Archive) — these
  // should still light up "Archive" in the navbar/footer instead of
  // falling through to the "About" default below (About is the site's
  // landing page, so it is what an unrecognised path falls back to).
  var ARCHIVE_FAMILY_PATHS = [
    "/pages/typography.html",
    "/pages/motion-graphics.html",
    "/pages/bharat.html",
    "/pages/iran.html",
    "/pages/creation.html",
    "/pages/computer-graphics.html",
    "/pages/graphic-design.html",
    "/pages/Personl_Vault.html",
    "/pages/Motion_Vault.html",
    "/pages/handmade_vault.html",
    "/pages/Cyborg_vault.html",
  ];

  // Shared by the navbar's .nav-link list and the footer's NAVIGATION
  // column — same "which link matches the current page" logic, same
  // active/aria-current bookkeeping, just pointed at a different list
  // each time so both stay in sync with each other automatically
  // instead of the footer relying on a hardcoded (and easily stale)
  // aria-current in the markup.
  function syncActiveNavState(linkSelector) {
    const navLinks = document.querySelectorAll(linkSelector);

    if (!navLinks.length) {
      return;
    }

    const currentPath = normalizePathname(window.location.pathname);
    const currentHash = window.location.hash;
    let activeLink = null;

    navLinks.forEach(function (link) {
      link.classList.remove("active");
      link.removeAttribute("aria-current");

      const href = link.getAttribute("href");
      const rawHref = (href || "").trim();

      if (!rawHref) {
        return;
      }

      // Ignore placeholder hash links so they cannot steal active state from real pages.
      if (rawHref === "#") {
        return;
      }

      const url = new URL(rawHref, window.location.origin);
      const linkPath = normalizePathname(url.pathname);
      const linkHash = url.hash;

      if (linkHash) {
        if (linkPath === currentPath && linkHash === currentHash) {
          activeLink = link;
        }

        return;
      }

      if (linkPath === currentPath) {
        activeLink = link;
      }
    });

    if (!activeLink && ARCHIVE_FAMILY_PATHS.indexOf(currentPath) !== -1) {
      activeLink = document.querySelector(
        `${linkSelector}[href="/pages/archive.html"]`,
      );
    }

    if (!activeLink) {
      activeLink = document.querySelector(`${linkSelector}[href="/"]`);
    }

    if (activeLink) {
      activeLink.classList.add("active");
      activeLink.setAttribute("aria-current", "page");
    }

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.forEach(function (item) {
          item.classList.remove("active");
          item.removeAttribute("aria-current");
        });

        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      });
    });
  }

  syncActiveNavState(".navbar .nav-link");
  syncActiveNavState(".footer-navigation a");

  // The sliding gilded-glass pill behind the navbar / footer NAVIGATION /
  // footer CONTACT links (see .nav-pill-indicator in style.css). One
  // indicator element per list, moved with plain top/left/width/height so
  // CSS's own `transition` on those properties does the actual gliding —
  // this just measures the target link's box and hands the numbers over.
  function initializeNavPillIndicator(containerSelector) {
    const container = document.querySelector(containerSelector);

    if (!container) {
      return;
    }

    const links = Array.from(container.querySelectorAll(":scope > li > a"));

    if (!links.length) {
      return;
    }

    const indicator = document.createElement("span");
    indicator.className = "nav-pill-indicator";
    indicator.setAttribute("aria-hidden", "true");
    container.insertBefore(indicator, container.firstChild);

    function getActiveLink() {
      return container.querySelector(
        ":scope > li > a.active, :scope > li > a[aria-current='page']",
      );
    }

    function placeIndicator(link, options) {
      const opts = options || {};

      if (!link) {
        indicator.classList.remove("is-visible", "is-current");
        return;
      }

      if (opts.instant) {
        indicator.classList.add("nav-pill-indicator--instant");
      }

      indicator.style.top = `${link.offsetTop}px`;
      indicator.style.left = `${link.offsetLeft}px`;
      indicator.style.width = `${link.offsetWidth}px`;
      indicator.style.height = `${link.offsetHeight}px`;
      indicator.classList.add("is-visible");
      indicator.classList.toggle("is-current", Boolean(opts.current));

      if (opts.instant) {
        // Force layout now, synchronously, so the instant jump actually
        // lands before the class is removed and transitions resume on
        // the very next (real) move.
        void indicator.offsetHeight;
        indicator.classList.remove("nav-pill-indicator--instant");
      }
    }

    function settleOnActive(options) {
      const activeLink = getActiveLink();
      placeIndicator(activeLink, { current: true, ...(options || {}) });
    }

    // Click-only: the pill glides from whichever option it's currently
    // sitting on straight to the one just clicked, and nothing else ever
    // moves it — no hover/focus preview, no snapping back when the
    // pointer leaves the list. Deliberately not wired to mouseenter/
    // focus/mouseleave/focusout any more; it used to also live-preview
    // on hover and settle back on the active page when the pointer left,
    // but that made it drift back and forth with ordinary mouse movement
    // instead of reading as a deliberate "you picked this" motion.
    links.forEach(function (link) {
      // The "chamber" page-transition (initializePageTransitions) holds
      // the current page for ~650ms before actually navigating away, so
      // sliding the pill onto the clicked link here has real time to
      // play out rather than being cut off mid-flight by navigation.
      link.addEventListener("click", function () {
        placeIndicator(link, { current: true });
      });
    });

    // Initial placement lands on the current page instantly — no slide-in
    // from the corner of the list on first paint.
    settleOnActive({ instant: true });

    // A mobile hamburger menu starts collapsed (display: none), so the
    // initial placement above measured a zero-size box. Recompute once
    // Bootstrap finishes expanding it.
    const collapseAncestor = container.closest(".collapse");

    if (collapseAncestor) {
      collapseAncestor.addEventListener("shown.bs.collapse", function () {
        settleOnActive({ instant: true });
      });
    }

    window.addEventListener("resize", function () {
      settleOnActive({ instant: true });
    });
  }

  initializeNavPillIndicator(".navbar .navbar-nav");
  initializeNavPillIndicator(".footer-navigation ul");
  initializeNavPillIndicator(".footer-contact ul");

  // Category pages (Typography/Graphic Design/Motion Graphics/Computer
  // Graphics): each project's image sits beside its own "Read More"
  // link but wasn't clickable itself, which reads as a dead thumbnail
  // on a card everything else about visually invites tapping. Wired to
  // trigger that same link — rather than duplicating its href onto a
  // second element — so if/when Read More starts pointing at a real
  // project page instead of today's "#" placeholder, the image follows
  // automatically with no second place to remember to update.
  function initializeCategoryProjectMediaLinks() {
    document.querySelectorAll(".category-project").forEach(function (project) {
      const media = project.querySelector(".category-project-media");
      const readMore = project.querySelector(".category-project-copy .btn");

      if (!media || !readMore) {
        return;
      }

      const title = project.querySelector(".category-project-copy h3");

      media.setAttribute("role", "link");
      media.setAttribute("tabindex", "0");
      media.setAttribute(
        "aria-label",
        title ? `Read more: ${title.textContent.trim()}` : "Read more",
      );

      media.addEventListener("click", function () {
        readMore.click();
      });

      media.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          readMore.click();
        }
      });
    });
  }

  initializeCategoryProjectMediaLinks();

  function optimizeImageLoading() {
    const images = document.querySelectorAll("img");

    if (!images.length) {
      return;
    }

    const foldThreshold = window.innerHeight * 1.2;

    images.forEach(function (image, index) {
      if (!image.getAttribute("decoding")) {
        image.decoding = "async";
      }

      if (image.closest(".image-modal")) {
        return;
      }

      if (image.getAttribute("loading")) {
        return;
      }

      const rect = image.getBoundingClientRect();
      const likelyAboveTheFold = index === 0 || rect.top < foldThreshold;

      image.loading = likelyAboveTheFold ? "eager" : "lazy";

      if (likelyAboveTheFold && !image.getAttribute("fetchpriority")) {
        image.fetchPriority = "high";
      }
    });
  }

  optimizeImageLoading();

  function createImageModal() {
    const modal = document.createElement("div");
    modal.className = "image-modal";
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
      <div class="image-modal-dialog" role="dialog" aria-modal="true" aria-label="Artwork preview">
        <button class="image-modal-close" type="button" aria-label="Close image preview">X</button>
        <figure class="image-modal-figure">
          <div class="image-modal-image-wrap" title="Scroll to zoom in and out">
            <img class="image-modal-image" alt="" />
          </div>
          <figcaption class="image-modal-caption">
            <h3 class="image-modal-title"></h3>
            <p class="image-modal-description" title="Scroll to read more"></p>
          </figcaption>
        </figure>
      </div>
    `;

    document.body.appendChild(modal);

    return {
      modal,
      dialog: modal.querySelector(".image-modal-dialog"),
      imageWrap: modal.querySelector(".image-modal-image-wrap"),
      image: modal.querySelector(".image-modal-image"),
      title: modal.querySelector(".image-modal-title"),
      description: modal.querySelector(".image-modal-description"),
      closeButton: modal.querySelector(".image-modal-close"),
    };
  }

  const imageModal = createImageModal();

  const defaultImageModalDescription =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

  // Hovering the artwork itself zooms it (mouse wheel / trackpad scroll),
  // while hovering the caption text below scrolls that text instead — two
  // similar-looking scroll gestures, kept deliberately distinct so neither
  // area steals the other's input. Zoom and pan are tracked as an explicit
  // translate+scale pair (rather than leaning on native scroll) so every
  // part of the artwork — corners included — stays reachable by dragging,
  // and zooming always keeps whatever point is under the cursor in place.
  const IMAGE_MODAL_MIN_ZOOM = 1;
  const IMAGE_MODAL_MAX_ZOOM = 4;
  const IMAGE_MODAL_ZOOM_STEP = 0.35;
  let imageModalZoom = IMAGE_MODAL_MIN_ZOOM;
  let imageModalPanX = 0;
  let imageModalPanY = 0;

  // Keeps the image centered/contained in the wrap at low zoom, and — once
  // the scaled image is bigger than the wrap — stops panning from dragging
  // the artwork's edge past the wrap's edge, so it never flies off into
  // empty space.
  function clampImageModalPan(scale, x, y) {
    const wrapWidth = imageModal.imageWrap.clientWidth;
    const wrapHeight = imageModal.imageWrap.clientHeight;
    const baseWidth = imageModal.image.offsetWidth;
    const baseHeight = imageModal.image.offsetHeight;
    const scaledWidth = baseWidth * scale;
    const scaledHeight = baseHeight * scale;

    const clampedX =
      scaledWidth <= wrapWidth
        ? (wrapWidth - scaledWidth) / 2
        : Math.min(0, Math.max(wrapWidth - scaledWidth, x));
    const clampedY =
      scaledHeight <= wrapHeight
        ? (wrapHeight - scaledHeight) / 2
        : Math.min(0, Math.max(wrapHeight - scaledHeight, y));

    return { x: clampedX, y: clampedY };
  }

  function applyImageModalTransform() {
    imageModal.image.style.transform = `translate(${imageModalPanX}px, ${imageModalPanY}px) scale(${imageModalZoom})`;
    imageModal.imageWrap.classList.toggle(
      "is-zoomed",
      imageModalZoom > IMAGE_MODAL_MIN_ZOOM
    );
  }

  // Zooms toward a given point (the cursor, a touch, or — with no point
  // given — the wrap's center) so that exact point on the artwork stays
  // under the cursor as the scale changes, instead of always zooming from
  // a fixed corner and drifting other areas out of reach.
  function setImageModalZoom(nextZoom, anchorClientX, anchorClientY) {
    const clampedZoom = Math.min(
      IMAGE_MODAL_MAX_ZOOM,
      Math.max(IMAGE_MODAL_MIN_ZOOM, nextZoom)
    );
    const wrapRect = imageModal.imageWrap.getBoundingClientRect();
    const anchorX =
      (anchorClientX != null ? anchorClientX : wrapRect.left + wrapRect.width / 2) -
      wrapRect.left;
    const anchorY =
      (anchorClientY != null ? anchorClientY : wrapRect.top + wrapRect.height / 2) -
      wrapRect.top;

    const pointX = (anchorX - imageModalPanX) / imageModalZoom;
    const pointY = (anchorY - imageModalPanY) / imageModalZoom;

    const nextPanX = anchorX - pointX * clampedZoom;
    const nextPanY = anchorY - pointY * clampedZoom;
    const clampedPan = clampImageModalPan(clampedZoom, nextPanX, nextPanY);

    imageModalZoom = clampedZoom;
    imageModalPanX = clampedPan.x;
    imageModalPanY = clampedPan.y;
    applyImageModalTransform();
  }

  function resetImageModalZoom() {
    imageModalZoom = IMAGE_MODAL_MIN_ZOOM;
    const centered = clampImageModalPan(IMAGE_MODAL_MIN_ZOOM, 0, 0);
    imageModalPanX = centered.x;
    imageModalPanY = centered.y;
    applyImageModalTransform();
  }

  // Click-and-drag panning, reachable across the whole artwork once zoomed
  // in. Each artwork gets a clean slate — imageModalDrag is reset to null
  // on every open/close (below) and only ever tracks the one artwork
  // currently open in this shared popup, so a drag started on one piece
  // can never bleed into another.
  let imageModalDrag = null;

  imageModal.imageWrap.addEventListener("pointerdown", function (event) {
    if (imageModalZoom <= IMAGE_MODAL_MIN_ZOOM || event.button !== 0) {
      return;
    }

    imageModalDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: imageModalPanX,
      startPanY: imageModalPanY,
    };

    imageModal.imageWrap.setPointerCapture(event.pointerId);
    imageModal.imageWrap.classList.add("is-dragging");
    event.preventDefault();
  });

  imageModal.imageWrap.addEventListener("pointermove", function (event) {
    if (!imageModalDrag || event.pointerId !== imageModalDrag.pointerId) {
      return;
    }

    const nextPanX =
      imageModalDrag.startPanX + (event.clientX - imageModalDrag.startX);
    const nextPanY =
      imageModalDrag.startPanY + (event.clientY - imageModalDrag.startY);
    const clampedPan = clampImageModalPan(imageModalZoom, nextPanX, nextPanY);

    imageModalPanX = clampedPan.x;
    imageModalPanY = clampedPan.y;
    applyImageModalTransform();
  });

  function endImageModalDrag(event) {
    if (!imageModalDrag || event.pointerId !== imageModalDrag.pointerId) {
      return;
    }

    imageModal.imageWrap.releasePointerCapture(imageModalDrag.pointerId);
    imageModal.imageWrap.classList.remove("is-dragging");
    imageModalDrag = null;
  }

  imageModal.imageWrap.addEventListener("pointerup", endImageModalDrag);
  imageModal.imageWrap.addEventListener("pointercancel", endImageModalDrag);

  function closeImageModal() {
    imageModal.modal.classList.remove("is-open");
    imageModal.modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
    imageModal.image.removeAttribute("src");
    imageModal.image.alt = "";
    imageModal.title.textContent = "";
    imageModal.description.textContent = "";
    imageModalDrag = null;
    imageModal.imageWrap.classList.remove("is-dragging");
    resetImageModalZoom();
  }

  function openImageModal(image) {
    const imageTitle = image.alt || "Artwork preview";
    const imageDescription =
      image.dataset.description || defaultImageModalDescription;

    // Grids show a small thumbnail; data-full points at the original.
    imageModal.image.src =
      image.dataset.full || image.currentSrc || image.src;
    imageModal.image.alt = imageTitle;
    imageModal.title.textContent = imageTitle;
    typesetText(imageModal.description, imageDescription);
    // Featured Artworks cards and every artwork on the Personal Vault page
    // (the only page with #personal-hero) open as a still plate: no zoom,
    // and the dialog grows to show the whole introduction instead of a
    // scroll box (see .image-modal.is-static in style.css).
    const isStatic = Boolean(
      image.closest("#featured") || document.getElementById("personal-hero")
    );
    imageModal.modal.classList.toggle("is-static", isStatic);
    imageModal.imageWrap.title = isStatic ? "" : "Scroll to zoom in and out";
    imageModal.description.title = isStatic ? "" : "Scroll to read more";
    resetImageModalZoom();
    imageModal.modal.classList.add("is-open");
    imageModal.modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
  }

  imageModal.closeButton.addEventListener("click", closeImageModal);

  imageModal.modal.addEventListener("click", function (event) {
    if (event.target === imageModal.modal) {
      closeImageModal();
    }
  });

  // Scrolling over the artwork zooms it in/out — toward the cursor — instead
  // of scrolling the dialog behind it.
  imageModal.imageWrap.addEventListener(
    "wheel",
    function (event) {
      if (imageModal.modal.classList.contains("is-static")) {
        return;
      }
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      setImageModalZoom(
        imageModalZoom + direction * IMAGE_MODAL_ZOOM_STEP,
        event.clientX,
        event.clientY
      );
    },
    { passive: false }
  );

  imageModal.imageWrap.addEventListener("dblclick", function (event) {
    if (imageModal.modal.classList.contains("is-static")) {
      return;
    }
    setImageModalZoom(
      imageModalZoom > IMAGE_MODAL_MIN_ZOOM
        ? IMAGE_MODAL_MIN_ZOOM
        : IMAGE_MODAL_MIN_ZOOM + IMAGE_MODAL_ZOOM_STEP * 3,
      event.clientX,
      event.clientY
    );
  });

  // The wrap resizing (e.g. the viewport rotating or resizing) can leave the
  // current pan out of bounds for the new dimensions — re-clamp it in place.
  window.addEventListener("resize", function () {
    if (!imageModal.modal.classList.contains("is-open")) {
      return;
    }
    const clampedPan = clampImageModalPan(
      imageModalZoom,
      imageModalPanX,
      imageModalPanY
    );
    imageModalPanX = clampedPan.x;
    imageModalPanY = clampedPan.y;
    applyImageModalTransform();
  });

  // Scrolling over the caption text scrolls the text within its own box,
  // never the wider dialog — stop the wheel event there too so it can't
  // leak through to the page/dialog scroll behind it.
  imageModal.description.addEventListener(
    "wheel",
    function (event) {
      event.stopPropagation();
    },
    { passive: true }
  );

  document.addEventListener("keydown", function (event) {
    if (
      event.key === "Escape" &&
      imageModal.modal.classList.contains("is-open")
    ) {
      closeImageModal();
    }
  });

  const carousels = document.querySelectorAll(".carousel");

  carousels.forEach(function (carousel) {
    const track = carousel.querySelector(".carousel-track");
    const carouselWindow = carousel.querySelector(".car-window");
    const items = carousel.querySelectorAll(".car-item");

    const nextButton = carousel.querySelector(".next-btn");
    const previousButton = carousel.querySelector(".previous-btn");
    const previewImages = carousel.querySelectorAll(".car-item img");

    let currentSlide = 0;
    let motionTimer;

    function markCarouselMoving() {
      track.classList.add("is-moving");
      clearTimeout(motionTimer);

      motionTimer = setTimeout(function () {
        track.classList.remove("is-moving");
      }, 560);
    }

    function getMeasurements() {
      const firstItem = items[0];

      if (!firstItem) {
        return {
          distance: 0,
          maximumSlide: 0,
        };
      }

      const itemWidth = firstItem.getBoundingClientRect().width;

      const trackStyles = getComputedStyle(track);
      const gap = parseFloat(trackStyles.columnGap) || 0;

      const distance = itemWidth + gap;

      // Measured at the window's natural width: the max-width set below is
      // cleared first, because otherwise each pass would read back its own
      // previous cap as the available space and ratchet the window
      // narrower on every resize.
      carouselWindow.style.maxWidth = "";

      const visibleItems = Math.max(
        1,
        Math.floor((carouselWindow.clientWidth + gap) / distance),
      );

      // Snap the window to a whole number of cards. The floor above leaves
      // up to one slot of slack, and .car-window's overflow clip renders
      // that slack as a sliced-off card at the right edge — a hairline on
      // one monitor, half a card on another, since the remainder varies
      // continuously with viewport width. Capping the window at exactly
      // the cards it can show, with `justify-self: center` in the CSS,
      // turns the slack into even gutters on both sides instead. Visual
      // only: `distance` and `maximumSlide` are unchanged, so paging
      // behaves exactly as it did before.
      //
      // Linear (fixed-width) cards only. A .grid-slide is sized as 100% of
      // the window, so there is never a partial card to hide — and capping
      // the window at the slide's own width feeds back into itself (the
      // slide shrinks with the cap), which collapsed the Personal Vault
      // grids to roughly half their 700px, by a different amount per
      // section depending on its slide count.
      if (distance > 0 && !firstItem.classList.contains("grid-slide")) {
        carouselWindow.style.maxWidth = `${visibleItems * distance - gap}px`;
      }

      const maximumSlide = Math.max(0, items.length - visibleItems);

      return {
        distance,
        maximumSlide,
      };
    }

    function updateCarousel(shouldAnimate = false) {
      const { distance, maximumSlide } = getMeasurements();

      currentSlide = Math.min(currentSlide, maximumSlide);

      track.style.transform = `translateX(-${currentSlide * distance}px)`;

      if (shouldAnimate) {
        markCarouselMoving();
      }

      const hasMultipleSlides = maximumSlide > 0;
      previousButton.disabled = !hasMultipleSlides;
      nextButton.disabled = !hasMultipleSlides;
      renderCarouselCounter(maximumSlide);
    }

    nextButton.addEventListener("click", function () {
      const { maximumSlide } = getMeasurements();

      if (maximumSlide === 0) {
        return;
      }

      currentSlide = currentSlide >= maximumSlide ? 0 : currentSlide + 1;
      updateCarousel(true);
    });

    previousButton.addEventListener("click", function () {
      const { maximumSlide } = getMeasurements();

      if (maximumSlide === 0) {
        return;
      }

      currentSlide = currentSlide <= 0 ? maximumSlide : currentSlide - 1;
      updateCarousel(true);
    });

    previewImages.forEach(function (image) {
      if (image.closest("a")) {
        return;
      }

      image.classList.add("previewable-image");
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute(
        "aria-label",
        `Open enlarged view of ${image.alt || "artwork"}`,
      );

      // Warm the full-size file on hover/focus so the enlarged view is
      // usually already cached by the time it opens.
      function prefetchFullImage() {
        if (image.dataset.full && !image.dataset.prefetched) {
          image.dataset.prefetched = "true";
          new Image().src = image.dataset.full;
        }
      }
      image.addEventListener("pointerenter", prefetchFullImage);
      image.addEventListener("focus", prefetchFullImage);

      image.addEventListener("click", function () {
        openImageModal(image);
      });

      image.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openImageModal(image);
        }
      });
    });

    // ---- Position counter ----
    // On a phone the carousel shows one card at a time, so a quiet
    // "3 / 18" under the controls tells the visitor where they are and
    // how far the gallery runs. Hidden when every card already fits.
    const carouselCounter = document.createElement("p");
    carouselCounter.className = "carousel-counter";
    carouselCounter.setAttribute("aria-live", "polite");
    carousel.appendChild(carouselCounter);

    function renderCarouselCounter(maximumSlide) {
      if (maximumSlide === 0) {
        carouselCounter.hidden = true;
        return;
      }

      const total = items.length;
      const visible = total - maximumSlide;
      const position =
        visible > 1
          ? `${currentSlide + 1}–${currentSlide + visible}`
          : `${currentSlide + 1}`;

      carouselCounter.hidden = false;
      carouselCounter.textContent = `${position} / ${total}`;
    }

    // Moves by `delta` cards without wrapping (swipes and focus stop at
    // the ends; only the Previous/Next buttons loop around).
    function stepCarousel(delta) {
      const { maximumSlide } = getMeasurements();
      const target = Math.min(maximumSlide, Math.max(0, currentSlide + delta));

      if (target !== currentSlide) {
        currentSlide = target;
        updateCarousel(true);
      }
    }

    // ---- Touch swipe ----
    // .car-window has `touch-action: pan-y pinch-zoom` (style.css), so the
    // page still scrolls vertically and zooms natively while a horizontal
    // flick is left to this handler. Mouse users keep the buttons.
    let swipeStart = null;
    let suppressClickUntil = 0;

    carouselWindow.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" || !event.isPrimary) {
        return;
      }

      swipeStart = { x: event.clientX, y: event.clientY };
    });

    carouselWindow.addEventListener("pointercancel", function () {
      swipeStart = null;
    });

    carouselWindow.addEventListener("pointerup", function (event) {
      if (!swipeStart) {
        return;
      }

      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;

      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.2) {
        return;
      }

      // A swipe must not also open the artwork or follow a card's link.
      suppressClickUntil = Date.now() + 400;

      // Content follows the finger: the later cards wait to the right,
      // so a leftward flick moves forward.
      stepCarousel(dx < 0 ? 1 : -1);
    });

    carouselWindow.addEventListener(
      "click",
      function (event) {
        if (Date.now() < suppressClickUntil) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );

    // ---- Keyboard and focus ----
    // Arrow keys walk from artwork to artwork, and whichever card receives
    // focus (by arrow or Tab) is slid into view. Without this, tabbing to
    // a hidden card made the browser scroll the clipped window itself,
    // knocking the cards out of step with the transform-driven paging.
    const content = carousel.querySelector(".carousel-content");

    [carouselWindow, content].forEach(function (clip) {
      if (!clip) {
        return;
      }

      clip.addEventListener("scroll", function () {
        if (clip.scrollLeft !== 0) {
          clip.scrollLeft = 0;
        }
      });
    });

    carousel.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }

      const focusables = Array.from(
        track.querySelectorAll(".previewable-image, a[href]"),
      );
      const index = focusables.indexOf(event.target);

      if (index === -1) {
        return;
      }

      const next = focusables[index + (event.key === "ArrowRight" ? 1 : -1)];

      if (next) {
        event.preventDefault();
        next.focus({ preventScroll: true });
      }
    });

    carousel.addEventListener("focusin", function (event) {
      const item = event.target.closest(".car-item");

      if (!item || !track.contains(item)) {
        return;
      }

      const index = Array.prototype.indexOf.call(items, item);
      const { maximumSlide } = getMeasurements();
      const visible = items.length - maximumSlide;

      if (index < currentSlide) {
        stepCarousel(index - currentSlide);
      } else if (index > currentSlide + visible - 1) {
        stepCarousel(index - (currentSlide + visible - 1));
      }
    });

    window.addEventListener("resize", updateCarousel);

    updateCarousel();
  });

  // Previous/1 2 3/Next page-locator row for the Chronological Archive's
  // four category pages (Typography/Graphic Design/Motion Graphics/
  // Computer Graphics), one independent instance per page since each has
  // its own `.category-projects` section. A category's projects are
  // static markup already on the page, so "changing page" here just
  // shows/hides the existing `.category-project` articles rather than
  // fetching anything. The `.notes-pagination` / `.notes-page-btn` /
  // `.notes-page-nav` class names are historical — they are this row's
  // own styling now — and it keeps the `?page=` URL sync so a direct
  // link/bookmark/the browser's back-forward buttons land on the right
  // page.
  function initializeCategoryProjectPagination() {
    const PAGE_SIZE = 2;

    function getPageFromQuery() {
      try {
        const params = new URLSearchParams(window.location.search);
        const page = parseInt(params.get("page"), 10);
        return Number.isFinite(page) && page > 0 ? page : 1;
      } catch (error) {
        return 1;
      }
    }

    function setPageQuery(page) {
      try {
        const url = new URL(window.location.href);

        if (page <= 1) {
          url.searchParams.delete("page");
        } else {
          url.searchParams.set("page", String(page));
        }

        window.history.pushState({ categoryPage: page }, "", url);
      } catch (error) {
        // History/URL API unsupported (or blocked) — pagination still
        // works via clicks, it just won't be reflected in the address bar.
      }
    }

    document.querySelectorAll(".category-projects").forEach(function (section) {
      const projects = Array.from(
        section.querySelectorAll(":scope > .category-project"),
      );

      if (!projects.length) {
        return;
      }

      const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
      const pagination = document.createElement("div");
      pagination.className = "notes-pagination";
      section.insertAdjacentElement("afterend", pagination);

      let currentPage = Math.min(Math.max(getPageFromQuery(), 1), totalPages);

      function renderControls() {
        pagination.innerHTML = "";

        const fragment = document.createDocumentFragment();

        const makeControl = function (label, targetPage, options) {
          const opts = options || {};
          const button = document.createElement("button");
          button.type = "button";
          button.className = opts.className || "btn notes-page-btn";
          button.textContent = label;

          if (opts.disabled) {
            button.disabled = true;
          }

          if (opts.current) {
            button.classList.add("is-active");
            button.setAttribute("aria-current", "page");
          }

          if (opts.ariaLabel) {
            button.setAttribute("aria-label", opts.ariaLabel);
          }

          button.addEventListener("click", function () {
            if (opts.disabled || targetPage === currentPage) {
              return;
            }

            renderPage(targetPage, { scrollIntoView: true });
          });

          return button;
        };

        fragment.appendChild(
          makeControl("Previous", currentPage - 1, {
            className: "btn notes-page-nav",
            disabled: currentPage <= 1,
            ariaLabel: "Go to previous page of projects",
          }),
        );

        for (let page = 1; page <= totalPages; page += 1) {
          fragment.appendChild(
            makeControl(String(page), page, {
              current: page === currentPage,
              ariaLabel: `Go to page ${page}`,
            }),
          );
        }

        fragment.appendChild(
          makeControl("Next", currentPage + 1, {
            className: "btn notes-page-nav",
            disabled: currentPage >= totalPages,
            ariaLabel: "Go to next page of projects",
          }),
        );

        pagination.appendChild(fragment);
      }

      function renderPage(page, options) {
        const opts = options || {};
        currentPage = Math.min(Math.max(page, 1), totalPages);

        projects.forEach(function (project, index) {
          const projectPage = Math.floor(index / PAGE_SIZE) + 1;
          project.style.display = projectPage === currentPage ? "" : "none";
        });

        renderControls();

        if (!opts.skipHistory) {
          setPageQuery(currentPage);
        }

        if (opts.scrollIntoView) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      renderPage(currentPage, { skipHistory: true });

      window.addEventListener("popstate", function () {
        renderPage(getPageFromQuery(), { skipHistory: true });
      });
    });
  }

  initializeCategoryProjectPagination();

  // Click-to-load YouTube facade: an embedded YouTube <iframe> pulls in
  // the full player bundle (scripts, styles, its own tracking requests —
  // typically several hundred KB to 1MB+) the instant it's in the DOM,
  // whether or not a visitor ever presses play. Handmade/Cyborg
  // Vault each embed 9 of them, so that cost was paid 9 times over on
  // every page load. This swaps each iframe for a lightweight
  // thumbnail + play button (`.youtube-facade`, styled to sit in
  // exactly the same box as `.gallery-item iframe` did — no layout or
  // design change) and only builds the real iframe once a visitor
  // actually clicks it, matching the "click to load" pattern most
  // major sites use for embedded video for exactly this reason.
  function initializeYoutubeFacades() {
    const facades = document.querySelectorAll(".youtube-facade");

    facades.forEach(function (facade) {
      const videoId = facade.getAttribute("data-video-id");

      if (!videoId) {
        return;
      }

      const loadVideo = function () {
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        iframe.title =
          facade.getAttribute("data-video-title") || "YouTube video player";
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute(
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        );
        iframe.setAttribute(
          "referrerpolicy",
          "strict-origin-when-cross-origin",
        );
        iframe.setAttribute("allowfullscreen", "");

        facade.replaceWith(iframe);
      };

      facade.addEventListener("click", loadVideo);
      facade.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          loadVideo();
        }
      });
    });
  }

  initializeYoutubeFacades();
}
