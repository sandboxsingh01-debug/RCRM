const { spawn } = require('child_process');
const ngrok = require('ngrok');
const http = require('http');
const fs = require('fs');
const path = require('path');

const nodePath = path.join(__dirname, '.tools', 'node', 'node.exe');
const npmPath = path.join(__dirname, '.tools', 'node', 'npm.cmd');

// Kill existing ngrok processes and tunnels
async function cleanup() {
  console.log('Cleaning up existing processes...');

  // Kill existing tunnels
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

  // Kill ngrok processes on Windows
  await new Promise((resolve) => {
    spawn('taskkill', ['/F', '/IM', 'ngrok.exe'], {
      stdio: 'ignore',
      shell: true
    }).on('close', resolve);
  });
}

async function main() {
  await cleanup();

  // Start backend
  console.log('[1/7] Starting backend...');
  const backend = spawn(nodePath, ['src/server.js'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    shell: true
  });
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Start backend ngrok
  console.log('[2/7] Starting backend ngrok tunnel...');
  const backendUrl = await ngrok.connect({
    addr: 5000,
    name: 'crm-backend'
  });
  console.log('✅ Backend tunnel:', backendUrl);

  // Update frontend config
  console.log('[3/7] Updating frontend configuration...');
  const frontendEnv = path.join(__dirname, 'frontend', '.env');
  fs.writeFileSync(frontendEnv, `REACT_APP_API_URL=${backendUrl}/api\n`);

  // Start frontend
  console.log('[4/7] Starting frontend (this takes ~30 seconds)...');
  const frontend = spawn(npmPath, ['start'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });
  await new Promise(resolve => setTimeout(resolve, 35000));

  // Start frontend ngrok
  console.log('[5/7] Starting frontend ngrok tunnel...');
  const frontendUrl = await ngrok.connect({
    addr: 3000,
    name: 'crm-frontend'
  });
  console.log('✅ Frontend tunnel:', frontendUrl);

  console.log('\n========================================');
  console.log('🎉 Your CRM is now PUBLIC with ngrok!');
  console.log('📱 Frontend:', frontendUrl);
  console.log('🔌 Backend API:', backendUrl + '/api');
  console.log('🔐 Login: admin / Admin@123');
  console.log('========================================\n');
  console.log('Press Ctrl+C in this terminal to stop everything.');
}

main().catch(console.error);
