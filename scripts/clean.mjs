import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const targets = [
  ".npm-cache",
  "node_modules",
  "packages/core/node_modules",
  ".next",
  "coverage",
  "playwright-report",
  "test-results",
  "packages/core/dist"
];

for (const relative of targets) {
  const absolute = join(root, relative);
  if (!existsSync(absolute)) {
    console.log(`skip  ${relative}`);
    continue;
  }
  rmSync(absolute, { recursive: true, force: true });
  console.log(`removed ${relative}`);
}
console.log("\nCleanup done. Run `npm install` to restore dependencies.");
