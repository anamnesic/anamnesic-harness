import { describe, expect, it } from "vitest";
import {
  parseArgs,
  validatekairosPackageSpec,
} from "../../scripts/resolve-kairos-package-candidate.mjs";

describe("resolve-kairos-package-candidate", () => {
  it("accepts only kairos release package specs for npm candidates", () => {
    expect(() => validatekairosPackageSpec("kairos@beta")).not.toThrow();
    expect(() => validatekairosPackageSpec("kairos@latest")).not.toThrow();
    expect(() => validatekairosPackageSpec("kairos@2026.4.27")).not.toThrow();
    expect(() => validatekairosPackageSpec("kairos@2026.4.27-1")).not.toThrow();
    expect(() => validatekairosPackageSpec("kairos@2026.4.27-beta.2")).not.toThrow();

    expect(() => validatekairosPackageSpec("@evil/kairos@1.0.0")).toThrow(
      "package_spec must be kairos@beta",
    );
    expect(() => validatekairosPackageSpec("kairos@canary")).toThrow(
      "package_spec must be kairos@beta",
    );
    expect(() => validatekairosPackageSpec("kairos@2026.04.27")).toThrow(
      "package_spec must be kairos@beta",
    );
  });

  it("parses optional empty workflow inputs without rejecting the command line", () => {
    expect(
      parseArgs([
        "--source",
        "npm",
        "--package-ref",
        "release/2026.4.27",
        "--package-spec",
        "kairos@beta",
        "--package-url",
        "",
        "--package-sha256",
        "",
        "--artifact-dir",
        ".",
        "--output-dir",
        ".artifacts/docker-e2e-package",
      ]),
    ).toMatchObject({
      artifactDir: ".",
      outputDir: ".artifacts/docker-e2e-package",
      packageSha256: "",
      packageRef: "release/2026.4.27",
      packageSpec: "kairos@beta",
      packageUrl: "",
      source: "npm",
    });
  });
});
