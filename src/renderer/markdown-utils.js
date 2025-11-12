/**
 * Shared markdown utilities
 *
 * Common functions for path resolution and URL transformation
 * used by both markdown.js and markdown-line-tracking.js
 */

/**
 * Get the directory portion of an absolute file path
 *
 * @param {string} absoluteFilePath - Full absolute path to a file
 * @returns {string} - Directory path (everything before the last '/')
 *
 * @example
 * getFileDirectory('/Users/foo/project/README.md')
 * // Returns: '/Users/foo/project'
 */
export function getFileDirectory(absoluteFilePath) {
  return absoluteFilePath.substring(0, absoluteFilePath.lastIndexOf('/'));
}

/**
 * Resolve a relative path against an absolute file path
 *
 * @param {string} absoluteFilePath - Absolute path to the current file
 * @param {string} relativePath - Relative path to resolve
 * @returns {string} - Absolute path
 *
 * @example
 * resolveRelativePath('/Users/foo/project/README.md', 'docs/guide.md')
 * // Returns: '/Users/foo/project/docs/guide.md'
 */
export function resolveRelativePath(absoluteFilePath, relativePath) {
  const dir = getFileDirectory(absoluteFilePath);
  return `${dir}/${relativePath}`;
}

/**
 * Transform relative image paths in HTML to absolute file:// URLs
 *
 * Replaces <img src="relative/path.png"> with <img src="file:///absolute/path.png">
 * so Electron can load the images. Skips absolute URLs (http://, https://, file://, data:)
 *
 * @param {string} html - HTML content with image tags
 * @param {string} absoluteFilePath - Absolute path to the markdown file
 * @returns {string} - HTML with transformed image paths
 *
 * @example
 * transformImagePaths('<img src="logo.png">', '/Users/foo/project/README.md')
 * // Returns: '<img src="file:///Users/foo/project/logo.png">'
 */
export function transformImagePaths(html, absoluteFilePath) {
  if (!absoluteFilePath) return html;

  return html.replace(
    /(<img[^>]+src=["'])([^"':]+)(["'])/g,
    (match, prefix, src, suffix) => {
      // Skip absolute URLs (http://, https://, file://, data:)
      if (src.match(/^([a-z]+:|\/)/i)) {
        return match;
      }
      // Convert relative path to file:// URL
      const absolutePath = `file://${resolveRelativePath(absoluteFilePath, src)}`;
      return `${prefix}${absolutePath}${suffix}`;
    }
  );
}
