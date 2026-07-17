import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const targets = [
  ".npm-cache",
  "node_modules",
  "apps/web/node_modules",
  "packages/core/node_modules",
  "apps/web/.next",
  "apps/web/coverage",
  "apps/web/playwright-report",
  "apps/web/test-results",
  "packages/core/dist",
  "coverage"
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
