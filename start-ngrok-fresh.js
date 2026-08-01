const { spawn } = require('child_process');
const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

const nodePath = path.join(__dirname, '.tools', 'node', 'node.exe');
const npmPath = path.join(__dirname, '.tools', 'node', 'npm.cmd');

// Function to generate unique name with timestamp
function getUniqueName(prefix) {
  return `${prefix}-${Date.now()}`;
}

async function main() {
  try {
    // Start backend
    console.log('[1/6] Starting backend...');
    const backend = spawn(nodePath, ['src/server.js'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'ignore',
      shell: true
    });
    await new Promise(r => setTimeout(r, 3000));

    // Start backend ngrok
    console.log('[2/6] Starting backend ngrok tunnel...');
    const backendUrl = await ngrok.connect({
      addr: 5000,
      name: getUniqueName('crm-backend')
    });
    console.log('✅ Backend tunnel:', backendUrl);

    // Update frontend config
    console.log('[3/6] Updating frontend configuration...');
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
    fs.writeFileSync(frontendEnvPath, `REACT_APP_API_URL=${backendUrl}/api\n`);

    // Start frontend
    console.log('[4/6] Starting frontend (this takes ~30 seconds)...');
    const frontend = spawn(npmPath, ['start'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'ignore',
      shell: true
    });
    await new Promise(r => setTimeout(r, 35000));

    // Start frontend ngrok
    console.log('[5/6] Starting frontend ngrok tunnel...');
    const frontendUrl = await ngrok.connect({
      addr: 3000,
      name: getUniqueName('crm-frontend')
    });
    console.log('✅ Frontend tunnel:', frontendUrl);

    console.log('\n========================================');
    console.log('🎉 CRM is PUBLIC with ngrok and login-ready!');
    console.log('📱 Frontend:', frontendUrl);
    console.log('🔌 Backend API:', backendUrl + '/api');
    console.log('🔐 Login: admin / Admin@123');
    console.log('========================================\n');

    // Keep process alive
    process.stdin.resume();

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main().catch(console.error);
