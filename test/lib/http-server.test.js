import { describe, it, expect } from 'vitest';
import { parseReviewRequest, checkFilesExist, findProjectForFile } from '../../lib/http-server.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('parseReviewRequest', () => {
  it('parses valid request with files array', () => {
    const body = JSON.stringify({
      files: ['/path/to/file1.md', '/path/to/file2.md']
    });

    const result = parseReviewRequest(body);

    expect(result.files).toEqual(['/path/to/file1.md', '/path/to/file2.md']);
  });

  it('throws error for missing files field', () => {
    const body = JSON.stringify({ other: 'data' });

    expect(() => parseReviewRequest(body)).toThrow('Missing required field: files');
  });

  it('throws error for non-array files field', () => {
    const body = JSON.stringify({ files: 'not-an-array' });

    expect(() => parseReviewRequest(body)).toThrow('files must be an array');
  });

  it('throws error for empty files array', () => {
    const body = JSON.stringify({ files: [] });

    expect(() => parseReviewRequest(body)).toThrow('files array cannot be empty');
  });

  it('throws error for non-string element in files array', () => {
    const body = JSON.stringify({ files: ['/path/file.md', 123, '/other.md'] });

    expect(() => parseReviewRequest(body)).toThrow('files[1] must be a string');
  });

  it('throws error for invalid JSON', () => {
    const body = 'not valid json{';

    expect(() => parseReviewRequest(body)).toThrow();
  });
});

describe('checkFilesExist', () => {
  const fixturesDir = path.join(__dirname, '../../e2e/fixtures/markdown-links');
  const existingFile = path.join(fixturesDir, 'index.md');
  const missingFile = path.join(fixturesDir, 'nonexistent.md');

  it('returns valid true when all files exist', async () => {
    const result = await checkFilesExist([existingFile]);

    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('returns valid false with missing array when file does not exist', async () => {
    const result = await checkFilesExist([missingFile]);

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([missingFile]);
  });

  it('identifies both existing and missing files correctly', async () => {
    const result = await checkFilesExist([existingFile, missingFile]);

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([missingFile]);
  });

  it('returns all missing files when none exist', async () => {
    const missing1 = '/nonexistent/file1.md';
    const missing2 = '/nonexistent/file2.md';

    const result = await checkFilesExist([missing1, missing2]);

    expect(result.valid).toBe(false);
    expect(result.missing).toEqual([missing1, missing2]);
  });

  it('handles async operation correctly', async () => {
    const promise = checkFilesExist([existingFile]);

    expect(promise).toBeInstanceOf(Promise);

    const result = await promise;
    expect(result).toBeDefined();
  });
});

describe('findProjectForFile', () => {
  const projects = [
    { name: 'project1', project_path: '/home/user/projects/project1' },
    { name: 'project2', project_path: '/home/user/projects/project2' }
  ];

  it('returns project path when file is within project', () => {
    const filePath = '/home/user/projects/project1/src/file.md';

    const result = findProjectForFile(filePath, projects);

    expect(result).toBe('/home/user/projects/project1');
  });

  it('returns null when file is outside all projects', () => {
    const filePath = '/home/user/other/file.md';

    const result = findProjectForFile(filePath, projects);

    expect(result).toBeNull();
  });

  it('returns first matching project when file could match multiple', () => {
    const filePath = '/home/user/projects/project1/subdir/file.md';

    const result = findProjectForFile(filePath, projects);

    expect(result).toBe('/home/user/projects/project1');
  });

  it('returns null for empty projects array', () => {
    const filePath = '/home/user/projects/project1/file.md';

    const result = findProjectForFile(filePath, []);

    expect(result).toBeNull();
  });

  it('uses trailing slash to avoid partial matches', () => {
    const projectsWithSimilarPaths = [
      { name: 'proj', project_path: '/home/proj' },
      { name: 'project', project_path: '/home/project' }
    ];
    const filePath = '/home/project/file.md';

    const result = findProjectForFile(filePath, projectsWithSimilarPaths);

    expect(result).toBe('/home/project');
  });

  it('handles projects without project_path field', () => {
    const projectsWithMissing = [
      { name: 'project1' },
      { name: 'project2', project_path: '/home/user/projects/project2' }
    ];
    const filePath = '/home/user/projects/project2/file.md';

    const result = findProjectForFile(filePath, projectsWithMissing);

    expect(result).toBe('/home/user/projects/project2');
  });
});
