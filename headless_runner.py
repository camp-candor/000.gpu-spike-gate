import os
import sys
import time
import torch

def log(phase, msg):
    ts = time.strftime("%H:%M:%S", time.gmtime())
    print(f"[{ts}] [{phase}] {msg}", flush=True)

def main():
    print("=" * 70, flush=True)
    log("HEADLESS-INIT", "Starting Headless Synthetic Tensor Execution")

    if not torch.cuda.is_available():
        log("FATAL", "CUDA is not available on this worker. RTX 4090 GPU is required.")
        sys.exit(1)

    device_name = torch.cuda.get_device_name(0)
    vram_total_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    log("DEVICE", f"GPU: {device_name} | Total VRAM: {vram_total_gb:.2f} GB")

    model_dir = "/tmp/models"
    files = os.listdir(model_dir) if os.path.exists(model_dir) else []
    log("FS-CHECK", f"Files found in /tmp/models: {files}")

    # Phase B: Hydration
    log("HYDRATION", "Allocating 14.0 GB tensor footprint to simulate checkpoint hydration...")
    t_start_vram = time.perf_counter()
    try:
        # 14 GB float16 tensor = (7 * 1024 * 1024 * 1024) elements @ 2 bytes each
        num_elements = int(7 * 1024 * 1024 * 1024)
        tensor_weights = torch.empty(num_elements, dtype=torch.float16, device="cuda")
        torch.cuda.synchronize()
    except torch.cuda.OutOfMemoryError as oom:
        log("OOM", f"CUDA Out of Memory during hydration: {oom}")
        sys.exit(2)

    vram_hydration_duration = time.perf_counter() - t_start_vram
    allocated_gb = torch.cuda.memory_allocated(0) / (1024**3)
    log("HYDRATION", f"✓ Hydrated {allocated_gb:.2f} GB into VRAM in {vram_hydration_duration:.3f}s")

    # Phase C: Compute Execution
    log("COMPUTE", "Executing 20-step synthetic inference GEMM pass...")
    t_start_compute = time.perf_counter()

    # 4090 tensor core matrix multiplication benchmark
    dim = 8192
    a = torch.randn(dim, dim, dtype=torch.float16, device="cuda")
    b = torch.randn(dim, dim, dtype=torch.float16, device="cuda")

    for step in range(1, 21):
        step_start = time.perf_counter()
        c = torch.matmul(a, b)
        torch.cuda.synchronize()
        step_ms = (time.perf_counter() - step_start) * 1000
        if step % 5 == 0 or step == 1 or step == 20:
            log("STEP", f"Step {step:02d}/20 complete ({step_ms:.2f} ms)")

    compute_duration = time.perf_counter() - t_start_compute
    log("COMPUTE", f"✓ 20 synthetic inference iterations completed in {compute_duration:.3f}s")

    # Create output artifact
    os.makedirs("/tmp/outputs", exist_ok=True)
    out_path = "/tmp/outputs/render_plate.mp4"
    with open(out_path, "wb") as f:
        f.write(os.urandom(1024 * 512)) # 512 KB dummy video plate
    log("ARTIFACT", f"Generated validation plate at {out_path}")

    # Emit machine-readable metric line for harness.ts
    print(f"\nMETRICS:hydration_s={vram_hydration_duration:.4f}|compute_s={compute_duration:.4f}", flush=True)

if __name__ == "__main__":
    main()
