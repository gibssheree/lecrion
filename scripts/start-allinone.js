#!/usr/bin/env node
// scripts/start-allinone.js
//
// Entrypoint for the single-service deployment (Railway / Render / Fly).
//
// Those platforms attach a persistent volume to exactly one service, but the
// API and the worker both write the same SQLite file — so they have to share
// a container. The SPA has to live there too: it calls the API on relative
// paths and opens Socket.IO against window.location.origin, so it only works
// same-origin. The API serves it directly when CLIENT_DIST_DIR is set.
//
// The Docker Compose deployment keeps them as separate containers and does
// not use this script.
//
// Sequence: migrate -> start worker -> start API. If either process exits,
// the other is stopped and this process exits non-zero so the platform
// restarts the container rather than leaving a half-dead service running.

const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const API_ENTRY = path.join(ROOT, "apps/api/dist/apps/api/src/main.js");
const WORKER_ENTRY = path.join(ROOT, "apps/worker/dist/apps/worker/src/main.js");

function log(message) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    service: "entrypoint",
    message,
  }));
}

function fail(message) {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: "error",
    service: "entrypoint",
    message,
  }));
  process.exit(1);
}

// ── Migrations ───────────────────────────────────────────────────────────────
log("Applying database migrations...");
const migrate = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});
if (migrate.status !== 0) {
  fail(`prisma migrate deploy exited with ${migrate.status}`);
}

// ── Optional seed ────────────────────────────────────────────────────────────
// Off by default. The seed creates accounts whose passwords are published in
// prisma/seed.ts, so re-running it on every boot would resurrect accounts an
// operator deleted on purpose. Set SEED_ON_START=true for a first launch,
// then unset it.
if (process.env.SEED_ON_START === "true") {
  log("SEED_ON_START=true — seeding database...");
  const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (seed.status !== 0) {
    fail(`seed exited with ${seed.status}`);
  }
}

// ── Child processes ──────────────────────────────────────────────────────────
const children = [];
let shuttingDown = false;

function start(name, entry) {
  const child = spawn(process.execPath, [entry], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  children.push({ name, child });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`${name} exited (code=${code} signal=${signal}) — stopping container`);
    stopAll();
    // Non-zero so the platform's restart policy kicks in. A container running
    // only half of the stack is worse than one that is visibly down.
    process.exitCode = code === 0 ? 1 : (code ?? 1);
  });

  return child;
}

function stopAll(signal = "SIGTERM") {
  for (const { child } of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill(signal);
    }
  }
}

log("Starting worker...");
start("worker", WORKER_ENTRY);

log("Starting API...");
start("api", API_ENTRY);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`Received ${signal} — shutting down`);
    stopAll(signal);
  });
}
