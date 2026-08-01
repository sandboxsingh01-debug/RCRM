const ngrok = require('ngrok');

async function start() {
  try {
    // Start backend tunnel
    const backendUrl = await ngrok.connect(5000);
    console.log('Backend:', backendUrl);

    // Start frontend tunnel
    const frontendUrl = await ngrok.connect(3000);
    console.log('Frontend:', frontendUrl);
    console.log('\n========================================');
    console.log('🚀 App Public URLs:');
    console.log('Frontend:', frontendUrl);
    console.log('Backend API:', backendUrl + '/api');
    console.log('Login Credentials: admin / Admin@123');
    console.log('========================================\n');

    console.log('Press Ctrl+C to stop');
  } catch (err) {
    console.error('Error:', err);
  }
}

start();
