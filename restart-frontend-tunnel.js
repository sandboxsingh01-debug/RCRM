const localtunnel = require('localtunnel');

async function restartFrontendTunnel() {
  try {
    console.log('Restarting frontend tunnel...');
    const frontendTunnel = await localtunnel({ port: 3000 });
    console.log('\n========================================');
    console.log('🎉 Updated Frontend URL:', frontendTunnel.url);
    console.log('🔐 Login: admin / Admin@123');
    console.log('========================================\n');
    process.stdin.resume();
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

restartFrontendTunnel();
