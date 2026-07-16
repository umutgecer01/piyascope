import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the Cloudflare Worker handler
const workerHandler = await import('./dist/server/index.js');
const handler = workerHandler.default;

// Create a mock Cloudflare execution context
function createExecutionContext() {
  const waitUntilPromises = [];
  
  return {
    waitUntil: (promise) => {
      waitUntilPromises.push(Promise.resolve(promise));
    },
    passThroughOnException: () => {},
  };
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  try {
    // Create a Request object from the Node.js request
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Convert Node.js readable stream to ArrayBuffer
    let bodyBuffer = Buffer.alloc(0);
    
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      bodyBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
      });
    }

    // Create Fetch API Request
    const fetchRequest = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: bodyBuffer.length > 0 ? bodyBuffer : null,
    });

    // Create execution context
    const ctx = createExecutionContext();

    // Call the worker handler
    const fetchResponse = await handler.fetch(fetchRequest, {}, ctx);

    // Send response
    res.writeHead(fetchResponse.status, Object.fromEntries(fetchResponse.headers));
    res.end(await fetchResponse.text());
  } catch (error) {
    console.error('Handler error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
