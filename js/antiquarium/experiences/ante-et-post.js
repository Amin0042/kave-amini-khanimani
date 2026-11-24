import { comparisons } from "./ante-et-post-data.js?v=adobe-credit-2";
import { imageSources } from "./ante-et-post-images.js";

export default function createAnteEtPost(container) {
  const events = new AbortController();
  const listen = (element, event, callback) => element.addEventListener(event, callback, { signal: events.signal });
  container.innerHTML = `
    <section class="ante-gallery" aria-labelledby="ante-title">
      <header class="ante-intro">
        <span class="ante-eyebrow">The work, reimagined</span>
        <h2 id="ante-title" lang="la">Ante et Post</h2>
        <p>Original artworks, digital versions and AI interpretations.</p>
      </header>
      <div class="ante-toolbar" role="group" aria-label="Comparison view">
        <button type="button" data-view="slider" aria-pressed="true">Reveal</button>
        <button type="button" data-view="side" aria-pressed="false">Side by side</button>
      </div>
      <div class="ante-versions">
        <label for="ante-original" data-original-label hidden>Source study</label>
        <select id="ante-original" aria-label="Choose a source study" hidden></select>
        <label for="ante-version">Version</label>
        <select id="ante-version" aria-label="Choose a version"></select>
        <span data-version-count aria-live="polite"></span>
      </div>
      <p class="ante-loading" data-loading role="status">Loading artworks…</p>
      <div class="ante-comparison" data-comparison style="--reveal: 50%" hidden>
        <figure class="ante-image ante-image--after">
          <div class="ante-image-media">
            <img data-after decoding="async" draggable="false" alt="" hidden>
          </div>
          <figcaption data-after-caption>Artwork version</figcaption>
        </figure>
        <figure class="ante-image ante-image--before">
          <div class="ante-image-media">
            <img data-before decoding="async" draggable="false" alt="" hidden>
          </div>
          <figcaption data-before-caption>Original</figcaption>
        </figure>
        <div class="ante-divider" aria-hidden="true"><span>‹ ›</span></div>
        <input class="ante-range" type="range" min="0" max="100" value="50"
          aria-label="Reveal original artwork" aria-describedby="ante-hint">
      </div>
      <div class="ante-reveal-labels" data-reveal-labels hidden>
        <span data-reveal-before>Original</span>
        <span data-reveal-after>Artwork version</span>
      </div>
      <p class="ante-hint" id="ante-hint" hidden>Drag to compare · Or focus the slider and use the arrow keys</p>
      <p class="ante-error" role="status" hidden><span data-error-message></span> <button type="button" data-retry>Try again</button></p>
      <div class="ante-details">
        <div class="ante-artwork-label" aria-live="polite" aria-atomic="true">
          <span class="ante-eyebrow" data-status></span>
          <h3 data-title></h3>
          <p data-description></p>
        </div>
        <div class="ante-navigation" role="group" aria-label="Browse artworks">
          <button type="button" data-prev aria-label="Previous artwork">‹</button>
          <span data-count></span>
          <button type="button" data-next aria-label="Next artwork">›</button>
        </div>
      </div>
      <div class="ante-thumbnails" role="group" aria-label="Choose an artwork"></div>
    </section>`;
  const find = selector => container.querySelector(selector);
  const comparison = find("[data-comparison]");
  let before = find("[data-before]");
  let after = find("[data-after]");
  const range = find(".ante-range");
  const error = find(".ante-error");
  const thumbs = find(".ante-thumbnails");
  const versionSelect = find("#ante-version");
  const originalSelect = find("#ante-original");
  const loading = find("[data-loading]");
  let index = 0;
  let disposed = false;
  let imageVersion = 0;
  let sideBySide = false;
  const imageRequests = new Map();
  let hasPair = false;
  let displayedMedium = "artwork version";

  function imageSizes() {
    // Side-by-side stacks on phones. The artwork frame retains its side gutters.
    return sideBySide
      ? "(max-width: 700px) 85vw, (max-width: 1024px) 40vw, (max-width: 1667px) 42vw, 700px"
      : "(max-width: 1024px) 85vw, (max-width: 1667px) 85vw, 1400px";
  }

  function reveal() {
    comparison.style.setProperty("--reveal", `${range.value}%`);
    range.setAttribute("aria-valuetext", `${range.value}% original, ${100 - Number(range.value)}% ${displayedMedium}`);
  }

  function loadImage(url) {
    // Decode detached elements. Never clear or reconfigure an on-screen image.
    const sizes = imageSizes();
    const key = `${url}|${sizes}`;
    if (imageRequests.has(key)) {
      const request = imageRequests.get(key);
      imageRequests.delete(key);
      imageRequests.set(key, request);
      return request;
    }
    const image = document.createElement("img");
    image.decoding = "async";
    image.draggable = false;
    image.sizes = sizes;
    const filename = new URL(url).pathname.split("/").pop();
    const sources = imageSources[filename];
    if (sources) image.srcset = sources.map(source => `${new URL(source.url, url).href} ${source.width}w`).join(", ");
    image.src = url;
    const request = (async () => {
      try {
        try {
          await image.decode();
        } catch {
          // A responsive candidate may fail or change during decoding. Retry
          // with the full artwork before treating this as a missing image.
          image.removeAttribute("srcset");
          image.src = url;
          await image.decode();
        }
        return image;
      } catch (failure) {
        if (imageRequests.get(key) === request) imageRequests.delete(key);
        throw failure;
      }
    })();
    imageRequests.set(key, request);
    // Bound retained decoded images when browsing the whole collection.
    while (imageRequests.size > 12) imageRequests.delete(imageRequests.keys().next().value);
    return request;
  }

  async function showPair() {
    const artwork = comparisons[index];
    const originalStudy = (artwork.originalStudies || [])[Number(originalSelect.value) - 1];
    const interpretation = artwork.variants[Number(versionSelect.value)];
    const medium = interpretation.mediumLabel || (interpretation.medium === "adobe" ? "Adobe digital artwork" : "AI interpretation");
    find('label[for="ante-version"]').textContent = medium;
    versionSelect.setAttribute("aria-label", `Choose a version: ${medium}`);
    const version = ++imageVersion;
    error.hidden = true;
    loading.textContent = `Loading ${artwork.title}…`;
    comparison.setAttribute("aria-busy", "true");
    try {
      const [nextBefore, nextAfter] = await Promise.all([
        loadImage(originalStudy?.image || artwork.original),
        loadImage(interpretation.image),
      ]);
      // Late decodes from rapid selection or a closed installation cannot win.
      if (disposed || version !== imageVersion) return;
      nextBefore.alt = `${artwork.title} — ${originalStudy?.label || "original artwork"}`;
      nextAfter.alt = `${artwork.title} — ${medium}: ${interpretation.label}`;
      nextBefore.setAttribute("data-before", "");
      nextAfter.setAttribute("data-after", "");
      if (before !== nextBefore) before.replaceWith(nextBefore);
      if (after !== nextAfter) after.replaceWith(nextAfter);
      before = nextBefore;
      after = nextAfter;
      before.hidden = false;
      after.hidden = false;
      hasPair = true;
      comparison.hidden = false;
      displayedMedium = medium;
      reveal();
      find("[data-reveal-labels]").hidden = sideBySide;
      find("#ante-hint").hidden = false;
      find("[data-after-caption]").textContent = `${interpretation.medium === "adobe" ? medium : "AI"} · ${interpretation.label}`;
      find("[data-before-caption]").textContent = originalStudy ? `Original · ${originalStudy.label}` : "Original";
      find("[data-reveal-before]").textContent = find("[data-before-caption]").textContent;
      find("[data-reveal-after]").textContent = find("[data-after-caption]").textContent;
      find("[data-version-count]").textContent = `${Number(versionSelect.value) + 1} / ${artwork.variants.length}`;
      find("[data-title]").textContent = artwork.title;
      const adobeCount = artwork.variants.filter(interpretation => interpretation.medium === "adobe").length;
      const aiCount = artwork.variants.length - adobeCount;
      find("[data-status]").textContent = [
        "Original",
        ...(adobeCount ? [`${adobeCount} Adobe digital ${adobeCount === 1 ? "version" : "versions"}`] : []),
        ...(aiCount ? [`${aiCount} AI ${aiCount === 1 ? "interpretation" : "interpretations"}`] : []),
      ].join(" + ");
      find("[data-description]").textContent = artwork.description || "";
      find("[data-count]").textContent = `${String(index + 1).padStart(2, "0")} / ${String(comparisons.length).padStart(2, "0")}`;
      // Warm the other versions only after the requested pair is visible.
      const urls = [...(artwork.originalStudies || []), ...artwork.variants].map(item => item.image);
      urls.push(artwork.original);
      for (const url of urls) loadImage(url).catch(() => {});
    } catch {
      if (disposed || version !== imageVersion) return;
      find("[data-error-message]").textContent = hasPair
        ? "This artwork could not load. The previous comparison is still shown."
        : "The artworks could not load. Please try again.";
      error.hidden = false;
    } finally {
      if (!disposed && version === imageVersion) {
        comparison.setAttribute("aria-busy", "false");
        loading.textContent = "";
      }
    }
  }

  function select(next) {
    index = (next + comparisons.length) % comparisons.length;
    const artwork = comparisons[index];
    originalSelect.replaceChildren();
    [{ label: "Original", image: artwork.original }, ...(artwork.originalStudies || [])].forEach((study, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = study.label;
      originalSelect.append(option);
    });
    originalSelect.value = "0";
    originalSelect.hidden = !artwork.originalStudies?.length;
    find("[data-original-label]").hidden = originalSelect.hidden;
    versionSelect.replaceChildren();
    artwork.variants.forEach((interpretation, i) => {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = interpretation.label;
      versionSelect.append(option);
    });
    versionSelect.value = "0";
    versionSelect.disabled = artwork.variants.length === 1;
    Array.from(thumbs.children).forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    range.value = "50";
    reveal();
    showPair();
  }

  comparisons.forEach((artwork, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ante-thumbnail";
    button.setAttribute("aria-label", `Compare ${artwork.title}`);
    if (artwork.thumbnail || artwork.variants[0]?.image) {
      const image = document.createElement("img");
      image.src = artwork.thumbnail || artwork.variants[0].image;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.width = 320;
      image.height = 240;
      button.append(image);
    } else {
      const number = document.createElement("span");
      number.className = "ante-thumbnail-number";
      number.textContent = String(i + 1).padStart(2, "0");
      button.append(number);
    }
    const title = document.createElement("span");
    title.textContent = artwork.title;
    button.append(title);
    listen(button, "click", () => select(i));
    thumbs.append(button);
  });
  listen(range, "input", reveal);
  listen(versionSelect, "change", showPair);
  listen(originalSelect, "change", showPair);
  listen(find("[data-retry]"), "click", showPair);
  listen(find("[data-prev]"), "click", () => select(index - 1));
  listen(find("[data-next]"), "click", () => select(index + 1));
  container.querySelectorAll("[data-view]").forEach(button => {
    listen(button, "click", () => {
      const side = button.dataset.view === "side";
      sideBySide = side;
      find("[data-reveal-labels]").hidden = side || !hasPair;
      comparison.classList.toggle("is-side-by-side", side);
      range.hidden = side;
      find(".ante-divider").hidden = side;
      find("#ante-hint").textContent = side
        ? "Two complete artworks, shown together."
        : "Drag to compare · Or focus the slider and use the arrow keys";
      showPair();
      container.querySelectorAll("[data-view]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    });
  });
  select(0);
  return {
    dispose() {
      disposed = true;
      events.abort();
      imageRequests.clear();
      container.replaceChildren();
    },
  };
}
