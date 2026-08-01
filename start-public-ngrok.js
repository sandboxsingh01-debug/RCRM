const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const nodePath = path.join(__dirname, '.tools', 'node', 'node.exe');
const npmPath = path.join(__dirname, '.tools', 'node', 'npm.cmd');
const ngrokExe = 'C:\\Users\\pvnsn\\OneDrive\\Desktop\\ngrok.exe';
const userNgrokConfig = 'C:\\Users\\pvnsn\\AppData\\Local\\ngrok\\ngrok.yml';
const localNgrokConfig = path.join(__dirname, 'ngrok-tunnels.yml');

// Helper to kill processes on a port
function killPort(port) {
  return new Promise((resolve) => {
    spawn('powershell', [
      '-Command', `Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
    ], {
      stdio: 'ignore',
      shell: true
    }).on('close', resolve);
  });
}

// Helper to query ngrok API for tunnels
function getNgrokTunnels() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  try {
    console.log('[1/6] Cleaning up ports and existing ngrok processes...');
    // Kill processes on ports 3000 and 5000
    await killPort(3000);
    await killPort(5000);

    // Kill any existing ngrok.exe instances
    await new Promise((resolve) => {
      spawn('taskkill', ['/F', '/IM', 'ngrok.exe', '/T'], {
        stdio: 'ignore',
        shell: true
      }).on('close', resolve);
    });
    await new Promise(r => setTimeout(r, 1500));

    // Construct env with node path
    const nodeDir = path.join(__dirname, '.tools', 'node');
    const env = { ...process.env };
    env.PATH = `${nodeDir};${env.PATH}`;

    // Start backend
    console.log('[2/6] Starting backend server...');
    const backend = spawn(nodePath, ['src/server.js'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit',
      shell: true,
      env: env
    });
    await new Promise(r => setTimeout(r, 3000));

    // Start ngrok with merged configuration
    console.log('[3/6] Starting ngrok agent for all tunnels...');
    const ngrokProcess = spawn(ngrokExe, [
      'start', '--all',
      '--config', userNgrokConfig,
      '--config', localNgrokConfig
    ], {
      stdio: 'ignore',
      shell: true,
      env: env
    });

    // Wait for ngrok tunnels to be established
    console.log('Waiting for ngrok tunnels to connect...');
    let tunnelsData = null;
    for (let attempt = 1; attempt <= 10; attempt++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        tunnelsData = await getNgrokTunnels();
        if (tunnelsData && tunnelsData.tunnels && tunnelsData.tunnels.length >= 2) {
          break;
        }
      } catch (err) {
        // API might not be up yet
      }
    }

    if (!tunnelsData || !tunnelsData.tunnels || tunnelsData.tunnels.length === 0) {
      throw new Error('Failed to retrieve ngrok tunnels. Please check if your ngrok authtoken is valid and if your account limits allow running multiple tunnels.');
    }

    let backendUrl = '';
    let frontendUrl = '';

    for (const tunnel of tunnelsData.tunnels) {
      if (tunnel.name === 'crm-backend') {
        backendUrl = tunnel.public_url;
      } else if (tunnel.name === 'crm-frontend') {
        frontendUrl = tunnel.public_url;
      }
    }

    if (!backendUrl) {
      // Fallback: search by port
      const backendTunnel = tunnelsData.tunnels.find(t => t.config && t.config.addr && t.config.addr.includes('5000'));
      if (backendTunnel) backendUrl = backendTunnel.public_url;
    }
    if (!frontendUrl) {
      // Fallback: search by port
      const frontendTunnel = tunnelsData.tunnels.find(t => t.config && t.config.addr && t.config.addr.includes('3000'));
      if (frontendTunnel) frontendUrl = frontendTunnel.public_url;
    }

    console.log('✅ Backend tunnel:', backendUrl);
    console.log('✅ Frontend tunnel:', frontendUrl);

    // Update frontend config
    console.log('[4/6] Updating frontend .env configuration with public API URL...');
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
    fs.writeFileSync(frontendEnvPath, `REACT_APP_API_URL=${backendUrl}/api\n`);

    // Start frontend
    console.log('[5/6] Starting frontend (this takes ~30 seconds)...');
    const frontend = spawn(npmPath, ['start'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
      shell: true,
      env: env
    });

    await new Promise(r => setTimeout(r, 30000));

    console.log('\n===================================================');
    console.log('🎉 CRM SYSTEM IS NOW PUBLICLY ONLINE via ngrok!');
    console.log('===================================================');
    console.log('📱 Frontend URL: ', frontendUrl);
    console.log('🔌 Backend API:  ', backendUrl + '/api');
    console.log('🔐 Credentials:  admin / Admin@123');
    console.log('===================================================\n');

    // Keep active
    process.stdin.resume();

  } catch (err) {
    console.error('❌ Startup Failed:', err.message || err);
    process.exit(1);
  }
}

main().catch(console.error);
