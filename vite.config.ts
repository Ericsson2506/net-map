import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { exec } from 'child_process'
import fs from 'fs'

const pingPlugin = () => {
  return {
    name: 'ping-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/ping')) {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const ip = url.searchParams.get('ip');

          if (!ip || !/^[\w.-]+$/.test(ip)) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid IP' }));
            return;
          }

          // Wywołaj ping pod Windowsem (1 próba, timeout 1000ms)
          exec(`ping -n 1 -w 1000 ${ip}`, (error, stdout) => {
            const isOnline = !error && !stdout.toLowerCase().includes('unreachable') && !stdout.toLowerCase().includes('timed out');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ online: isOnline }));
          });
          return;
        }

        if (req.url === '/api/save' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              fs.writeFileSync('network-map-data.json', body, 'utf8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (req.url === '/api/load' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          if (fs.existsSync('network-map-data.json')) {
            try {
              const data = fs.readFileSync('network-map-data.json', 'utf8');
              res.end(data);
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          } else {
            res.end(JSON.stringify(null));
          }
          return;
        }

        next();
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pingPlugin()],
  server: {
    host: true, // Listen on all local IPs
  }
})
