import * as path from 'path';

/**
 * Validates that a given relative path, when resolved against a root directory,
 * does not point to a location outside of that root directory. This prevents
 * path traversal attacks (e.g., '../../etc/passwd').
 *
 * @param rootDir - The absolute path to the workspace or safe root directory.
 * @param relativePath - The user-provided relative path.
 * @returns The resolved, absolute, and normalized path if it is safe.
 * @throws An error if the path is outside the root directory or input is invalid.
 */
export function safePath(rootDir: string, relativePath: string): string {
  // Input validation
  if (!rootDir || typeof rootDir !== 'string') {
    throw new Error('Root directory must be a non-empty string.');
  }
  if (!relativePath || typeof relativePath !== 'string') {
    throw new Error('Relative path must be a non-empty string.');
  }

  // Null byte injection protection
  if (rootDir.includes('\0')) {
    throw new Error('Path contains null byte: root directory is invalid.');
  }
  if (relativePath.includes('\0')) {
    throw new Error('Path contains null byte: relative path is invalid.');
  }

  const resolvedRoot = path.resolve(rootDir);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const normalizedPath = path.normalize(resolvedPath);

  // Ensure the resolved path is still within the root directory.
  // We check if it starts with the root path followed by a path separator
  // to prevent cases like '/root/dir' matching '/root/directory'.
  // On Windows, paths are case-insensitive.
  const isSafe = process.platform === 'win32'
    ? normalizedPath.toLowerCase().startsWith(resolvedRoot.toLowerCase() + path.sep) ||
      normalizedPath.toLowerCase() === resolvedRoot.toLowerCase()
    : normalizedPath.startsWith(resolvedRoot + path.sep) ||
      normalizedPath === resolvedRoot;

  if (!isSafe) {
    throw new Error(`Path traversal detected. Access to '${relativePath}' is denied.`);
  }

  return normalizedPath;
}
