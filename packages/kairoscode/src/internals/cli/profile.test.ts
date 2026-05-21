import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "kairos",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "kairos", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("leaves gateway --dev for subcommands after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "kairos",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "kairos",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "kairos", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "kairos", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "kairos", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "kairos", "status"]);
  });

  it("parses interleaved --profile after the command token", () => {
    const res = parseCliProfileArgs(["node", "kairos", "status", "--profile", "work", "--deep"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "kairos", "status", "--deep"]);
  });

  it("preserves Matrix QA --profile for the command parser", () => {
    const res = parseCliProfileArgs([
      "node",
      "kairos",
      "qa",
      "matrix",
      "--profile",
      "fast",
      "--fail-fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "kairos",
      "qa",
      "matrix",
      "--profile",
      "fast",
      "--fail-fast",
    ]);
  });

  it("preserves Matrix QA --profile after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "kairos",
      "--no-color",
      "qa",
      "matrix",
      "--profile=fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "kairos", "--no-color", "qa", "matrix", "--profile=fast"]);
  });

  it("still parses root --profile before Matrix QA", () => {
    const res = parseCliProfileArgs([
      "node",
      "kairos",
      "--profile",
      "work",
      "qa",
      "matrix",
      "--fail-fast",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "kairos", "qa", "matrix", "--fail-fast"]);
  });

  it("parses interleaved --dev after the command token", () => {
    const res = parseCliProfileArgs(["node", "kairos", "status", "--dev"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "kairos", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "kairos", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "kairos", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "kairos", "--profile", "work", "--dev", "status"]],
    ["interleaved after command", ["node", "kairos", "status", "--profile", "work", "--dev"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".kairos-dev");
    expect(env.kairos_PROFILE).toBe("dev");
    expect(env.kairos_STATE_DIR).toBe(expectedStateDir);
    expect(env.kairos_CONFIG_PATH).toBe(path.join(expectedStateDir, "kairos.json"));
    expect(env.kairos_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      kairos_STATE_DIR: "/custom",
      kairos_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.kairos_STATE_DIR).toBe("/custom");
    expect(env.kairos_GATEWAY_PORT).toBe("19099");
    expect(env.kairos_CONFIG_PATH).toBe(path.join("/custom", "kairos.json"));
  });

  it("uses kairos_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      kairos_HOME: "/srv/kairos-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/kairos-home");
    expect(env.kairos_STATE_DIR).toBe(path.join(resolvedHome, ".kairos-work"));
    expect(env.kairos_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".kairos-work", "kairos.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "kairos doctor --fix",
      env: {},
      expected: "kairos doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "kairos doctor --fix",
      env: { kairos_PROFILE: "default" },
      expected: "kairos doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "kairos doctor --fix",
      env: { kairos_PROFILE: "Default" },
      expected: "kairos doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "kairos doctor --fix",
      env: { kairos_PROFILE: "bad profile" },
      expected: "kairos doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "kairos --profile work doctor --fix",
      env: { kairos_PROFILE: "work" },
      expected: "kairos --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "kairos --dev doctor",
      env: { kairos_PROFILE: "dev" },
      expected: "kairos --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("kairos doctor --fix", { kairos_PROFILE: "work" })).toBe(
      "kairos --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("kairos doctor --fix", { kairos_PROFILE: "  jbkairos  " })).toBe(
      "kairos --profile jbkairos doctor --fix",
    );
  });

  it("handles command with no args after kairos", () => {
    expect(formatCliCommand("kairos", { kairos_PROFILE: "test" })).toBe(
      "kairos --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm kairos doctor", { kairos_PROFILE: "work" })).toBe(
      "pnpm kairos --profile work doctor",
    );
  });

  it("inserts --container when a container hint is set", () => {
    expect(
      formatCliCommand("kairos gateway status --deep", { kairos_CONTAINER_HINT: "demo" }),
    ).toBe("kairos --container demo gateway status --deep");
  });

  it("ignores unsafe container hints", () => {
    expect(
      formatCliCommand("kairos gateway status --deep", {
        kairos_CONTAINER_HINT: "demo; rm -rf /",
      }),
    ).toBe("kairos gateway status --deep");
  });

  it("preserves both --container and --profile hints", () => {
    expect(
      formatCliCommand("kairos doctor", {
        kairos_CONTAINER_HINT: "demo",
        kairos_PROFILE: "work",
      }),
    ).toBe("kairos --container demo doctor");
  });

  it("does not prepend --container for update commands", () => {
    expect(formatCliCommand("kairos update", { kairos_CONTAINER_HINT: "demo" })).toBe(
      "kairos update",
    );
    expect(
      formatCliCommand("pnpm kairos update --channel beta", { kairos_CONTAINER_HINT: "demo" }),
    ).toBe("pnpm kairos update --channel beta");
  });
});
