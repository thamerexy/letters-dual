const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const base64Data = body.replace(/^data:image\/png;base64,/, "");
                fs.writeFileSync(path.join(__dirname, 'public', 'logo.png'), base64Data, 'base64');
                console.log('SUCCESS_FILE_WRITTEN');
                res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
                res.end('OK');
                process.exit(0);
            } catch (err) {
                console.error('ERROR_WRITING_FILE:', err);
                res.writeHead(500);
                res.end('ERROR');
                process.exit(1);
            }
        });
    } else {
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' });
        res.end();
    }
});

server.listen(9999, '127.0.0.1', () => {
    console.log('SERVER_STARTED');
});
