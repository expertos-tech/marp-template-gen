import path from 'node:path';
import { readFile, rename, writeFile } from 'node:fs/promises';
import {
  ensureMarkdownPath,
  fail,
  isDirectory,
  isFile,
  readText,
  resolveInputPath,
  writeText,
} from './lib.mjs';

const LARGE_FILE_THRESHOLD = 2 * 1024 * 1024;

function usage() {
  console.log(`Uso:
  npm --prefix scripts run embed-images -- <source.md> [target.md]

Objetivo:
  Converter referencias de imagem locais em Markdown e HTML para data: URI.

Regras:
  - Suporta Markdown: ![alt](path)
  - Suporta HTML: <img src="path" ...>
  - Ignora URLs remotas (http/https) e data: URI
  - Suporta png, jpg, jpeg, webp e svg
  - Se target nao for informado, sobrescreve source com escrita segura`);
}

function isRemoteOrEmbedded(ref) {
  return /^https?:\/\//i.test(ref) || /^data:/i.test(ref);
}

function toMimeType(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  fail(`extensao de imagem nao suportada: ${imagePath}`);
}

function parseMarkdownDestination(rawDestination) {
  const trimmed = rawDestination.trim();
  if (trimmed.startsWith('<')) {
    const end = trimmed.indexOf('>');
    if (end > 1) {
      return {
        url: trimmed.slice(1, end).trim(),
        suffix: trimmed.slice(end + 1),
      };
    }
  }

  const titleMatch = /^(\S+)(\s+.+)$/.exec(trimmed);
  if (titleMatch) {
    return { url: titleMatch[1], suffix: titleMatch[2] };
  }

  return { url: trimmed, suffix: '' };
}

function toSafeTempPath(filePath) {
  return `${filePath}.tmp-${process.pid}-${Date.now()}`;
}

async function buildDataUri(referencePath, sourceDir) {
  const resolved = path.isAbsolute(referencePath)
    ? referencePath
    : path.resolve(sourceDir, referencePath);

  if (!(await isFile(resolved))) {
    fail(`imagem local nao encontrada: ${referencePath}`);
  }

  const buffer = await readFile(resolved);
  if (buffer.byteLength > LARGE_FILE_THRESHOLD) {
    console.error(
      `aviso: imagem grande detectada (${buffer.byteLength} bytes): ${referencePath}`,
    );
  }

  const mimeType = toMimeType(resolved);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function replaceMarkdownImages(content, sourceDir) {
  const regex = /!\[([^\]]*)\]\(([^)\n]+)\)/g;
  let output = '';
  let lastIndex = 0;
  let conversions = 0;

  for (const match of content.matchAll(regex)) {
    const full = match[0];
    const alt = match[1];
    const destination = match[2];
    const index = match.index ?? 0;

    output += content.slice(lastIndex, index);

    const { url, suffix } = parseMarkdownDestination(destination);
    if (isRemoteOrEmbedded(url)) {
      output += full;
      lastIndex = index + full.length;
      continue;
    }

    const dataUri = await buildDataUri(url, sourceDir);
    output += `![${alt}](${dataUri}${suffix})`;
    conversions += 1;
    lastIndex = index + full.length;
  }

  output += content.slice(lastIndex);
  return { content: output, conversions };
}

function getImgSrcAttribute(tag) {
  const quoted = /\bsrc\s*=\s*(['"])(.*?)\1/i.exec(tag);
  if (quoted) {
    return { value: quoted[2], quoted: true };
  }

  const unquoted = /\bsrc\s*=\s*([^\s>]+)/i.exec(tag);
  if (unquoted) {
    return { value: unquoted[1], quoted: false };
  }

  return null;
}

async function replaceHtmlImages(content, sourceDir) {
  const regex = /<img\b[^>]*>/gi;
  let output = '';
  let lastIndex = 0;
  let conversions = 0;

  for (const match of content.matchAll(regex)) {
    const full = match[0];
    const index = match.index ?? 0;
    output += content.slice(lastIndex, index);

    const src = getImgSrcAttribute(full);
    if (!src || isRemoteOrEmbedded(src.value)) {
      output += full;
      lastIndex = index + full.length;
      continue;
    }

    const dataUri = await buildDataUri(src.value, sourceDir);
    const replaced = src.quoted
      ? full.replace(/\bsrc\s*=\s*(['"])(.*?)\1/i, `src="${dataUri}"`)
      : full.replace(/\bsrc\s*=\s*([^\s>]+)/i, `src="${dataUri}"`);

    output += replaced;
    conversions += 1;
    lastIndex = index + full.length;
  }

  output += content.slice(lastIndex);
  return { content: output, conversions };
}

async function safeWrite(filePath, content) {
  const tmpPath = toSafeTempPath(filePath);
  await writeFile(tmpPath, content, 'utf8');
  await rename(tmpPath, filePath);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '-h' || args[0] === '--help') {
    usage();
    return;
  }

  if (args.length < 1 || args.length > 2) {
    usage();
    process.exit(1);
  }

  const [rawSource, rawTarget] = args;
  ensureMarkdownPath('source', rawSource);

  const source = resolveInputPath(rawSource);
  if (!(await isFile(source))) {
    fail(`source nao existe ou nao e arquivo: ${rawSource}`);
  }

  const target = rawTarget ? resolveInputPath(rawTarget) : source;
  ensureMarkdownPath('target', target);

  const targetDir = path.dirname(target);
  if (!(await isDirectory(targetDir))) {
    fail(`diretorio do target nao existe: ${targetDir}`);
  }

  const sourceDir = path.dirname(source);
  const original = await readText(source);
  const markdownReplaced = await replaceMarkdownImages(original, sourceDir);
  const htmlReplaced = await replaceHtmlImages(markdownReplaced.content, sourceDir);
  const converted = htmlReplaced.content;
  const totalConversions = markdownReplaced.conversions + htmlReplaced.conversions;

  if (rawTarget) {
    await writeText(target, converted);
  } else if (totalConversions > 0) {
    await safeWrite(source, converted);
  }

  console.log(`SOURCE=${source}`);
  console.log(`TARGET=${target}`);
  console.log(`CONVERSIONS=${totalConversions}`);
}

await main();
