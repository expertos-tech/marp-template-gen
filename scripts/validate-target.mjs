import path from 'node:path';
import { exists, fail, isDirectory, isFile, resolveInputPath } from './lib.mjs';

export async function resolveTargetFromSource({
  sourcePath,
  rawTarget,
  extension,
  suffix = '',
  failIfExists = false,
}) {
  const sourceDir = path.dirname(sourcePath);
  const sourceBase = path.basename(sourcePath, '.md');
  const targetBaseName = `${sourceBase}${suffix}${extension}`;

  if (!rawTarget) {
    const target = path.join(sourceDir, targetBaseName);
    await validateResolvedTarget(target, extension, failIfExists);
    return target;
  }

  if (rawTarget.endsWith('/')) {
    const dir = resolveInputPath(rawTarget);
    if (!(await isDirectory(dir))) {
      fail(`target directory does not exist: ${rawTarget}`);
    }
    const target = path.join(dir, targetBaseName);
    await validateResolvedTarget(target, extension, failIfExists);
    return target;
  }

  const resolved = resolveInputPath(rawTarget);
  if (await isDirectory(resolved)) {
    const target = path.join(resolved, targetBaseName);
    await validateResolvedTarget(target, extension, failIfExists);
    return target;
  }

  await validateResolvedTarget(resolved, extension, failIfExists);
  return resolved;
}

async function validateResolvedTarget(targetPath, expectedExtension, failIfExists) {
  const destinationExt = path.extname(targetPath).toLowerCase();
  if (destinationExt !== expectedExtension) {
    fail(`target must end with ${expectedExtension}: ${targetPath}`);
  }

  const destinationExists = await exists(targetPath);
  if (destinationExists && !(await isFile(targetPath))) {
    fail(`target exists and is not a regular file: ${targetPath}`);
  }

  if (destinationExists && failIfExists) {
    fail(`target already exists and requires explicit confirmation: ${targetPath}`);
  }

  const targetDir = path.dirname(targetPath);
  if (!(await isDirectory(targetDir))) {
    fail(`target directory does not exist: ${targetDir}`);
  }
}
