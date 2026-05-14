import { access, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptsDir, '..');
export const invocationCwd = process.env.INIT_CWD
  ? path.resolve(process.env.INIT_CWD)
  : process.cwd();

export function fail(message) {
  console.error(`erro: ${message}`);
  process.exit(1);
}

export async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function isFile(filePath) {
  try {
    const stat = await import('node:fs/promises').then((fs) => fs.stat(filePath));
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function isDirectory(filePath) {
  try {
    const stat = await import('node:fs/promises').then((fs) => fs.stat(filePath));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export function normalizeModel(rawModel) {
  const modelMatch = /^model-(\d+)$/.exec(rawModel);
  const numberMatch = /^(\d+)$/.exec(rawModel);
  const rawNumber = modelMatch?.[1] ?? numberMatch?.[1];

  if (!rawNumber) {
    fail(`modelo invalido '${rawModel}'. Use 01, 1 ou model-01.`);
  }

  return `model-${String(Number.parseInt(rawNumber, 10)).padStart(2, '0')}`;
}

export function ensureMarkdownPath(label, filePath) {
  if (!filePath.endsWith('.md')) {
    fail(`${label} deve terminar em .md: ${filePath}`);
  }
}

export function resolveInputPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(invocationCwd, filePath);
}

export async function readText(filePath) {
  return readFile(filePath, 'utf8');
}

export async function writeText(filePath, content) {
  await writeFile(filePath, content, 'utf8');
}
