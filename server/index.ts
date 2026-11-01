import { spawn } from 'node:child_process';
import { createApp } from './app.ts';

const port = Number(process.env.PORT) || 3000;
// Only this computer can connect unless HOST is set (e.g. HOST=0.0.0.0 for other PCs in the clinic).
const host = process.env.HOST || '127.0.0.1';
const url = `http://localhost:${port}`;
const shouldOpen = process.argv.includes('--open');

createApp().listen(port, host, (err) => {
  if (err) {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      console.log(`Port ${port} is already in use - the app is probably already running at ${url}`);
      if (shouldOpen) openBrowser();
    } else {
      console.error(err);
    }
    process.exit(1);
  }
  console.log(`Diagnosis & Prescription System is running at ${url}`);
  console.log('Keep this window open while using the app. Press Ctrl+C to stop.');
  if (shouldOpen) openBrowser();
});

function openBrowser() {
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  spawn(command, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}
