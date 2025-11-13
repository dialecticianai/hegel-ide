// HTTP server for review tab integration

const http = require('http');
const { parseReviewRequest, checkFilesExist } = require('../../lib/http-server.js');

let httpServer = null;
let httpPort = null;

// HTTP request handler
async function handleRequest(req, res, mainWindow) {
  // Only accept POST to /review
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (req.url !== '/review') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Collect request body
  let body = '';
  req.on('data', chunk => {
    body += chunk;
  });

  req.on('end', async () => {
    try {
      // Parse and validate request
      const { files } = parseReviewRequest(body);

      // Check if all files exist
      const validation = await checkFilesExist(files);
      if (!validation.valid) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ missing: validation.missing }));
        return;
      }

      // Send to renderer to open review tabs
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('open-review-tabs', { files });
      }

      // Return success
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      // Determine status code based on error type
      let statusCode = 500;

      // JSON parse errors and validation errors are 400
      if (error instanceof SyntaxError ||
          error.message.includes('required field') ||
          error.message.includes('must be') ||
          error.message.includes('cannot be empty')) {
        statusCode = 400;
      }

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

// Create and start HTTP server
function createHttpServer(mainWindow) {
  return new Promise((resolve) => {
    httpServer = http.createServer((req, res) => handleRequest(req, res, mainWindow));
    httpServer.listen(0, 'localhost', () => {
      httpPort = httpServer.address().port;
      resolve(httpPort);
    });
  });
}

// Get HTTP port
function getHttpPort() {
  return httpPort;
}

// Close HTTP server
function closeHttpServer() {
  if (httpServer) {
    httpServer.close();
    httpServer = null;
    httpPort = null;
  }
}

module.exports = {
  createHttpServer,
  getHttpPort,
  closeHttpServer
};
