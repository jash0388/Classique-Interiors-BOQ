import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0f766e"/>
  <rect x="96" y="96" width="320" height="320" rx="48" fill="none" stroke="#fbbf24" stroke-width="14"/>
  <text x="256" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="220" font-weight="bold" fill="#ffffff" text-anchor="middle">CI</text>
</svg>`;

await mkdir("public", { recursive: true });
await sharp(Buffer.from(svg)).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(Buffer.from(svg)).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile("public/apple-touch-icon.png");
await sharp(Buffer.from(svg)).resize(64, 64).png().toFile("src/app/icon.png");
console.log("Icons written: public/icon-192.png, public/icon-512.png, public/apple-touch-icon.png, src/app/icon.png");
