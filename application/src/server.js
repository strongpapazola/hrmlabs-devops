import http from 'node:http';
import { pathToFileURL } from 'node:url';

export function createApp({
  message = process.env.APP_MESSAGE || 'Hello from HRM Labs',
  environment = process.env.NODE_ENV || 'development',
  logger = (entry) => console.log(JSON.stringify(entry)),
} = {}) {
  return http.createServer((request, response) => {
    const started = performance.now();
    const path = (request.url || '/').split('?')[0];
    let status = 200;
    let payload;

    if (!['GET', 'HEAD'].includes(request.method)) {
      status = 405;
      response.setHeader('Allow', 'GET, HEAD');
      payload = { error: 'Method not allowed' };
    } else if (path === '/healthz') {
      payload = { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
    } else if (path === '/') {
      payload = { application: 'hrmlabs-devops-demo', message, environment };
    } else {
      status = 404;
      payload = { error: 'Not found' };
    }

    response.on('finish', () => logger({
      timestamp: new Date().toISOString(),
      event: 'http_request',
      method: request.method,
      path,
      status: response.statusCode,
      durationMs: Number((performance.now() - started).toFixed(2)),
    }));
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify(payload));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  const server = createApp();
  server.listen(port, '0.0.0.0', () => console.log(JSON.stringify({
    timestamp: new Date().toISOString(), event: 'server_started', port,
  })));

  let shuttingDown = false;
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(JSON.stringify({ event: 'server_stopping', signal }));
      server.close(() => process.exit(0));
      server.closeIdleConnections();
      setTimeout(() => process.exit(1), 10000).unref();
    });
  }
}
