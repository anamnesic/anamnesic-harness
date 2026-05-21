import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findForbiddenChangelogThanks } from "../../scripts/check-changelog-attributions.mjs";

describe("check-changelog-attributions", () => {
  it("flags forbidden bot, org, and maintainer thanks attributions", () => {
    const content = [
      "- Internal cleanup. Thanks @codex.",
      "- Org-owned fix. Thanks @kairos.",
      "- Maintainer-owned fix. Thanks @steipete.",
      "- Mixed credit. Thanks @contributor and @kairos.",
    ].join("\n");

    expect(findForbiddenChangelogThanks(content)).toEqual([
      { line: 1, handle: "codex", text: "- Internal cleanup. Thanks @codex." },
      { line: 2, handle: "kairos", text: "- Org-owned fix. Thanks @kairos." },
      { line: 3, handle: "steipete", text: "- Maintainer-owned fix. Thanks @steipete." },
      { line: 4, handle: "kairos", text: "- Mixed credit. Thanks @contributor and @kairos." },
    ]);
  });

  it("allows external contributor thanks attributions", () => {
    expect(
      findForbiddenChangelogThanks(
        "- User-facing fix. Fixes #123. Thanks @external-contributor and @other-user.",
      ),
    ).toEqual([]);
  });

  it("keeps PR changelog gates on the same attribution policy", () => {
    const changelogLib = readFileSync("scripts/pr-lib/changelog.sh", "utf8");
    const gates = readFileSync("scripts/pr-lib/gates.sh", "utf8");

    expect(changelogLib).toContain("node scripts/check-changelog-attributions.mjs CHANGELOG.md");
    expect(gates).toContain("validate_changelog_attribution_policy");
  });
});
