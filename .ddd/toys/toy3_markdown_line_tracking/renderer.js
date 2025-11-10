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

function findMarkdownBlock(node) {
  // TODO: Implement DOM traversal to find containing markdown-block
  return null;
}

// Sample markdown content (inlined for file:// protocol compatibility)
const SAMPLE_MARKDOWN = `# Heading One

This is a paragraph spanning
multiple lines in the source.

## Heading Two

- List item one
- List item two
- List item three

\`\`\`javascript
function example() {
  return 42;
}
\`\`\`

Another paragraph.

> This is a blockquote
> spanning two lines.

---

1. Ordered item one
2. Ordered item two

Final paragraph at the end.
`;

// Alpine.js component
window.markdownApp = function() {
  return {
    renderedContent: '',

    init() {
      // Use sample markdown content
      this.renderedContent = parseMarkdownWithLines(SAMPLE_MARKDOWN, 'html');
    }
  };
};
