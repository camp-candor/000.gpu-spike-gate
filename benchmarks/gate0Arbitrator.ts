import fs from 'node:fs';
import path from 'node:path';

export interface BenchmarkRun {
  runId: string;
  timestamp: string;
  ingressSeconds: number;
  hydrationSeconds: number;
  computeSeconds: number;
  egressSeconds: number;
  totalSeconds: number;
  costUsd: number;
  passedOomCheck: boolean;
}

export interface Gate0Evaluation {
  ingressPassed: boolean;
  hydrationPassed: boolean;
  computePassed: boolean;
  costPassed: boolean;
  oomPassed: boolean;
  overallPassed: boolean;
}

export function evaluateGate0(run: BenchmarkRun): Gate0Evaluation {
  const ingressPassed = run.ingressSeconds <= 18.0;
  const hydrationPassed = run.hydrationSeconds <= 5.0;
  const computePassed = run.computeSeconds <= 45.0;
  const costPassed = run.costUsd <= 0.060;
  const oomPassed = run.passedOomCheck;

  const overallPassed = ingressPassed && hydrationPassed && computePassed && costPassed && oomPassed;

  console.log('\n' + '='.repeat(70));
  console.log('=== GATE 0 ARBITRATION SUMMARY ===');
  console.log(`Phase A (Ingress):      ${run.ingressSeconds.toFixed(2)}s  (Target <= 18.0s)  -> ${ingressPassed ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Phase B (Hydration):    ${run.hydrationSeconds.toFixed(2)}s  (Target <= 5.0s)   -> ${hydrationPassed ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Phase C (Compute):      ${run.computeSeconds.toFixed(2)}s  (Target <= 45.0s)  -> ${computePassed ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`Phase D (Egress):       ${run.egressSeconds.toFixed(2)}s`);
  console.log(`Total Wall Time:        ${run.totalSeconds.toFixed(2)}s`);
  console.log(`Calculated Shot Cost:   $${run.costUsd.toFixed(4)} (Target <= $0.0600) -> ${costPassed ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`CUDA OOM Check:         ${oomPassed ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log('-'.repeat(70));
  console.log(`OVERALL GATE 0 STATUS:  ${overallPassed ? 'PASSED (PROCEED TO GATE 1) ✓' : 'REJECTED (FALSIFIED) ✗'}`);
  console.log('='.repeat(70) + '\n');

  // Persist run history to benchmarks/gpu_spike.json
  const benchDir = path.resolve('benchmarks');
  fs.mkdirSync(benchDir, { recursive: true });
  const benchFile = path.join(benchDir, 'gpu_spike.json');

  let history: BenchmarkRun[] = [];
  if (fs.existsSync(benchFile)) {
    try {
      history = JSON.parse(fs.readFileSync(benchFile, 'utf-8'));
    } catch {
      history = [];
    }
  }

  history.push(run);
  fs.writeFileSync(benchFile, JSON.stringify(history, null, 2), 'utf-8');
  console.log(`[ARBITRATOR] Telemetry committed to ${benchFile}`);

  return {
    ingressPassed,
    hydrationPassed,
    computePassed,
    costPassed,
    oomPassed,
    overallPassed,
  };
}
