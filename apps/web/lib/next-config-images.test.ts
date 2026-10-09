import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");

const evaluateImagesConfig = (nextImageAllowLocalIp?: string) => {
  const env: Record<string, string | undefined> = {
    ...process.env,
    DATABASE_URL: "postgresql://test:test@127.0.0.1:1/formbricks",
    REDIS_URL: "redis://127.0.0.1:1",
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef",
    HUB_API_URL: "http://127.0.0.1:1",
    HUB_API_KEY: "test-placeholder",
    CUBEJS_API_URL: "http://127.0.0.1:1",
    CUBEJS_API_SECRET: "test-placeholder",
  };

  if (nextImageAllowLocalIp !== undefined) {
    env.NEXT_IMAGE_ALLOW_LOCAL_IP = nextImageAllowLocalIp;
  } else {
    delete env.NEXT_IMAGE_ALLOW_LOCAL_IP;
  }

  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import config from './next.config.mjs'; console.log(JSON.stringify(config.images));",
    ],
    {
      cwd: webRoot,
      env,
      encoding: "utf8",
    }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to evaluate next.config.mjs: ${result.stderr}`);
  }

  return JSON.parse(result.stdout.trim());
};

describe("Next.js image configuration (Issue #7184)", { timeout: 30000 }, () => {
  test("when NEXT_IMAGE_ALLOW_LOCAL_IP is missing -> dangerouslyAllowLocalIP is false", () => {
    const imagesConfig = evaluateImagesConfig(undefined);
    expect(imagesConfig.dangerouslyAllowLocalIP).toBe(false);
  });

  test("when NEXT_IMAGE_ALLOW_LOCAL_IP is 'false' -> dangerouslyAllowLocalIP is false", () => {
    const imagesConfig = evaluateImagesConfig("false");
    expect(imagesConfig.dangerouslyAllowLocalIP).toBe(false);
  });

  test("when NEXT_IMAGE_ALLOW_LOCAL_IP is 'true' -> dangerouslyAllowLocalIP is true", () => {
    const imagesConfig = evaluateImagesConfig("true");
    expect(imagesConfig.dangerouslyAllowLocalIP).toBe(true);
  });

  test("preserves all existing images configuration", () => {
    const imagesConfig = evaluateImagesConfig(undefined);
    expect(imagesConfig.deviceSizes).toEqual([640, 750, 828, 1080, 1200, 1920]);
    expect(imagesConfig.imageSizes).toEqual([16, 32, 48, 64, 96, 128, 256, 384]);
    expect(imagesConfig.formats).toEqual(["image/webp"]);
    expect(imagesConfig.minimumCacheTTL).toBe(60);
    expect(imagesConfig.dangerouslyAllowSVG).toBe(true);
    expect(Array.isArray(imagesConfig.remotePatterns)).toBe(true);
    expect(imagesConfig.remotePatterns.length).toBeGreaterThan(0);
  });
});
