import "dotenv/config";
import {
  evaluateGate0,
  type BenchmarkRun,
} from "./benchmarks/gate0Arbitrator.js";

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY || "";
const RUNPOD_ENDPOINT_ID = process.env.RUNPOD_ENDPOINT_ID || "hdf8left0vdukl";
const HOURLY_RATE = parseFloat(process.env.RUNPOD_HOURLY_RATE || "0.74");

function log(phase: string, msg: string) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] [${phase}] ${msg}`);
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runBenchmark(): Promise<void> {
  console.log("=".repeat(70));
  log("HARNESS", "=== GATE 0 COLD START SPIKE HARNESS (REMOTE RUNPOD) ===");
  log(
    "PARAMS",
    `Target Endpoint: https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}`,
  );
  console.log("=".repeat(70));

  if (!RUNPOD_API_KEY) {
    throw new Error("RUNPOD_API_KEY is not set in .env");
  }

  log("DISPATCH", "Submitting cold start job (async mode)...");
  const tStart = Date.now();

  // 1. Submit async job
  const initRes = await fetch(
    `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RUNPOD_API_KEY}`,
      },
      body: JSON.stringify({
        input: {
          checkpoint_key:
            process.env.CHECKPOINT_KEY ||
            "checkpoints/wan2.2_i2v_high_noise_14B_Q3_K_S.gguf",
        },
      }),
    },
  );

  if (!initRes.ok) {
    const errorText = await initRes.text();
    throw new Error(
      `RunPod submission error (${initRes.status}): ${errorText}`,
    );
  }

  const { id: jobId } = await initRes.json();
  log("DISPATCH", `Job dispatched successfully. Job ID: ${jobId}`);

  // 2. Poll status until complete
  let result: any = null;
  while (true) {
    await sleep(3000);
    const statusRes = await fetch(
      `https://api.runpod.ai/v2/${RUNPOD_ENDPOINT_ID}/status/${jobId}`,
      {
        headers: { Authorization: `Bearer ${RUNPOD_API_KEY}` },
      },
    );
    result = await statusRes.json();
    log(
      "POLL",
      `Job status: ${result.status} (${((Date.now() - tStart) / 1000).toFixed(1)}s elapsed)`,
    );

    if (result.status === "COMPLETED" || result.status === "FAILED") {
      break;
    }
  }

  const wallClockSeconds = (Date.now() - tStart) / 1000;

  if (result.status === "FAILED") {
    throw new Error(
      `RunPod execution failed: ${JSON.stringify(result.error || result)}`,
    );
  }

  log(
    "RESPONSE",
    `Worker finished with COMPLETED status in ${wallClockSeconds.toFixed(2)}s wall-clock time.`,
  );
  console.log("[RAW PAYLOAD]", JSON.stringify(result, null, 2));

  // 3. Extract metrics from headless_runner / handler
  const output = result.output || {};
  const ingressSeconds =
    output.ingress_seconds ?? output.network_ingress_seconds ?? 0;
  const hydrationSeconds =
    output.hydration_seconds ?? output.vram_hydration_seconds ?? 0;
  const computeSeconds =
    output.compute_seconds ?? output.inference_seconds ?? 0;
  const egressSeconds = output.egress_seconds ?? 0;
  const totalSeconds =
    ingressSeconds + hydrationSeconds + computeSeconds + egressSeconds ||
    wallClockSeconds;
  const cost = totalSeconds * (HOURLY_RATE / 3600);

  const runTelemetry: BenchmarkRun = {
    runId: result.id,
    timestamp: new Date().toISOString(),
    ingressSeconds,
    hydrationSeconds,
    computeSeconds,
    egressSeconds,
    totalSeconds,
    costUsd: cost,
    passedOomCheck: output.status !== "OOM" && result.status === "COMPLETED",
  };

  evaluateGate0(runTelemetry);
}

runBenchmark().catch((err) => {
  log("FATAL", `Harness crashed: ${err.message}`);
  process.exit(1);
});
