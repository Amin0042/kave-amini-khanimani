import { comparisons } from "./ante-et-post-data.js";

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
          <figcaption>Original</figcaption>
        </figure>
        <div class="ante-divider" aria-hidden="true"><span>‹ ›</span></div>
        <input class="ante-range" type="range" min="0" max="100" value="50"
          aria-label="Reveal original artwork" aria-describedby="ante-hint">
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
  let index = 0;
  let disposed = false;
  let imageVersion = 0;

  function reveal() {
    comparison.style.setProperty("--reveal", `${range.value}%`);
    range.setAttribute("aria-valuetext", `${range.value}% original, ${100 - Number(range.value)}% AI transformation`);
  }

  async function loadImage(image, url, alt, version, placeholder) {
    image.hidden = true;
    placeholder.hidden = false;
    image.removeAttribute("src");
    image.alt = alt;
    if (!url) return;
    image.src = url;
    try {
      await image.decode();
      if (!disposed && version === imageVersion) {
        placeholder.hidden = true;
        image.hidden = false;
      }
    } catch {
      if (!disposed && version === imageVersion) error.hidden = false;
    }
  }

  function showPair() {
    const artwork = comparisons[index];
    const interpretation = artwork.variants[Number(versionSelect.value)];
    const version = ++imageVersion;
    error.hidden = true;
    comparison.setAttribute("aria-busy", "true");
    Promise.all([
      loadImage(before, artwork.original, `${artwork.title} — original artwork`, version, find("[data-before-placeholder]")),
      loadImage(after, interpretation.image, `${artwork.title} — AI interpretation: ${interpretation.label}`, version, find("[data-after-placeholder]")),
    ]).then(() => {
      if (!disposed && version === imageVersion) comparison.setAttribute("aria-busy", "false");
    });
    find("[data-after-caption]").textContent = `AI · ${interpretation.label}`;
    find("[data-version-count]").textContent = `${Number(versionSelect.value) + 1} / ${artwork.variants.length}`;
  }

  function select(next) {
    index = (next + comparisons.length) % comparisons.length;
    const artwork = comparisons[index];
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
  listen(find("[data-prev]"), "click", () => select(index - 1));
  listen(find("[data-next]"), "click", () => select(index + 1));
  container.querySelectorAll("[data-view]").forEach(button => {
    listen(button, "click", () => {
      const side = button.dataset.view === "side";
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
