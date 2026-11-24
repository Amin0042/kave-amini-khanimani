// Antiquarium — experiences/registry.js
//
// The single list every future installation gets added to. main.js and
// the experience-selector UI both read this — neither one hard-codes an
// experience's id, title, or status anywhere else. Adding a new active
// installation later means: write its module, then add one entry here
// pointing `load` at it. Set renderMode: "dom" for a gallery that does
// not need the shared WebGL stage; its factory receives a DOM container.
//
// status:
//   "active"   — selectable, `load()` resolves to a real experience module
//   "reserved" — shown in the selector as a locked/future entry, not
//                selectable yet, no module to load

export const experiences = [
  {
    id: "floating-archive",
    title: "The Floating Archive",
    tagline: "A suspended constellation of the collected work.",
    status: "active",
    load: () => import("./floating-archive/index.js"),
  },
  {
    id: "cartography-of-memory",
    title: "Iran — Cartography of Memory",
    tagline: "A holographic geography, held up to the light.",
    status: "active",
    load: () => import("./cartography-of-memory.js"),
  },
  {
    id: "ante-et-post",
    title: "Ante et Post",
    tagline: "Original artworks and their AI transformations.",
    status: "active",
    renderMode: "dom",
    load: () => import("./ante-et-post.js"),
  },
];

export function getExperience(id) {
  return experiences.find((experience) => experience.id === id) || null;
}

export function getDefaultExperience() {
  return experiences.find((experience) => experience.status === "active") || null;
}
