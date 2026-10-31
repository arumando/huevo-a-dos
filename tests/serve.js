// Servidor estático mínimo para pruebas locales del repositorio.
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
module.exports = function serve(root, port = 8765) {
  return http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p); if (!f.startsWith(root)) { r.statusCode = 403; return r.end(); }
    fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end('no'); } r.setHeader('content-type', TYPES[path.extname(f)] || 'application/octet-stream'); r.end(d); });
  }).listen(port);
};
