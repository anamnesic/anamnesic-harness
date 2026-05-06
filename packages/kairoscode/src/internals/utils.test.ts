import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { withTempDir } from "./test-helpers/temp-dir.js";
import {
  ensureDir,
  resolveConfigDir,
  resolveHomeDir,
  resolveUserPath,
  shortenHomeInString,
  shortenHomePath,
  sleep,
} from "./utils.js";

describe("ensureDir", () => {
  it("creates nested directory", async () => {
    await withTempDir({ prefix: "kairos-test-" }, async (tmp) => {
      const target = path.join(tmp, "nested", "dir");
      await ensureDir(target);
      expect(fs.existsSync(target)).toBe(true);
    });
  });
});

describe("sleep", () => {
  it("resolves after delay using fake timers", async () => {
    vi.useFakeTimers();
    try {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("resolveConfigDir", () => {
  it("prefers ~/.kairos when legacy dir is missing", async () => {
    await withTempDir({ prefix: "kairos-config-dir-" }, async (root) => {
      const newDir = path.join(root, ".kairos");
      await fs.promises.mkdir(newDir, { recursive: true });
      const resolved = resolveConfigDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    });
  });

  it("expands kairos_STATE_DIR using the provided env", () => {
    const env = {
      HOME: "/tmp/kairos-home",
      kairos_STATE_DIR: "~/state",
    } as NodeJS.ProcessEnv;

    expect(resolveConfigDir(env)).toBe(path.resolve("/tmp/kairos-home", "state"));
  });

  it("falls back to the config file directory when only kairos_CONFIG_PATH is set", () => {
    const env = {
      HOME: "/tmp/kairos-home",
      kairos_CONFIG_PATH: "~/profiles/dev/kairos.json",
    } as NodeJS.ProcessEnv;

    expect(resolveConfigDir(env)).toBe(path.resolve("/tmp/kairos-home", "profiles", "dev"));
  });
});

describe("resolveHomeDir", () => {
  it("prefers kairos_HOME over HOME", () => {
    vi.stubEnv("kairos_HOME", "/srv/kairos-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(resolveHomeDir()).toBe(path.resolve("/srv/kairos-home"));
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("shortenHomePath", () => {
  it("uses $kairos_HOME prefix when kairos_HOME is set", () => {
    vi.stubEnv("kairos_HOME", "/srv/kairos-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(shortenHomePath(`${path.resolve("/srv/kairos-home")}/.kairos/kairos.json`)).toBe(
        "$kairos_HOME/.kairos/kairos.json",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("shortenHomeInString", () => {
  it("uses $kairos_HOME replacement when kairos_HOME is set", () => {
    vi.stubEnv("kairos_HOME", "/srv/kairos-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(
        shortenHomeInString(
          `config: ${path.resolve("/srv/kairos-home")}/.kairos/kairos.json`,
        ),
      ).toBe("config: $kairos_HOME/.kairos/kairos.json");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("resolveUserPath", () => {
  it("expands ~ to home dir", () => {
    expect(resolveUserPath("~", {}, () => "/Users/thoffman")).toBe(path.resolve("/Users/thoffman"));
  });

  it("expands ~/ to home dir", () => {
    expect(resolveUserPath("~/kairos", {}, () => "/Users/thoffman")).toBe(
      path.resolve("/Users/thoffman", "kairos"),
    );
  });

  it("resolves relative paths", () => {
    expect(resolveUserPath("tmp/dir")).toBe(path.resolve("tmp/dir"));
  });

  it("prefers kairos_HOME for tilde expansion", () => {
    vi.stubEnv("kairos_HOME", "/srv/kairos-home");
    vi.stubEnv("HOME", "/home/other");
    try {
      expect(resolveUserPath("~/kairos")).toBe(path.resolve("/srv/kairos-home", "kairos"));
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses the provided env for tilde expansion", () => {
    const env = {
      HOME: "/tmp/kairos-home",
      kairos_HOME: "/srv/kairos-home",
    } as NodeJS.ProcessEnv;

    expect(resolveUserPath("~/kairos", env)).toBe(path.resolve("/srv/kairos-home", "kairos"));
  });

  it("keeps blank paths blank", () => {
    expect(resolveUserPath("")).toBe("");
    expect(resolveUserPath("   ")).toBe("");
  });

  it("returns empty string for undefined/null input", () => {
    expect(resolveUserPath(undefined as unknown as string)).toBe("");
    expect(resolveUserPath(null as unknown as string)).toBe("");
  });
});
