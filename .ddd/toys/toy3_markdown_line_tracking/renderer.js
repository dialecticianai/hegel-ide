// Line-tracking markdown renderer using marked.js

function parseMarkdownWithLines(markdown, outputFormat = 'html') {
  if (!markdown || markdown.trim().length === 0) {
    return outputFormat === 'html' ? '' : [];
  }

  const tokens = marked.lexer(markdown);
  const blocks = [];
  let currentLine = 1;

  for (const token of tokens) {
    // Skip non-block tokens or tokens without raw content
    if (!token.raw) continue;

    // Calculate line range for this token
    const lineStart = currentLine;
    const newlines = (token.raw.match(/\n/g) || []).length;
    const lineEnd = currentLine + newlines;

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
      currentLine = lineEnd;
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

    // Advance line counter
    currentLine = lineEnd;
  }

  if (outputFormat === 'array') {
    return blocks;
  }

  // Generate HTML with wrapper divs
  return blocks.map(block =>
    `<div class="markdown-block" data-line-start="${block.lineStart}" data-line-end="${block.lineEnd}" data-type="${block.type}">\n${block.html}\n</div>`
  ).join('\n');
}

function findMarkdownBlock(node) {
  // TODO: Implement DOM traversal to find containing markdown-block
  return null;
}

// Alpine.js component
window.markdownApp = function() {
  return {
    renderedContent: '',

    init() {
      // Load simple single-paragraph markdown for testing
      const markdown = 'This is a test paragraph.';
      this.renderedContent = parseMarkdownWithLines(markdown, 'html');
    }
  };
};
