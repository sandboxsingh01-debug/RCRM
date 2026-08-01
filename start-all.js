const { spawn } = require('child_process');
const ngrok = require('ngrok');
const path = require('path');
const fs = require('fs');

const nodePath = path.join(__dirname, '.tools', 'node', 'node.exe');

async function startAll() {
  try {
    console.log('🚀 Starting CRM App...');

    // Start backend
    console.log('[1/5] Starting backend...');
    const backend = spawn(nodePath, ['src/server.js'], {
      cwd: path.join(__dirname, 'backend'),
      stdio: 'inherit',
      shell: true
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start ngrok for backend
    console.log('[2/5] Starting ngrok for backend...');
    const backendUrl = await ngrok.connect(5000);
    console.log('✅ Backend tunnel:', backendUrl);

    // Update frontend .env
    console.log('[3/5] Updating frontend configuration...');
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
    fs.writeFileSync(frontendEnvPath, `REACT_APP_API_URL=${backendUrl}/api\n`);

    // Start frontend
    console.log('[4/5] Starting frontend (this takes ~30 seconds)...');
    const npmPath = path.join(__dirname, '.tools', 'node', 'npm.cmd');
    const frontend = spawn(npmPath, ['start'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'inherit',
      shell: true
    });
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Start ngrok for frontend
    console.log('[5/5] Starting ngrok for frontend...');
    const frontendUrl = await ngrok.connect(3000);

    console.log('\n========================================');
    console.log('🎉 CRM is now PUBLIC!');
    console.log('📱 Frontend:', frontendUrl);
    console.log('🔌 Backend API:', backendUrl + '/api');
    console.log('🔐 Login: admin / Admin@123');
    console.log('========================================\n');
    console.log('Press Ctrl+C to stop all services');

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

startAll();
