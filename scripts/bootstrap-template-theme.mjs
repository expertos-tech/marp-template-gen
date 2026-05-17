#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const DIRECTORIES = [
  "templates/base",
  "themes",
  "themes/default",
  "themes/default/assets",
];

const FILES = [
  "templates/base/model.md",
  "templates/base/instructions.md",
  "templates/base/layout.css",
  "templates/base/slide-types.json",
  "themes/README.md",
  "themes/default/theme.css",
  "themes/default/theme.json",
];

function resolveSafe(relativePath) {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Unsafe absolute path: ${relativePath}`);
  }

  const normalized = path.normalize(relativePath);

  if (normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error(`Unsafe path traversal: ${relativePath}`);
  }

  const resolved = path.resolve(ROOT, normalized);

  if (!resolved.startsWith(`${ROOT}${path.sep}`) && resolved !== ROOT) {
    throw new Error(`Path escapes repository root: ${relativePath}`);
  }

  return resolved;
}

function ensureDirectory(relativePath, report) {
  const target = resolveSafe(relativePath);

  if (fs.existsSync(target)) {
    const stat = fs.statSync(target);

    if (!stat.isDirectory()) {
      throw new Error(`Expected directory but found file: ${relativePath}`);
    }

    report.preserved.push(relativePath);
    return;
  }

  fs.mkdirSync(target, { recursive: true });
  report.created.push(relativePath);
}

function ensureFile(relativePath, report) {
  const target = resolveSafe(relativePath);
  const parent = path.dirname(target);

  if (!fs.existsSync(parent)) {
    throw new Error(`Parent directory does not exist: ${path.dirname(relativePath)}`);
  }

  if (fs.existsSync(target)) {
    const stat = fs.statSync(target);

    if (!stat.isFile()) {
      throw new Error(`Expected file but found non-file path: ${relativePath}`);
    }

    report.preserved.push(relativePath);
    return;
  }

  fs.writeFileSync(target, "", "utf8");
  report.created.push(relativePath);
}

function main() {
  const report = {
    created: [],
    preserved: [],
  };

  for (const directory of DIRECTORIES) {
    ensureDirectory(directory, report);
  }

  for (const file of FILES) {
    ensureFile(file, report);
  }

  console.log("BOOTSTRAP TEMPLATE THEME REPORT");
  console.log("");

  console.log("created:");
  for (const item of report.created) {
    console.log(`- ${item}`);
  }

  console.log("");

  console.log("preserved:");
  for (const item of report.preserved) {
    console.log(`- ${item}`);
  }
}

try {
  main();
} catch (error) {
  console.error("BOOTSTRAP TEMPLATE THEME FAILED");
  console.error(error.message);
  process.exit(1);
}