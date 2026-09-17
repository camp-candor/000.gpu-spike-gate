import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

function log(stage: string, msg: string) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] [${stage}] ${msg}`);
}

const rawUsername = process.env.GHCR_USERNAME;
const rawPat = process.env.GHCR_PAT;
const rawImageName = process.env.IMAGE_NAME || 'gpu-spike-gate-00';
const rawImageTag = process.env.IMAGE_TAG || 'v1';

if (!rawUsername || !rawPat) {
  log('ERROR', 'Missing GHCR_USERNAME or GHCR_PAT in .env file.');
  log('HELP', 'Create a GitHub Classic PAT with write:packages scope and add it to .env');
  process.exit(1);
}

const GHCR_USERNAME: string = rawUsername;
const GHCR_PAT: string = rawPat;
const fullImageUri = `ghcr.io/${GHCR_USERNAME.toLowerCase()}/${rawImageName}:${rawImageTag}`;

function exec(cmd: string, args: string[], inputPipe?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['pipe', 'inherit', 'inherit'], shell: true });

    if (inputPipe) {
      proc.stdin.write(inputPipe);
      proc.stdin.end();
    }

    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Process "${cmd} ${args.join(' ')}" exited with code ${code}`));
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function verifyDockerDaemon(): Promise<void> {
  log('DOCKER-CHECK', 'Verifying Docker engine responsiveness...');
  try {
    await exec('docker', ['version']);
    log('DOCKER-CHECK', '✓ Docker daemon is operational.');
  } catch (err) {
    log('FATAL', 'Docker daemon is not reachable or not running on this host.');
    log('INFO', 'If you are on Windows, ensure Docker Desktop is open and the engine status is running.');
    log('ALTERNATIVE', 'You can push this repository to GitHub and run the GitHub Action in .github/workflows/build-and-push.yml');
    process.exit(1);
  }
}

async function main() {
  console.log('='.repeat(70));
  log('INIT', 'Starting Container Publication Pipeline for GHCR');
  log('IMAGE-TAG', fullImageUri);
  console.log('='.repeat(70));

  await verifyDockerDaemon();

  log('AUTH', `Logging in to ghcr.io as "${GHCR_USERNAME}"...`);
  try {
    await exec('docker', ['login', 'ghcr.io', '-u', GHCR_USERNAME, '--password-stdin'], `${GHCR_PAT}\n`);
    log('AUTH', '✓ GHCR authentication successful.');
  } catch (err) {
    log('FATAL', `GHCR authentication failed: ${err}`);
    process.exit(1);
  }

  log('BUILD', `Building Docker container image: ${fullImageUri}...`);
  const buildStart = Date.now();
  try {
    await exec('docker', ['build', '-t', fullImageUri, '.']);
    const buildDuration = ((Date.now() - buildStart) / 1000).toFixed(1);
    log('BUILD', `✓ Container built successfully in ${buildDuration}s.`);
  } catch (err) {
    log('FATAL', `Docker build failed: ${err}`);
    process.exit(1);
  }

  log('PUSH', `Pushing image layers to ghcr.io...`);
  const pushStart = Date.now();
  try {
    await exec('docker', ['push', fullImageUri]);
    const pushDuration = ((Date.now() - pushStart) / 1000).toFixed(1);
    console.log('='.repeat(70));
    log('SUCCESS', `Container published in ${pushDuration}s.`);
    log('RUNPOD-CONFIG', `Set Container Image in RunPod Template to: ${fullImageUri}`);
    console.log('='.repeat(70));
  } catch (err) {
    log('FATAL', `Docker push failed: ${err}`);
    process.exit(1);
  }
}

main();
