// Builder titles — hacker culture, not corporate job titles.
export const BUILDER_TITLES = [
  "The Midnight Shipper",
  "Merge Conflict Survivor",
  "API Alchemist",
  "Prompt Architect",
  "Pixel Pirate",
  "Cloud Wrangler",
  "Bug Whisperer",
  "Production Firefighter",
  "Token Tamer",
  "CSS Archaeologist",
  "Stack Overflow Survivor",
  "Ships at 3AM",
  "Sleep Optional",
  "Sunset Debugger",
  "Tide Pool Hacker",
  "Founder in Flip-Flops",
  "Latency Slayer",
  "Deploy at Dawn",
  "Recursive Dreamer",
  "Chaos Compiler",
  "Ocean-Deployed",
  "Full Stack, No Sleep",
];

export const BUILD_MODES = ["Sprint Mode", "Deep Focus", "Vibe Coding", "Ship-It Mode", "Night Owl Build"];

// User-picked, not generated — the one lightweight stack/role input the
// brief asks for. Kept to a single tap, six options, no free text.
export const STACKS = [
  { id: "ai", label: "AI" },
  { id: "web", label: "WEB" },
  { id: "mobile", label: "MOBILE" },
  { id: "design", label: "DESIGN" },
  { id: "hardware", label: "HARDWARE" },
  { id: "other", label: "OTHER" },
];

export function generateBuilderTitle(seed) {
  const idx = Math.abs(hashCode(seed)) % BUILDER_TITLES.length;
  return BUILDER_TITLES[idx];
}

export function generateBuildMode(seed) {
  const idx = Math.abs(hashCode(seed + "mode")) % BUILD_MODES.length;
  return BUILD_MODES[idx];
}

// Collectible builder number — zero-padded to read like a real limited
// edition tag, not an actual attendee registration ID.
export function generateBuilderNumber(seed) {
  const n = (Math.abs(hashCode(seed + "num")) % 899) + 100; // 100-998
  return `#${String(n).padStart(4, "0")}`;
}

export function generateSerial(seed) {
  const n = Math.abs(hashCode(seed + "serial"));
  const code = n.toString(36).toUpperCase().slice(0, 6).padStart(6, "0");
  return `HHG26-${code}`;
}

// Rarity tier — the social-comparison hook. Four tiers, restrained visual
// difference between them (no NFT-gacha treatment), weighted so Legendary
// stays genuinely rare: 52% Common, 30% Rare, 13% Epic, 5% Legendary.
export function generateRarity(seed) {
  const n = Math.abs(hashCode(seed + "rarity")) % 100;
  if (n < 52) return "Common";
  if (n < 82) return "Rare";
  if (n < 95) return "Epic";
  return "Legendary";
}

// Builder DNA — two compact stats, the kind of number people quote-tweet
// to compare or disagree with. Kept to a single short line on the card.
export function generateBuilderDNA(seed) {
  const focus = (Math.abs(hashCode(seed + "focus")) % 41) + 60; // 60-100
  const ship = (Math.abs(hashCode(seed + "ship")) % 41) + 60;
  return { focus, ship };
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
