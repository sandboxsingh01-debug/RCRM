const ngrok = require('ngrok');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function killExistingTunnels() {
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
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve());
        });
        req.on('error', reject);
        req.end();
      });
      console.log('Killed tunnel:', tunnel.name);
    }
  } catch (err) {
    if (err.code !== 'ECONNREFUSED') {
      console.error('Error killing tunnels:', err);
    }
  }
}

async function main() {
  await killExistingTunnels();
  
  console.log('Starting backend tunnel...');
  const backendUrl = await ngrok.connect({
    addr: 5000,
    name: 'backend'
  });
  console.log('✅ Backend:', backendUrl);

  console.log('Updating frontend config...');
  const frontendEnv = path.join(__dirname, 'frontend', '.env');
  fs.writeFileSync(frontendEnv, `REACT_APP_API_URL=${backendUrl}/api\n`);

  console.log('Starting frontend tunnel...');
  const frontendUrl = await ngrok.connect({
    addr: 3000,
    name: 'frontend'
  });
  console.log('✅ Frontend:', frontendUrl);

  console.log('\n========================================');
  console.log('🎉 Your app is public!');
  console.log('Frontend:', frontendUrl);
  console.log('Backend API:', backendUrl + '/api');
  console.log('Login: admin / Admin@123');
  console.log('========================================\n');
}

main().catch(console.error);
