const { spawn } = require('child_process');
const path = require('path');

const nodePath = path.join(__dirname, '.tools', 'node', 'node.exe');
const npmPath = path.join(__dirname, '.tools', 'node', 'npm.cmd');

console.log('Restarting frontend...');

// Kill anything on port 3000 (Windows)
spawn('powershell', ['-Command', 'Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }'], {
  stdio: 'inherit',
  shell: true
}).on('close', () => {
  // Start frontend
  console.log('Starting frontend...');
  const frontend = spawn(npmPath, ['start'], {
    cwd: path.join(__dirname, 'frontend'),
    stdio: 'inherit',
    shell: true
  });
});
