import { describe, it, expect } from 'vitest';
import { parseMarkdownWithLines, findMarkdownBlock } from '../../src/renderer/markdown-line-tracking.js';

describe('parseMarkdownWithLines', () => {
  describe('basic functionality', () => {
    it('parses single-line paragraph', () => {
      const result = parseMarkdownWithLines('Test paragraph.', 'array');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'paragraph',
        lineStart: 1,
        lineEnd: 1,
        html: expect.stringContaining('<p>Test paragraph.</p>')
      });
    });

    it('parses single-line heading', () => {
      const result = parseMarkdownWithLines('# Heading One', 'array');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'heading',
        lineStart: 1,
        lineEnd: 1,
        html: expect.stringContaining('<h1>Heading One</h1>')
      });
    });

    it('parses multi-line paragraph', () => {
      const markdown = `This is a paragraph spanning
multiple lines in the source.`;

      const result = parseMarkdownWithLines(markdown, 'array');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('paragraph');
      expect(result[0].lineStart).toBe(1);
      expect(result[0].lineEnd).toBe(2);
    });

    it('parses code block with correct line range', () => {
      const markdown = `\`\`\`javascript
function test() {
  return 42;
}
\`\`\``;

      const result = parseMarkdownWithLines(markdown, 'array');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('code');
      expect(result[0].lineStart).toBe(1);
      expect(result[0].lineEnd).toBe(5);
      expect(result[0].html).toContain('function test()');
    });

    it('parses list as single block', () => {
      const markdown = `- Item one
- Item two
- Item three`;

      const result = parseMarkdownWithLines(markdown, 'array');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('list');
      expect(result[0].lineStart).toBe(1);
      expect(result[0].lineEnd).toBe(3);
    });

    it('parses blockquote', () => {
      const markdown = `> Quote line one
> Quote line two`;

      const result = parseMarkdownWithLines(markdown, 'array');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('blockquote');
      expect(result[0].lineStart).toBe(1);
      expect(result[0].lineEnd).toBe(2);
    });

    it('parses horizontal rule', () => {
      const result = parseMarkdownWithLines('---', 'array');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('hr');
      expect(result[0].lineStart).toBe(1);
      expect(result[0].lineEnd).toBe(1);
    });
  });

  describe('multi-block documents', () => {
    it('maintains sequential line numbers', () => {
      const markdown = `# Heading One

Paragraph one.

## Heading Two

Paragraph two.`;

      const result = parseMarkdownWithLines(markdown, 'array');

      expect(result).toHaveLength(4);

      // Heading One at line 1
      expect(result[0].lineStart).toBe(1);
      expect(result[0].lineEnd).toBe(1);
      expect(result[0].type).toBe('heading');

      // Paragraph one at line 3
      expect(result[1].lineStart).toBe(3);
      expect(result[1].lineEnd).toBe(3);
      expect(result[1].type).toBe('paragraph');

      // Heading Two at line 5
      expect(result[2].lineStart).toBe(5);
      expect(result[2].lineEnd).toBe(5);
      expect(result[2].type).toBe('heading');

      // Paragraph two at line 7
      expect(result[3].lineStart).toBe(7);
      expect(result[3].lineEnd).toBe(7);
      expect(result[3].type).toBe('paragraph');
    });

    it('handles consecutive blank lines', () => {
      const markdown = `# First


## Second`;

      const result = parseMarkdownWithLines(markdown, 'array');

      expect(result).toHaveLength(2);
      expect(result[0].lineStart).toBe(1);
      expect(result[0].lineEnd).toBe(1);
      expect(result[1].lineStart).toBe(4);
      expect(result[1].lineEnd).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty string', () => {
      const result = parseMarkdownWithLines('', 'array');
      expect(result).toEqual([]);
    });

    it('returns empty array for whitespace only', () => {
      const result = parseMarkdownWithLines('   \n\n  \n   ', 'array');
      expect(result).toEqual([]);
    });

    it('handles null input', () => {
      const result = parseMarkdownWithLines(null, 'array');
      expect(result).toEqual([]);
    });

    it('handles undefined input', () => {
      const result = parseMarkdownWithLines(undefined, 'array');
      expect(result).toEqual([]);
    });
  });

  describe('output formats', () => {
    it('returns array when format is "array"', () => {
      const result = parseMarkdownWithLines('Test', 'array');
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns HTML string when format is "html"', () => {
      const result = parseMarkdownWithLines('Test', 'html');
      expect(typeof result).toBe('string');
      expect(result).toContain('class="markdown-block"');
      expect(result).toContain('data-line-start="1"');
      expect(result).toContain('data-line-end="1"');
      expect(result).toContain('data-type="paragraph"');
    });

    it('defaults to HTML format', () => {
      const result = parseMarkdownWithLines('Test');
      expect(typeof result).toBe('string');
      expect(result).toContain('markdown-block');
    });
  });
});

describe('findMarkdownBlock', () => {
  it('returns null for null node', () => {
    const result = findMarkdownBlock(null);
    expect(result).toBeNull();
  });

  it('returns null for node without markdown-block ancestor', () => {
    // Create a simple DOM structure
    const div = { classList: { contains: () => false }, parentElement: null };
    const result = findMarkdownBlock(div);
    expect(result).toBeNull();
  });

  it('finds markdown-block ancestor and extracts data', () => {
    // Create mock DOM structure
    const markdownBlock = {
      classList: { contains: (cls) => cls === 'markdown-block' },
      dataset: { lineStart: '5', lineEnd: '10', type: 'paragraph' },
      parentElement: null
    };

    const child = {
      classList: { contains: () => false },
      parentElement: markdownBlock
    };

    const result = findMarkdownBlock(child);

    expect(result).toEqual({
      lineStart: 5,
      lineEnd: 10,
      blockType: 'paragraph',
      element: markdownBlock
    });
  });

  it('walks up multiple levels to find markdown-block', () => {
    const markdownBlock = {
      classList: { contains: (cls) => cls === 'markdown-block' },
      dataset: { lineStart: '3', lineEnd: '4', type: 'heading' },
      parentElement: null
    };

    const parent = {
      classList: { contains: () => false },
      parentElement: markdownBlock
    };

    const child = {
      classList: { contains: () => false },
      parentElement: parent
    };

    const result = findMarkdownBlock(child);

    expect(result).toEqual({
      lineStart: 3,
      lineEnd: 4,
      blockType: 'heading',
      element: markdownBlock
    });
  });

  it('stops at document.body', () => {
    global.document = { body: {} };

    const node = {
      classList: { contains: () => false },
      parentElement: global.document.body
    };

    const result = findMarkdownBlock(node);
    expect(result).toBeNull();
  });
});
