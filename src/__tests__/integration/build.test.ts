import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../..");

describe("Next.js Build Validation", () => {
  it("should compile without errors (catches server action async violations)", () => {
    // This test catches the exact class of bug where "use server" files
    // have non-async exports. Next.js enforces this at build time,
    // but unit tests running in plain Node.js cannot detect it.
    const result = execSync("npx next build", {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: 120_000,
      env: { ...process.env, NODE_ENV: "production" },
    });

    // If we get here, the build succeeded
    expect(result).toContain("Generating static pages");
  }, 120_000);
});
