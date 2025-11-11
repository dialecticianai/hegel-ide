// Pure functions for HTTP request handling and validation

const fs = require('fs').promises;

function parseReviewRequest(bodyString) {
  const body = JSON.parse(bodyString);

  if (!body.files) {
    throw new Error('Missing required field: files');
  }

  if (!Array.isArray(body.files)) {
    throw new Error('files must be an array');
  }

  if (body.files.length === 0) {
    throw new Error('files array cannot be empty');
  }

  body.files.forEach((f, i) => {
    if (typeof f !== 'string') {
      throw new Error(`files[${i}] must be a string`);
    }
  });

  return { files: body.files };
}

async function checkFilesExist(filePaths) {
  const results = await Promise.allSettled(
    filePaths.map(filePath => fs.access(filePath, fs.constants.F_OK))
  );

  const missing = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      missing.push(filePaths[i]);
    }
  });

  return { valid: missing.length === 0, missing };
}

function findProjectForFile(filePath, projects) {
  for (const project of projects) {
    if (project.project_path && filePath.startsWith(project.project_path + '/')) {
      return project.project_path;
    }
  }
  return null;
}

module.exports = { parseReviewRequest, checkFilesExist, findProjectForFile };
