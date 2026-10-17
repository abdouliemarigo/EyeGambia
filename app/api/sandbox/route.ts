
import { enforceRateLimit, getClientIdentifier } from "../../rate-limit";
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const runtime = "nodejs";

function run(cmd: string, args: string[], cwd: string, ms = 5000) {
  return new Promise<{ code: number | null; out: string; err: string }>((resolve) => {
    const p = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        PATH: process.env.PATH || "",
        NODE_OPTIONS: "--max-old-space-size=128",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let out = "";
    let err = "";

    p.stdout.on("data", (d: Buffer) => {
      out += d.toString();
    });

    p.stderr.on("data", (d: Buffer) => {
      err += d.toString();
    });

    const t = setTimeout(() => {
      try {
        p.kill("SIGKILL");
      } catch {}

      resolve({
        code: null,
        out: out.slice(0, 12000),
        err: (err + "\nTIMEOUT").slice(0, 12000),
      });
    }, ms);

    p.on("close", (code: number | null) => {
      clearTimeout(t);

      resolve({
        code,
        out: out.slice(0, 12000),
        err: err.slice(0, 12000),
      });
    });
  });
}

export async function POST(req: Request) {
  const rl = await enforceRateLimit(
    getClientIdentifier(req),
    5
  );

  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please wait.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(
              1,
              Math.ceil((rl.reset - Date.now()) / 1000)
            )
          ),
        },
      }
    );
  }

  // Keep the rest of your existing POST logic here.

  // If you create a temporary directory such as:
  // const dir = await fs.mkdtemp(path.join(os.tmpdir(), "your-prefix-"));

  // Wrap the main POST logic with:
  //
  // try {
  //   ... existing POST code ...
  // } finally {
  //   await fs.rm(dir, {
  //     recursive: true,
  //     force: true,
  //   });
  // }
}

