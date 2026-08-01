const ngrok = require('ngrok');

async function startBackendTunnel() {
  try {
    const url = await ngrok.connect(5000);
    console.log('✅ Backend tunnel ready:', url);
    console.log('API endpoint:', url + '/api');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

startBackendTunnel();
