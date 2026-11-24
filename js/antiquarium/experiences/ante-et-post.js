import { comparisons } from "./ante-et-post-data.js";
import { imageSources } from "./ante-et-post-images.js";

export default function createAnteEtPost(container) {
  const events = new AbortController();
  const listen = (element, event, callback) => element.addEventListener(event, callback, { signal: events.signal });
  container.innerHTML = `
    <section class="ante-gallery" aria-labelledby="ante-title">
      <header class="ante-intro">
        <span class="ante-eyebrow">The work, reimagined</span>
        <h2 id="ante-title" lang="la">Ante et Post</h2>
        <p>Original artworks and their AI transformations.</p>
      </header>
      <div class="ante-toolbar" role="group" aria-label="Comparison view">
        <button type="button" data-view="slider" aria-pressed="true">Reveal</button>
        <button type="button" data-view="side" aria-pressed="false">Side by side</button>
      </div>
      <div class="ante-versions">
        <label for="ante-original" data-original-label hidden>Source study</label>
        <select id="ante-original" aria-label="Choose a source study" hidden></select>
        <label for="ante-version">AI interpretation</label>
        <select id="ante-version" aria-label="Choose an AI interpretation"></select>
        <span data-version-count aria-live="polite"></span>
      </div>
      <div class="ante-comparison" data-comparison style="--reveal: 50%">
        <figure class="ante-image ante-image--after">
          <div class="ante-image-media">
            <div class="ante-placeholder ante-placeholder--after" data-after-placeholder aria-hidden="true"><span>AI transformation<br><small>Loading artwork</small></span></div>
            <img data-after decoding="async" draggable="false" alt="" hidden>
          </div>
          <figcaption data-after-caption>AI transformation</figcaption>
        </figure>
        <figure class="ante-image ante-image--before">
          <div class="ante-image-media">
            <div class="ante-placeholder" data-before-placeholder aria-hidden="true"><span>Original artwork<br><small>Loading artwork</small></span></div>
            <img data-before decoding="async" draggable="false" alt="" hidden>
          </div>
          <figcaption data-before-caption>Original</figcaption>
        </figure>
        <div class="ante-divider" aria-hidden="true"><span>‹ ›</span></div>
        <input class="ante-range" type="range" min="0" max="100" value="50"
          aria-label="Reveal original artwork" aria-describedby="ante-hint">
      </div>
      <div class="ante-reveal-labels" data-reveal-labels>
        <span data-reveal-before>Original</span>
        <span data-reveal-after>AI transformation</span>
      </div>
      <p class="ante-hint" id="ante-hint">Drag to compare · Or focus the slider and use the arrow keys</p>
      <p class="ante-error" role="status" hidden>An image could not load. Try another pair or reload the page.</p>
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
  const before = find("[data-before]");
  const after = find("[data-after]");
  const range = find(".ante-range");
  const error = find(".ante-error");
  const thumbs = find(".ante-thumbnails");
  const versionSelect = find("#ante-version");
  const originalSelect = find("#ante-original");
  let index = 0;
  let disposed = false;
  let imageVersion = 0;
  let sideBySide = false;
  const imageRequests = new WeakMap();

  function imageSizes() {
    // Side-by-side stacks on phones. The artwork frame retains its side gutters.
    const sizes = sideBySide
      ? "(max-width: 700px) 85vw, (max-width: 1024px) 40vw, (max-width: 1667px) 42vw, 700px"
      : "(max-width: 1024px) 85vw, (max-width: 1667px) 85vw, 1400px";
    // Reassigning sizes can restart responsive selection and abort decode().
    for (const image of [before, after]) {
      if (image.sizes !== sizes) image.sizes = sizes;
    }
  }

  function reveal() {
    comparison.style.setProperty("--reveal", `${range.value}%`);
    range.setAttribute("aria-valuetext", `${range.value}% original, ${100 - Number(range.value)}% AI transformation`);
  }

  function loadImage(image, url, alt, placeholder) {
    // Keep the decoded original visible when only the AI interpretation changes.
    if (image.dataset.loadedUrl === url) return Promise.resolve();
    // Reuse an original that is still loading when its AI version changes.
    const pending = imageRequests.get(image);
    if (pending?.url === url) return pending.promise;
    const request = { url };
    imageRequests.set(image, request);
    const isCurrent = () => !disposed && imageRequests.get(image) === request;
    image.hidden = true;
    placeholder.hidden = false;
    placeholder.querySelector("small").textContent = "Loading artwork";
    image.removeAttribute("src");
    image.removeAttribute("srcset");
    delete image.dataset.loadedUrl;
    image.alt = alt;
    if (!url) return Promise.resolve();
    const filename = new URL(url).pathname.split("/").pop();
    const sources = imageSources[filename];
    if (sources) image.srcset = sources.map(source => `${new URL(source.url, url).href} ${source.width}w`).join(", ");
    image.src = url;
    request.promise = (async () => {
      try {
        try {
          await image.decode();
        } catch (failure) {
          if (!isCurrent()) return;
          // A responsive candidate may fail or change during decoding. Retry
          // with the full artwork before treating this as a missing image.
          image.removeAttribute("srcset");
          image.src = url;
          await image.decode();
        }
        if (isCurrent()) {
          placeholder.hidden = true;
          image.hidden = false;
          image.dataset.loadedUrl = url;
        }
      } catch {
        if (isCurrent()) {
          // Retain a useful placeholder instead of an empty half of the frame.
          placeholder.querySelector("small").textContent = "Artwork unavailable";
          error.hidden = false;
        }
      } finally {
        if (imageRequests.get(image) === request) imageRequests.delete(image);
      }
    })();
    return request.promise;
  }

  function showPair() {
    const artwork = comparisons[index];
    const originalStudy = (artwork.originalStudies || [])[Number(originalSelect.value) - 1];
    const interpretation = artwork.variants[Number(versionSelect.value)];
    const version = ++imageVersion;
    error.hidden = true;
    comparison.setAttribute("aria-busy", "true");
    imageSizes();
    Promise.all([
      loadImage(before, originalStudy?.image || artwork.original, `${artwork.title} — ${originalStudy?.label || "original artwork"}`, find("[data-before-placeholder]")),
      loadImage(after, interpretation.image, `${artwork.title} — AI interpretation: ${interpretation.label}`, find("[data-after-placeholder]")),
    ]).then(() => {
      if (!disposed && version === imageVersion) comparison.setAttribute("aria-busy", "false");
    });
    find("[data-after-caption]").textContent = `AI · ${interpretation.label}`;
    find("[data-before-caption]").textContent = originalStudy ? `Original · ${originalStudy.label}` : "Original";
    find("[data-reveal-before]").textContent = find("[data-before-caption]").textContent;
    find("[data-reveal-after]").textContent = find("[data-after-caption]").textContent;
    find("[data-version-count]").textContent = `${Number(versionSelect.value) + 1} / ${artwork.variants.length}`;
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
    find("[data-title]").textContent = artwork.title;
    find("[data-status]").textContent = `Original + ${artwork.variants.length} AI ${artwork.variants.length === 1 ? "interpretation" : "interpretations"}`;
    find("[data-description]").textContent = artwork.description || "";
    find("[data-count]").textContent = `${String(index + 1).padStart(2, "0")} / ${String(comparisons.length).padStart(2, "0")}`;
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
  listen(find("[data-prev]"), "click", () => select(index - 1));
  listen(find("[data-next]"), "click", () => select(index + 1));
  container.querySelectorAll("[data-view]").forEach(button => {
    listen(button, "click", () => {
      const side = button.dataset.view === "side";
      sideBySide = side;
      imageSizes();
      find("[data-reveal-labels]").hidden = side;
      comparison.classList.toggle("is-side-by-side", side);
      range.hidden = side;
      find(".ante-divider").hidden = side;
      find("#ante-hint").textContent = side
        ? "Two complete artworks, shown together."
        : "Drag to compare · Or focus the slider and use the arrow keys";
      container.querySelectorAll("[data-view]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    });
  });
  select(0);
  return {
    dispose() {
      disposed = true;
      events.abort();
      container.replaceChildren();
    },
  };
}
