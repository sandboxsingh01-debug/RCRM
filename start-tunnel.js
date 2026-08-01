const ngrok = require('ngrok');
const path = require('path');
const fs = require('fs');

async function startTunnels() {
  try {
    // Start backend tunnel (port 5000)
    const backendUrl = await ngrok.connect({
      addr: 5000,
      authtoken_from_env: true
    });
    console.log('✅ Backend tunnel:', backendUrl);

    // Update frontend .env
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
    fs.writeFileSync(frontendEnvPath, `REACT_APP_API_URL=${backendUrl}/api\n`);
    console.log('✅ Updated frontend .env');

    // Start frontend tunnel (port 3000)
    const frontendUrl = await ngrok.connect({
      addr: 3000,
      authtoken_from_env: true
    });
    console.log('✅ Frontend tunnel:', frontendUrl);
    console.log('\n========================================');
    console.log('🚀 App is now public!');
    console.log('Frontend:', frontendUrl);
    console.log('Backend:', backendUrl);
    console.log('Login: admin / Admin@123');
    console.log('========================================\n');

  } catch (err) {
    console.error('❌ Error starting tunnels:', err);
    process.exit(1);
  }
}

startTunnels();
