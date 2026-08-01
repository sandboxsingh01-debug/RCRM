const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const nodePath = path.join(__dirname, '.tools', 'node', 'node.exe');
const ngrokExe = 'C:\\Users\\pvnsn\\OneDrive\\Desktop\\ngrok.exe';
const userNgrokConfig = 'C:\\Users\\pvnsn\\AppData\\Local\\ngrok\\ngrok.yml';

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
    console.log('[1/4] Cleaning up port 5000 and old ngrok instances...');
    await killPort(5000);
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

    // Start backend (with build static serve)
    console.log('[2/4] Starting backend server (with frontend served statically)...');
    const backend = spawn(nodePath, ['src/server.js'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit',
      shell: true,
      env: env
    });
    await new Promise(r => setTimeout(r, 3000));

    // Start ngrok tunnel for port 5000
    console.log('[3/4] Starting ngrok tunnel on port 5000...');
    const ngrokProcess = spawn(ngrokExe, [
      'http', '5000',
      '--config', userNgrokConfig
    ], {
      stdio: 'ignore',
      shell: true,
      env: env
    });

    console.log('Waiting for ngrok tunnel to connect...');
    let tunnelsData = null;
    for (let attempt = 1; attempt <= 10; attempt++) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        tunnelsData = await getNgrokTunnels();
        if (tunnelsData && tunnelsData.tunnels && tunnelsData.tunnels.length >= 1) {
          break;
        }
      } catch (err) {
        // API might not be up yet
      }
    }

    if (!tunnelsData || !tunnelsData.tunnels || tunnelsData.tunnels.length === 0) {
      throw new Error('Failed to retrieve ngrok tunnels. Please check if your ngrok authtoken is valid.');
    }

    const publicUrl = tunnelsData.tunnels[0].public_url;

    console.log('\n===================================================');
    console.log('🎉 CRM SYSTEM IS NOW PUBLICLY ONLINE via ngrok!');
    console.log('===================================================');
    console.log('📱 Access URL:  ', publicUrl);
    console.log('🔌 Health URL:  ', publicUrl + '/health');
    console.log('🔐 Credentials: admin / Admin@123');
    console.log('===================================================\n');

    // Keep active
    process.stdin.resume();

  } catch (err) {
    console.error('❌ Startup Failed:', err.message || err);
    process.exit(1);
  }
}

main().catch(console.error);
