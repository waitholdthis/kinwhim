// Renders Kinwhim's app icons from the brand mark (public/kinwhim-mark.svg).
// Run from mobile/: `npm run icons`. Uses sharp from the web project.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../package.json"));
const sharp = require("sharp");
const out = path.join(here, "../assets");
mkdirSync(out, { recursive: true });

const PAPER = "#F6F1E8";
const CORAL = "#EF8354";
const INK = "#242117";
const BUTTER = "#F5D98B";

// The mark on a 64-unit grid, as in public/kinwhim-mark.svg.
const sparkle = "M31.7 17.5C32.9 25.2 36.8 29.2 44.5 30.3C36.8 31.5 32.9 35.4 31.7 43.1C30.5 35.4 26.6 31.5 18.9 30.3C26.6 29.2 30.5 25.2 31.7 17.5Z";
const mark = ({ tile = CORAL, star = INK, dot = BUTTER, shadow = true, glyphOnly = false } = {}) => glyphOnly
  ? `<path d="${sparkle}" fill="${star}"/><circle cx="47" cy="17" r="3" fill="${dot}"/>`
  : `
  ${shadow ? `<rect x="10.5" y="10.5" width="48" height="48" rx="16" transform="rotate(-7 34.5 34.5)" fill="${INK}"/>` : ""}
  <rect x="8" y="8" width="48" height="48" rx="16" transform="rotate(-7 32 32)" fill="${tile}"/>
  <path d="${sparkle}" fill="${star}"/>
  <circle cx="47" cy="17" r="3" fill="${dot}"/>`;

// `scale` is how much of the canvas the 64-unit mark occupies.
function svg({ size, background, scale, ...options }) {
  const markSize = size * scale;
  const offset = (size - markSize) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""}
    <g transform="translate(${offset} ${offset}) scale(${markSize / 64})">${mark(options)}</g>
  </svg>`);
}

const jobs = [
  // iOS/App Store: opaque, no rounded corners (the OS masks them).
  ["icon.png", svg({ size: 1024, background: PAPER, scale: 0.82 })],
  // Android adaptive icon layers; keep the mark inside the 66% safe zone.
  ["android-icon-foreground.png", svg({ size: 1024, scale: 0.6, shadow: true })],
  ["android-icon-monochrome.png", svg({ size: 1024, scale: 1.1, star: "#FFFFFF", dot: "#FFFFFF", glyphOnly: true })],
  ["splash-icon.png", svg({ size: 1024, scale: 0.9 })],
  // Android status-bar notification icon: white silhouette on transparent.
  ["notification-icon.png", svg({ size: 96, scale: 1.5, star: "#FFFFFF", dot: "#FFFFFF", glyphOnly: true })],
  ["favicon.png", svg({ size: 196, background: PAPER, scale: 0.86 })],
];

for (const [name, source] of jobs) {
  const image = sharp(source).png();
  if (name === "icon.png") image.flatten({ background: PAPER });
  await image.toFile(path.join(out, name));
  console.log("wrote", name);
}

// Store artwork (not bundled in the app).
const storeDir = path.join(here, "../../docs/store/artwork");
mkdirSync(storeDir, { recursive: true });
await sharp(svg({ size: 512, background: PAPER, scale: 0.82 })).flatten({ background: PAPER }).png()
  .toFile(path.join(storeDir, "play-icon-512.png"));
const feature = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${PAPER}"/>
  <g transform="translate(70 120) scale(4)">${mark()}</g>
  <text x="400" y="215" font-family="Georgia, serif" font-weight="900" font-size="76" fill="${INK}" letter-spacing="-3">kinwhim</text>
  <text x="402" y="290" font-family="Georgia, serif" font-weight="700" font-size="38" fill="${INK}">One selfie. One shared</text>
  <text x="402" y="338" font-family="Georgia, serif" font-weight="700" font-size="38" fill="${INK}">little world.</text>
  <rect x="402" y="372" width="250" height="44" rx="22" fill="${CORAL}"/>
  <text x="427" y="401" font-family="Arial, sans-serif" font-weight="800" font-size="18" fill="${INK}">Private friend circles</text>
</svg>`);
await sharp(feature).png().toFile(path.join(storeDir, "play-feature-graphic.png"));
console.log("wrote store artwork");
