import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fail, readText, scriptsDir, writeText } from './lib.mjs';

function usage() {
  console.log(`Uso:
  npm --prefix scripts run generate-slides -- <model> <source> [target]

Objetivo:
  Gerar um Markdown Marp final com base no template model.md, incluindo
  preenchimento de placeholders, CSS embutido e limpeza automatica de
  comentarios de instrucao.

Regras:
  - Executa o fluxo de validacao do to-marp para resolver MODEL_DIR/SOURCE/TARGET
  - Preenche o bloco <style>{{EMBEDDED_MODEL_CSS}}</style> com CSS efetivo
  - Gera capa + slides de conteudo + fechamento
  - Executa strip-instructions no arquivo gerado antes de finalizar`);
}

function runNodeScript(scriptName, args = []) {
  const result = spawnSync(process.execPath, [path.join(scriptsDir, scriptName), ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    fail(stderr || `${scriptName} falhou.`);
  }

  return result.stdout;
}

function parseKeyValueOutput(output) {
  const data = {};
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    const index = line.indexOf('=');
    if (index <= 0) {
      continue;
    }
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    data[key] = value;
  }

  return data;
}

function buildEmbeddedCss(themeCss) {
  const lines = themeCss.split(/\r?\n/);
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return true;
    }
    if (trimmed.startsWith('* @theme')) {
      return false;
    }
    if (trimmed.startsWith('@import')) {
      return false;
    }
    return true;
  });

  return kept.join('\n').trim();
}

function extractClassBlocks(modelContent) {
  const markerRegex = /<!--\s*_class:\s*([a-z-]+)\s*-->/g;
  const matches = Array.from(modelContent.matchAll(markerRegex));

  if (matches.length === 0) {
    fail('model.md sem blocos de slide com <!-- _class: ... -->.');
  }

  const firstMarkerIndex = matches[0].index ?? 0;
  const preamble = modelContent.slice(0, firstMarkerIndex).trim();
  const blocks = new Map();

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const className = current[1];
    const start = current.index ?? 0;
    const nextStart = i + 1 < matches.length ? (matches[i + 1].index ?? modelContent.length) : modelContent.length;
    let block = modelContent.slice(start, nextStart).trim();

    block = block.replace(/\n---\s*$/m, '').trim();

    if (!blocks.has(className)) {
      blocks.set(className, block);
    }
  }

  return { preamble, blocks };
}

function replacePlaceholders(template, values) {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => {
    if (Object.hasOwn(values, key)) {
      return values[key];
    }
    return '';
  });
}

function parseSourceSections(sourceMarkdown) {
  const lines = sourceMarkdown.split(/\r?\n/);
  const titleLine = lines.find((line) => /^#\s+/.test(line));
  const title = titleLine ? titleLine.replace(/^#\s+/, '').trim() : 'Apresentacao';
  const sections = [];
  let current = null;

  for (const line of lines) {
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      if (current) {
        sections.push(current);
      }
      current = { title: h2[1].trim(), bodyLines: [] };
      continue;
    }

    if (/^#\s+/.test(line)) {
      continue;
    }

    if (!current) {
      continue;
    }

    current.bodyLines.push(line);
  }

  if (current) {
    sections.push(current);
  }

  if (sections.length === 0) {
    const body = lines.filter((line) => !/^#\s+/.test(line)).join('\n').trim();
    sections.push({
      title: 'Conteudo',
      bodyLines: [body || 'Conteudo de entrada sem secoes H2 identificadas.'],
    });
  }

  const normalized = sections.map((section) => {
    const body = section.bodyLines.join('\n').trim();
    return {
      title: section.title,
      body: body || 'Sem conteudo adicional nesta secao.',
    };
  });

  return { title, sections: normalized };
}

function buildSlides({ source, preambleTemplate, blocks, embeddedCss }) {
  const coverTemplate = blocks.get('cover');
  const contentTemplate = blocks.get('content');
  const closingTemplate = blocks.get('closing');

  if (!coverTemplate || !contentTemplate || !closingTemplate) {
    fail('model.md precisa ter blocos cover, content e closing para gerar slides.');
  }

  const subtitle = source.sections[0]?.title || 'Panorama';
  const preamble = replacePlaceholders(preambleTemplate, {
    EMBEDDED_MODEL_CSS: embeddedCss,
  });

  const slides = [];
  slides.push(
    replacePlaceholders(coverTemplate, {
      COVER_IMAGE: '',
      CONTENT_TITLE: source.title,
      CONTENT_SUBTITLE: subtitle,
      CONTENT_META: 'Material de teste gerado automaticamente',
    }).trim(),
  );

  for (const section of source.sections) {
    slides.push(
      replacePlaceholders(contentTemplate, {
        CONTENT_TITLE: section.title,
        CONTENT_BODY: section.body,
        CONTENT_NOTE: '',
      }).trim(),
    );
  }

  slides.push(
    replacePlaceholders(closingTemplate, {
      CLOSING_TITLE: 'Obrigado',
      CLOSING_SUBTITLE: 'Proximos passos e discussoes',
    }).trim(),
  );

  return `${preamble}\n\n${slides.join('\n\n---\n\n')}\n`;
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '-h' || args[0] === '--help') {
    usage();
    return;
  }

  if (args.length < 2 || args.length > 3) {
    usage();
    process.exit(1);
  }

  const toMarpOutput = runNodeScript('to-marp.mjs', args);
  const parsed = parseKeyValueOutput(toMarpOutput);
  const modelDir = parsed.MODEL_DIR;
  const sourcePath = parsed.SOURCE;
  const targetPath = parsed.TARGET;

  if (!modelDir || !sourcePath || !targetPath) {
    fail('to-marp nao retornou MODEL_DIR, SOURCE e TARGET de forma valida.');
  }

  const modelPath = path.join(modelDir, 'model.md');
  const themePath = path.join(modelDir, 'theme.css');
  const modelContent = await readText(modelPath);
  const themeCss = await readText(themePath);
  const sourceMarkdown = await readText(sourcePath);

  const embeddedCss = buildEmbeddedCss(themeCss);
  const { preamble, blocks } = extractClassBlocks(modelContent);
  const parsedSource = parseSourceSections(sourceMarkdown);
  const output = buildSlides({
    source: parsedSource,
    preambleTemplate: preamble,
    blocks,
    embeddedCss,
  });

  await writeText(targetPath, output);
  runNodeScript('strip-instruction-comments.mjs', [targetPath]);
  runNodeScript('embed-images.mjs', [targetPath]);

  console.log(`MODEL_DIR=${modelDir}`);
  console.log(`SOURCE=${sourcePath}`);
  console.log(`TARGET=${targetPath}`);
}

await main();
