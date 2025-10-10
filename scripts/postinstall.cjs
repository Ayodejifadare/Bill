/*
  Postinstall: attempt to rebuild native modules used by Tailwind v4/PostCSS.
  This helps stabilize builds across environments (especially on Windows/CI).
  - Safe to run multiple times
  - Does not fail the install if rebuild is unavailable
*/

const { execSync } = require("node:child_process");

const packages = ["lightningcss", "@tailwindcss/oxide"];

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

function main() {
  if (process.env.SKIP_NATIVE_REBUILD === "1") {
    console.log(
      "[postinstall] Skipping native rebuild (SKIP_NATIVE_REBUILD=1)",
    );
    return;
  }

  const cmd = `npm rebuild ${packages.join(" ")} --unsafe-perm --foreground-scripts`;
  console.log(
    `[postinstall] Ensuring native bindings are present: ${packages.join(", ")}`,
  );
  try {
    run(cmd);
    console.log("[postinstall] Native rebuild completed.");
  } catch (err) {
    console.warn(
      "[postinstall] Native rebuild skipped or failed:",
      err?.message || err,
    );
    console.warn("[postinstall] Proceeding without failing install.");
  }
}

main();
