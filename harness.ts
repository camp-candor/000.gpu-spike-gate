import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { evaluateGate0, type BenchmarkRun } from './benchmarks/gate0Arbitrator.js';

dotenv.config();

function log(phase: string, msg: string) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] [${phase}] ${msg}`);
}

const R2_ENDPOINT_URL = process.env.R2_ENDPOINT_URL || '';
const R2_BUCKET = process.env.R2_BUCKET || 'production-checkpoints-us-east';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
const CHECKPOINT_KEY = process.env.CHECKPOINT_KEY || 'checkpoints/wan2.2_i2v_high_noise_14B_Q3_K_S.gguf';
const HOURLY_RATE = parseFloat(process.env.RUNPOD_HOURLY_RATE || '0.74');

function execWithOutput(cmd: string, args: string[], envOverrides: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env: { ...process.env, ...envOverrides }, shell: true });

    let output = '';
    proc.stdout.on('data', (d) => {
      const txt = d.toString();
      output += txt;
      process.stdout.write(txt);
    });

    proc.stderr.on('data', (d) => {
      const txt = d.toString();
      output += txt;
      process.stderr.write(txt);
    });

    proc.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Command ${cmd} exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}

async function runBenchmark(): Promise<void> {
  console.log('='.repeat(70));
  log('HARNESS', '=== GATE 0 COLD START SPIKE HARNESS EXECUTION ===');
  log('PARAMS', `Target R2 Checkpoint: s3://${R2_BUCKET}/${CHECKPOINT_KEY}`);
  log('COST-MODEL', `Assumed Rate: $${HOURLY_RATE.toFixed(2)}/hour ($${(HOURLY_RATE / 3600).toFixed(6)}/sec)`);
  console.log('='.repeat(70));

  fs.mkdirSync('/tmp/models', { recursive: true });
  fs.mkdirSync('/tmp/outputs', { recursive: true });

  const s5cmdEnv = {
    S3_ENDPOINT_URL: R2_ENDPOINT_URL,
    AWS_ACCESS_KEY_ID: AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: AWS_SECRET_ACCESS_KEY,
  };

  // Phase A: Ingress via s5cmd
  log('PHASE-A', `Starting wire-speed s5cmd ingress to /tmp/models/...`);
  const tStartA = Date.now();
  await execWithOutput('s5cmd', [
    '--endpoint-url', R2_ENDPOINT_URL,
    '--numworkers', '64',
    'cp', `s3://${R2_BUCKET}/${CHECKPOINT_KEY}`,
    '/tmp/models/'
  ], s5cmdEnv);
  const ingressSeconds = (Date.now() - tStartA) / 1000;
  log('PHASE-A', `✓ Phase A Network Ingress completed in ${ingressSeconds.toFixed(2)}s`);

  // Phase B & C: Hydration & Compute via headless_runner.py
  log('PHASE-B-C', 'Spawning Python headless tensor execution...');
  const pythonOutput = await execWithOutput('python3', ['headless_runner.py']);

  let hydrationSeconds = 0;
  let computeSeconds = 0;
  const match = pythonOutput.match(/METRICS:hydration_s=([\d\.]+)\|compute_s=([\d\.]+)/);
  if (match) {
    hydrationSeconds = parseFloat(match[1]);
    computeSeconds = parseFloat(match[2]);
  } else {
    throw new Error('Failed to parse METRICS from headless_runner.py output');
  }

  // Phase D: Egress
  log('PHASE-D', 'Uploading output plate to Cloudflare R2 /outputs/...');
  const tStartD = Date.now();
  await execWithOutput('s5cmd', [
    '--endpoint-url', R2_ENDPOINT_URL,
    'cp', '/tmp/outputs/render_plate.mp4',
    `s3://${R2_BUCKET}/outputs/gate0_test_plate.mp4`
  ], s5cmdEnv);
  const egressSeconds = (Date.now() - tStartD) / 1000;
  log('PHASE-D', `✓ Phase D Egress completed in ${egressSeconds.toFixed(2)}s`);

  // Calculate economics
  const totalDuration = ingressSeconds + hydrationSeconds + computeSeconds + egressSeconds;
  const perSecondRate = HOURLY_RATE / 3600;
  const cost = totalDuration * perSecondRate;

  const runTelemetry: BenchmarkRun = {
    runId: `run_${Date.now()}`,
    timestamp: new Date().toISOString(),
    ingressSeconds,
    hydrationSeconds,
    computeSeconds,
    egressSeconds,
    totalSeconds: totalDuration,
    costUsd: cost,
    passedOomCheck: true,
  };

  evaluateGate0(runTelemetry);
}

runBenchmark().catch((err) => {
  log('FATAL', `Harness crashed: ${err.message}`);
  process.exit(1);
});
