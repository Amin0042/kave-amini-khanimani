// One original per artwork, with all its AI-assisted interpretations grouped below.
// asset() resolves independently of the page URL. See sources.json beside the images
// for the supplied filenames and display dimensions. Desktop source files are untouched.
const asset = name => new URL(`../../../Assets/Antiquarium/ante-et-post/${name}.webp`, import.meta.url).href;
const variant = (id, label) => ({ id, label, image: asset(id) });

export const comparisons = [
  {
    id: "achaemenid", title: "Achaemenid",
    original: asset("achaemenid-original"), thumbnail: asset("achaemenid-inflated-thumb"),
    description: "The tall crown, geometric eye and circular beard of the original return in three sculptural interpretations.",
    variants: [
      variant("achaemenid-inflated", "Inflated warrior bust"),
      variant("achaemenid-twins", "Twin Achaemenid"),
      variant("achaemenid-emblem", "Achaemenid emblem"),
    ],
  },
  {
    id: "median-pathfinder", title: "Median Pathfinder",
    original: asset("median-pathfinder-original"), thumbnail: asset("median-pathfinder-monochrome-thumb"),
    description: "A pointed headdress and flowing profile move from flat black-and-white shapes into rounded, ornamental forms.",
    variants: [
      variant("median-pathfinder-monochrome", "Monochrome ornamental bust"),
      variant("median-pathfinder-twins", "Twin Median Pathfinder"),
    ],
  },
  {
    id: "parthian-circle", title: "Parthian Circle II",
    original: asset("parthian-circle-original"), thumbnail: asset("parthian-circle-bronze-thumb"),
    description: "The portrait above an open black circle becomes a bronze bust resting on a rounded black torus.",
    variants: [variant("parthian-circle-bronze", "Bronze bust on black torus")],
  },
  {
    id: "parthian-emblem", title: "Parthian Circle",
    original: asset("parthian-emblem-original"), thumbnail: asset("parthian-emblem-bronze-thumb"),
    description: "The crossed points and circular frame remain, reimagined as a sculptural emblem beneath a bronze portrait.",
    variants: [variant("parthian-emblem-bronze", "Inflated bronze bust emblem")],
  },
  {
    id: "exhausted-man", title: "Exhausted Man I",
    original: asset("exhausted-man-original"), thumbnail: asset("exhausted-man-genie-thumb"),
    description: "The raised hand, bent leg and pointed footwear carry through from the signed original into a glossy figure.",
    variants: [variant("exhausted-man-genie", "Glossy black genie")],
  },
  {
    id: "exhausted-man-two", title: "Exhausted Man II",
    original: asset("exhausted-man-two-original"), thumbnail: asset("exhausted-man-two-inflated-thumb"),
    description: "The abstract face retains its sweeping hair, circular eye and extended nose as the shapes gain volume and shine.",
    variants: [variant("exhausted-man-two-inflated", "Glossy inflated portrait")],
  },
  {
    id: "fight", title: "Fight",
    original: asset("fight-original"), thumbnail: asset("fight-obsidian-thumb"),
    description: "Two patterned warrior portraits and interlocking black strokes become an obsidian-like sculptural duel.",
    variants: [variant("fight-obsidian", "Obsidian warrior duel")],
  },
];
