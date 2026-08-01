const { spawn } = require('child_process');
const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

const nodePath = path.join(__dirname, '.tools', 'node', 'node.exe');
const npmPath = path.join(__dirname, '.tools', 'node', 'npm.cmd');

// Kill anything on given port (Windows)
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

async function startAll() {
  try {
    // Cleanup
    console.log('[1/7] Cleaning up ports 3000 and 5000...');
    await killPort(3000);
    await killPort(5000);
    await new Promise(r => setTimeout(r, 1000));

    // Start backend
    console.log('[2/7] Starting backend...');
    const backend = spawn(nodePath, ['src/server.js'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit',
      shell: true
    });
    await new Promise(r => setTimeout(r, 3000));

    // Start backend tunnel
    console.log('[3/7] Starting backend localtunnel...');
    const backendTunnel = await localtunnel({ port: 5000 });
    console.log('✅ Backend tunnel:', backendTunnel.url);

    // Update frontend config
    console.log('[4/7] Updating frontend configuration...');
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
    fs.writeFileSync(frontendEnvPath, `REACT_APP_API_URL=${backendTunnel.url}/api\n`);

    // Start frontend
    console.log('[5/7] Starting frontend (this takes ~30 seconds)...');
    const frontend = spawn(npmPath, ['start'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
      shell: true
    });
    await new Promise(r => setTimeout(r, 35000));

    // Start frontend tunnel
    console.log('[6/7] Starting frontend localtunnel...');
    const frontendTunnel = await localtunnel({ port: 3000 });
    console.log('✅ Frontend tunnel:', frontendTunnel.url);

    console.log('\n========================================');
    console.log('🎉 CRM is PUBLIC and login-ready!');
    console.log('📱 Frontend:', frontendTunnel.url);
    console.log('🔌 Backend API:', backendTunnel.url + '/api');
    console.log('🔐 Login: admin / Admin@123');
    console.log('========================================\n');
    console.log('Press Ctrl+C in this terminal to stop everything.');

    // Keep process alive
    process.stdin.resume();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

startAll().catch(console.error);
