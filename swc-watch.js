/* eslint-disable node/no-unsupported-features/node-builtins */
/* eslint-disable no-process-exit */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable @typescript-eslint/no-var-requires */
const { swcDir } = require('@swc/cli');
const { spawn } = require('child_process');
const path = require('path');

let nodemonProcess;

swcDir({
  cliOptions: {
    outDir: './dist',
    watch: true,
    stripLeadingPaths: true,
    filenames: ['./src'],
    extensions: ['.ts'],
    configFile: '.swcrc'
  },
  callbacks: {
    onSuccess: (e) => {
      console.clear();
      console.log(
        `Successfully compiled ${
          e.filename ? path.normalize(e.filename) : e.compiled + ' files'
        } with swc (${e.duration.toFixed(2)}ms)`
      );
    },
    onFail: (e) => {
      console.error('Compilation failed:', e);
    },
    onWatchReady: () => {
      console.log('Running nodemon...');

      if (nodemonProcess) {
        console.log('Restarting nodemon...');
        nodemonProcess.kill();
      }

      nodemonProcess = spawn('nodemon', [], { stdio: 'inherit', shell: true });

      nodemonProcess.on('close', (code) => {
        console.log(`Nodemon process exited with code ${code}`);
        nodemonProcess = null;
      });

      nodemonProcess.on('error', (err) => {
        console.error(`Error running nodemon: ${err}`);
      });
    }
  }
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down...');
  if (nodemonProcess) nodemonProcess.kill();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  if (nodemonProcess) nodemonProcess.kill();
  process.exit(0);
});
