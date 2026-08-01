const localtunnel = require('localtunnel');
const fs = require('fs');
const path = require('path');

async function start() {
  try {
    // Start backend tunnel
    console.log('Starting backend tunnel...');
    const backendTunnel = await localtunnel({ port: 5000 });
    console.log('✅ Backend:', backendTunnel.url);

    // Update frontend config
    console.log('Updating frontend configuration...');
    const frontendEnv = path.join(__dirname, 'frontend', '.env');
    fs.writeFileSync(frontendEnv, `REACT_APP_API_URL=${backendTunnel.url}/api\n`);

    // Start frontend tunnel
    console.log('Starting frontend tunnel...');
    const frontendTunnel = await localtunnel({ port: 3000 });
    console.log('✅ Frontend:', frontendTunnel.url);

    console.log('\n========================================');
    console.log('🎉 Your CRM is now PUBLIC!');
    console.log('📱 Frontend:', frontendTunnel.url);
    console.log('🔌 Backend API:', backendTunnel.url + '/api');
    console.log('🔐 Login: admin / Admin@123');
    console.log('========================================\n');

    // Keep the process alive
    process.stdin.resume();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

start();
