// One original per artwork, with digital versions and AI interpretations grouped below.
// asset() resolves independently of the page URL. See sources.json beside the images
// for the supplied filenames and display dimensions. Desktop source files are untouched.
const asset = name => new URL(`../../../Assets/Antiquarium/ante-et-post/${name}.webp`, import.meta.url).href;
const variant = (id, label, medium = "ai", mediumLabel) => ({ id, label, medium, mediumLabel, image: asset(id) });

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
  {
    id: "caravaggio", title: "The Caravaggio Composition",
    original: asset("caravaggio-original"), thumbnail: asset("caravaggio-inflated-thumb"),
    description: "The masks, candles, blades and clustered figures of the signed composition return in geometric, Bauhaus and sculptural interpretations.",
    variants: [
      variant("caravaggio-geometric", "Geometric composition"),
      variant("caravaggio-bauhaus", "Bauhaus composition"),
      variant("caravaggio-inflated", "Inflated forms on concrete"),
    ],
  },
  {
    id: "cow", title: "The Cow",
    original: asset("cow-original"), thumbnail: asset("cow-architecture-thumb"),
    description: "The horned face, third eye and patterned contours of the drawing become a porous architectural sculpture.",
    variants: [variant("cow-architecture", "Architectural mask")],
  },
  {
    id: "dc", title: "DC",
    original: asset("dc-original"), thumbnail: asset("dc-bauhaus-thumb"),
    description: "The central figure, radiating arms, aircraft and inverted architecture are reinterpreted as a silhouette and a geometric architectural composition.",
    variants: [variant("dc-silhouette", "Monochrome silhouette"), variant("dc-bauhaus", "Bauhaus architecture")],
  },
  {
    id: "dualism", title: "Dualism",
    original: asset("dualism-original"), thumbnail: asset("dualism-colour-thumb"),
    description: "Four mirrored profiles and paired buildings emerge from the red line composition in richly coloured, dimensional form.",
    variants: [variant("dualism-colour", "Chromatic mirrored portraits")],
  },
  {
    id: "karl-marx", title: "Karl Marx",
    original: asset("marx-original"), thumbnail: asset("marx-bauhaus-thumb"),
    description: "The original Illustrator composition, with its seated figure, circular details and large M, is paired with monochrome and colourful Bauhaus AI interpretations.",
    variants: [
      variant("marx-monochrome", "Monochrome geometric portrait"),
      variant("marx-bauhaus", "Colourful Bauhaus portrait"),
    ],
  },
  {
    id: "magical-cat", title: "Magical Cat",
    original: asset("magical-cat-original"), thumbnail: asset("magical-cat-bauhaus-thumb"),
    description: "The symmetrical black-and-white cat retains its geometric eyes, pointed ears and nested faces in a coloured interpretation.",
    variants: [variant("magical-cat-bauhaus", "Bauhaus colour study")],
  },
  {
    id: "shajarian", title: "Mohammad Reza Shajarian",
    original: asset("shajarian-original"), thumbnail: asset("shajarian-textile-thumb"),
    description: "The supplied source portrait and its circular frame are reinterpreted through a tactile textile surface.",
    variants: [variant("shajarian-textile", "Textile portrait")],
  },
  {
    id: "oscar-wilde", title: "Oscar Wilde",
    original: asset("oscar-wilde-original"), thumbnail: asset("oscar-wilde-textile-thumb"),
    originalStudies: [variant("oscar-wilde-monochrome-original", "Monochrome study")],
    description: "The colour and monochrome studies are original digital works by Kave Amini Khanimani. He created the 3D portrait using Adobe's 3D feature, without AI. The textile portrait is a separate AI interpretation.",
    variants: [variant("oscar-wilde-inflated", "Adobe 3D portrait", "adobe", "Adobe 3D artwork"), variant("oscar-wilde-textile", "Textile portrait")],
  },
  {
    id: "representator", title: "The Representator",
    original: asset("representator-original"), thumbnail: asset("representator-sculptural-thumb"),
    description: "The original composition and inflated geometric figure are original digital works by Kave Amini Khanimani, created with Adobe products. The sculptural figure is an AI interpretation.",
    variants: [variant("representator-inflated", "Inflated geometric figure", "adobe"), variant("representator-sculptural", "Sculptural figure")],
  },
];
