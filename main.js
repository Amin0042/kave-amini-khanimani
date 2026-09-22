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

      flag.style.setProperty(
        "--brand-flag-drop",
        Math.max(0, Math.round(drop)) + "px"
      );
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
    "/pages/computer-graphics.html",
    "/pages/graphic-design.html",
    "/pages/Personl_Vault.html",
    "/pages/Motion_Vault.html",
    "/pages/aftereffects_vault.html",
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

    imageModal.image.src = image.currentSrc || image.src;
    imageModal.image.alt = imageTitle;
    imageModal.title.textContent = imageTitle;
    imageModal.description.textContent = imageDescription;
    resetImageModalZoom();
    imageModal.modal.classList.add("is-open");
    imageModal.modal.setAttribute("aria-hidden", "false");
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
  // whether or not a visitor ever presses play. Aftereffects/Cyborg
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
