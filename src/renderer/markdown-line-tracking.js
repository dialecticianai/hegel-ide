/**
 * Line-tracking markdown renderer
 *
 * Parses markdown and wraps each block element with line number metadata,
 * enabling selection-to-comment mapping for review functionality.
 *
 * Reference: .ddd/toys/toy3_markdown_line_tracking/
 */

import { marked } from 'marked';

/**
 * Parse markdown with block-level line tracking
 *
 * @param {string} markdown - Source markdown content
 * @param {string} outputFormat - 'html' for wrapped HTML string, 'array' for block objects
 * @returns {string|Array} - Wrapped HTML or array of block objects
 */
export function parseMarkdownWithLines(markdown, outputFormat = 'html') {
  // Handle empty or invalid input
  if (!markdown || markdown.trim().length === 0) {
    return outputFormat === 'html' ? '' : [];
  }

  const tokens = marked.lexer(markdown);
  const blocks = [];
  let currentLine = 1;

  for (const token of tokens) {
    // Skip tokens without raw content
    if (!token.raw) continue;

    // Calculate line range for this token
    const lineStart = currentLine;
    const totalNewlines = (token.raw.match(/\n/g) || []).length;

    // Count newlines in content (excluding trailing newlines)
    const trimmedRaw = token.raw.trimEnd();
    const contentNewlines = (trimmedRaw.match(/\n/g) || []).length;

    // lineEnd is the last line the content occupies
    const lineEnd = lineStart + contentNewlines;

    // Map token type to simplified block type
    let blockType = 'paragraph';
    if (token.type === 'heading') blockType = 'heading';
    else if (token.type === 'code') blockType = 'code';
    else if (token.type === 'list') blockType = 'list';
    else if (token.type === 'blockquote') blockType = 'blockquote';
    else if (token.type === 'hr') blockType = 'hr';
    else if (token.type === 'table') blockType = 'table';
    else if (token.type === 'paragraph') blockType = 'paragraph';
    else if (token.type === 'space') {
      // Skip space tokens but advance line counter
      currentLine = lineStart + totalNewlines;
      continue;
    }

    // Render the token to HTML
    const html = marked.parser([token]);

    blocks.push({
      type: blockType,
      lineStart: lineStart,
      lineEnd: lineEnd,
      html: html.trim()
    });

    // Advance line counter by total number of newlines (including trailing whitespace)
    currentLine = lineStart + totalNewlines;
  }

  if (outputFormat === 'array') {
    return blocks;
  }

  // Generate HTML with wrapper divs
  return blocks.map(block =>
    `<div class="markdown-block" data-line-start="${block.lineStart}" data-line-end="${block.lineEnd}" data-type="${block.type}">\n${block.html}\n</div>`
  ).join('\n');
}

/**
 * Find containing markdown-block element from a DOM node
 *
 * Walks up the DOM tree to find the nearest ancestor with class 'markdown-block'
 * and extracts line range metadata.
 *
 * @param {Node} node - DOM node (typically from selection anchor)
 * @returns {Object|null} - Block info {lineStart, lineEnd, blockType, element} or null
 */
export function findMarkdownBlock(node) {
  // Handle null/undefined input
  if (!node) return null;

  let current = node;

  // Walk up the DOM tree
  while (current && current !== document.body) {
    // Check if this is a markdown-block element
    if (current.classList && current.classList.contains('markdown-block')) {
      // Extract line range attributes
      const lineStart = parseInt(current.dataset.lineStart, 10);
      const lineEnd = parseInt(current.dataset.lineEnd, 10);
      const blockType = current.dataset.type;

      return {
        lineStart,
        lineEnd,
        blockType,
        element: current
      };
    }

    current = current.parentElement;
  }

  // No markdown-block found
  return null;
}
