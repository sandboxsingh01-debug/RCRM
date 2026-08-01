const http = require('http');

async function killTunnels() {
  try {
    // Get list of tunnels
    const tunnels = await new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });
      req.on('error', reject);
    });

    console.log('Found tunnels:', tunnels.tunnels.map(t => t.name));

    // Delete each tunnel
    for (const tunnel of tunnels.tunnels) {
      await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: 4040,
          path: `/api/tunnels/${encodeURIComponent(tunnel.name)}`,
          method: 'DELETE'
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve());
        });
        req.on('error', reject);
        req.end();
      });
      console.log('Killed tunnel:', tunnel.name);
    }
    console.log('All tunnels killed');
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.log('No ngrok process running');
    } else {
      console.error('Error:', err);
    }
  }
}

killTunnels();
