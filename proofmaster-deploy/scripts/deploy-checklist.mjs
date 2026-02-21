import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { constants as fsConstants } from "node:fs";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const errors = [];
const warnings = [];
const checks = [];

async function exists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function ok(message) {
  checks.push(`[OK]   ${message}`);
}

function fail(message) {
  errors.push(`[FAIL] ${message}`);
}

function warn(message) {
  warnings.push(`[WARN] ${message}`);
}

async function main() {
  console.log("ProofMaster deployment preflight checklist\n");

  const packageJsonPath = path.join(projectRoot, "package.json");
  const vercelConfigPath = path.join(projectRoot, "vercel.json");
  const apiWolframPath = path.join(projectRoot, "api", "wolfram.js");
  const apiHealthPath = path.join(projectRoot, "api", "health.js");
  const distIndexPath = path.join(projectRoot, "dist", "index.html");

  if (!(await exists(packageJsonPath))) {
    fail("package.json not found in current directory.");
  } else {
    ok("package.json found");
  }

  if (!(await exists(vercelConfigPath))) {
    fail("vercel.json not found in current directory.");
  } else {
    ok("vercel.json found");
  }

  if (!(await exists(apiWolframPath))) {
    fail("Missing API route: api/wolfram.js");
  } else {
    ok("api/wolfram.js found");
  }

  if (!(await exists(apiHealthPath))) {
    fail("Missing API route: api/health.js");
  } else {
    ok("api/health.js found");
  }

  if (!(await exists(distIndexPath))) {
    warn("dist/index.html not found. Run `npm run build` before deploying.");
  } else {
    ok("dist/index.html found");
  }

  if (await exists(packageJsonPath)) {
    try {
      const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
      if (pkg?.scripts?.build === "vite build") {
        ok("Build script is configured as `vite build`");
      } else {
        fail("package.json scripts.build must be `vite build`.");
      }
    } catch (err) {
      fail(`Unable to parse package.json: ${err.message}`);
    }
  }

  if (await exists(vercelConfigPath)) {
    try {
      const vercelConfig = JSON.parse(await readFile(vercelConfigPath, "utf8"));
      const rewrites = Array.isArray(vercelConfig.rewrites) ? vercelConfig.rewrites : [];
      const hasApiRewrite = rewrites.some(
        (rule) => rule.source === "/api/(.*)" && rule.destination === "/api/$1"
      );
      const hasSpaRewrite = rewrites.some(
        (rule) => rule.source === "/(.*)" && rule.destination === "/index.html"
      );

      if (vercelConfig.outputDirectory === "dist") {
        ok("vercel.json outputDirectory is set to `dist`");
      } else {
        fail("vercel.json outputDirectory must be `dist`.");
      }

      if (vercelConfig.functions?.["api/**/*.js"]) {
        ok("vercel.json includes serverless function runtime config");
      } else {
        fail("vercel.json is missing `functions[\"api/**/*.js\"]` runtime config.");
      }

      if (hasApiRewrite) {
        ok("vercel.json includes API rewrite /api/(.*) -> /api/$1");
      } else {
        fail("Missing API rewrite: /api/(.*) -> /api/$1");
      }

      if (hasSpaRewrite) {
        ok("vercel.json includes SPA rewrite /(.*) -> /index.html");
      } else {
        fail("Missing SPA rewrite: /(.*) -> /index.html");
      }
    } catch (err) {
      fail(`Unable to parse vercel.json: ${err.message}`);
    }
  }

  if (process.env.WOLFRAM_APP_ID) {
    ok("WOLFRAM_APP_ID is present in current environment");
  } else {
    warn("WOLFRAM_APP_ID is not set locally. Configure it in Vercel project settings.");
  }

  const gitRoot = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  if (gitRoot.status === 0) {
    const repoRoot = gitRoot.stdout.trim();
    const relativeRoot = path.relative(repoRoot, projectRoot) || ".";
    if (relativeRoot !== "." && relativeRoot !== "proofmaster-deploy") {
      warn(
        `Current app directory is '${relativeRoot}'. Confirm Vercel Root Directory matches this path.`
      );
    } else if (relativeRoot === "proofmaster-deploy") {
      ok("Repository layout detected: set Vercel Root Directory to `proofmaster-deploy`");
    }
  }

  console.log(checks.join("\n"));
  if (warnings.length > 0) {
    console.log("");
    console.log(warnings.join("\n"));
  }

  if (errors.length > 0) {
    console.log("");
    console.log(errors.join("\n"));
    console.log("\nChecklist failed.");
    process.exit(1);
  }

  console.log("\nChecklist passed.");
}

main().catch((err) => {
  console.error(`[FAIL] Unexpected checklist error: ${err.message}`);
  process.exit(1);
});
