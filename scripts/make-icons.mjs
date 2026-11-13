// Renders the app icons from an inline SVG (a hanger on a dark tile).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1d1b19"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - 2 * pad) / 512})" fill="none" stroke="#f3e6d3" stroke-width="22" stroke-linecap="round" stroke-linejoin="round">
    <path d="M256 150c0-24 18-40 40-40s40 18 40 40c0 26-28 34-80 70"/>
    <path d="M256 220 90 340c-16 12-8 36 12 36h308c20 0 28-24 12-36L256 220z"/>
  </g>
  <circle cx="380" cy="150" r="16" fill="#d98b5f"/>
</svg>`;

mkdirSync('public/icons', { recursive: true });
const jobs = [
  ['icon-192.png', 192, 40],
  ['icon-512.png', 512, 40],
  ['apple-touch-icon.png', 180, 40],
  ['maskable-512.png', 512, 110],
];
for (const [name, size, pad] of jobs) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(`public/icons/${name}`);
}
console.log('icons written');
