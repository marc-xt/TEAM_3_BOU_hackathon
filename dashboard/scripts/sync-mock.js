/**
 * Copies mock/dashboard-mock.json into public/mock/ so Create React App
 * can serve it as a static asset (CRA refuses to import files from
 * outside src/). Runs automatically before `start` and `build` via the
 * npm "pre" script hooks in package.json — kept as a plain Node script
 * instead of a symlink so it works the same on Windows, macOS, and Linux.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'mock', 'dashboard-mock.json');
const destDir = path.join(__dirname, '..', 'public', 'mock');
const dest = path.join(destDir, 'dashboard-mock.json');

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log('Synced mock/dashboard-mock.json -> public/mock/dashboard-mock.json');
