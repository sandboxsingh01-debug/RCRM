const { spawn } = require('child_process');
const http = require('http');

async function fullCleanup() {
  console.log('Starting full cleanup...');

  // Kill existing ngrok tunnels via API
  try {
    const data = await new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(body));
      });
      req.on('error', reject);
    });

    const tunnels = JSON.parse(data).tunnels;
    for (const tunnel of tunnels) {
      await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: 4040,
          path: `/api/tunnels/${encodeURIComponent(tunnel.name)}`,
          method: 'DELETE'
        }, (res) => {
          res.on('end', resolve);
        });
        req.on('error', reject);
        req.end();
      });
      console.log('Killed tunnel:', tunnel.name);
    }
  } catch (err) {
    if (err.code !== 'ECONNREFUSED') {
      console.error('Error cleaning tunnels:', err);
    }
  }

  // Kill any ngrok processes and node processes running ngrok-related stuff
  console.log('Killing ngrok and node processes...');
  await new Promise((resolve) => {
    spawn('taskkill', ['/F', '/IM', 'ngrok.exe', '/T'], {
      stdio: 'ignore',
      shell: true
    }).on('close', resolve);
  });

  // Kill anything on ports 3000 and 5000
  console.log('Killing processes on ports 3000 and 5000...');
  await new Promise((resolve) => {
    spawn('powershell', [
      '-Command', 'Get-NetTCPConnection -LocalPort 3000,5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }'
    ], {
      stdio: 'ignore',
      shell: true
    }).on('close', resolve);
  });

  await new Promise(r => setTimeout(r, 1500));
  console.log('✅ Full cleanup complete!');
}

fullCleanup().catch(console.error);
