import { execSync } from 'child_process';

try {
  const port = 3000;
  // On Windows netstat lists active ports and PIDs
  const output = execSync(`netstat -ano`).toString().trim();
  const lines = output.split('\n');
  const pids = new Set();
  
  for (const line of lines) {
    if (line.includes(`:${port}`)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(Number(pid))) {
          pids.add(pid);
        }
      }
    }
  }
  
  if (pids.size > 0) {
    console.log(`[Port Cleaner] Found active processes on port ${port}. Cleaning up...`);
    for (const pid of pids) {
      try {
        console.log(`[Port Cleaner] Killing process PID ${pid}...`);
        execSync(`taskkill /F /PID ${pid}`);
      } catch (err) {
        // Suppress individual process kill issues
      }
    }
    console.log(`[Port Cleaner] Port ${port} is now clear!`);
  }
} catch (e) {
  // If netstat or taskkill fails or finds nothing, proceed silently
}
