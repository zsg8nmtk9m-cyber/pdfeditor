// Orchestrates the e2e run: build fixtures, serve the production build,
// execute the suite, tear down. Usage: npm run test:e2e (after npm run build).
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT ?? "4173";
const basePath = `/${(process.env.BASE_PATH ?? "/").replace(/^\/+|\/+$/g, "")}`;
const baseUrl = `http://localhost:${PORT}${basePath === "/" ? "" : basePath}`;

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", cwd: root, ...opts });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    child.on("error", reject);
  });
}

await run("node", ["tests/make-fixtures.mjs"]);

const server = spawn("npx", ["vite", "preview", "--port", PORT, "--strictPort"], {
  cwd: root,
  stdio: "ignore",
});

async function waitForServer(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("preview server did not start");
}

let exitCode = 0;
try {
  await waitForServer(`${baseUrl}/`);
  await run("node", ["tests/e2e.mjs"], {
    env: { ...process.env, BASE_URL: baseUrl },
  });
} catch (err) {
  console.error(err.message);
  exitCode = 1;
} finally {
  server.kill();
}
process.exit(exitCode);
