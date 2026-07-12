// Publishes the canonical mock (mock/borrower-mock.json) into public/ so the running
// app can fetch it as an offline fallback. CRA's ModuleScopePlugin forbids importing
// files outside src/, and keeping a single source of truth beats duplicating the file.
const fs = require("fs");
const path = require("path");

const source = path.join(__dirname, "..", "mock", "borrower-mock.json");
const targetDir = path.join(__dirname, "..", "public", "mock");
const target = path.join(targetDir, "borrower-mock.json");

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);
