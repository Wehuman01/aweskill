import { describe, expect, it } from "vitest";
import { canFastPathCheck, type UpdateOptions } from "../src/commands/update.js";
import type { SkillLockEntry } from "../src/lib/lock.js";
import { formatNoTrackedUpdatesMessage, formatUpdateStatusLines, type UpdateStatusReason } from "../src/lib/update.js";

describe("update helpers", () => {
  const cases: Array<{ reason: UpdateStatusReason; expected: string[] }> = [
    {
      reason: "source-missing-skill",
      expected: ["Failed to check caveman: source no longer contains this skill."],
    },
    {
      reason: "missing-local-skill",
      expected: [
        "Missing local skill: caveman. Use --override to reinstall it from source, or --prune to stop tracking it.",
      ],
    },
    {
      reason: "up-to-date",
      expected: ["Up to date: caveman."],
    },
    {
      reason: "local-changes-detected",
      expected: ["Skipped caveman: local changes detected. Use --override to discard local changes."],
    },
    {
      reason: "update-available",
      expected: ["Update available: caveman."],
    },
    {
      reason: "updated",
      expected: ["Updated caveman"],
    },
  ];

  for (const { reason, expected } of cases) {
    it(`formats ${reason} messages`, () => {
      expect(formatUpdateStatusLines("caveman", reason)).toEqual(expected);
    });
  }

  it("formats the no-tracked-skills message", () => {
    expect(formatNoTrackedUpdatesMessage()).toBe("No tracked skills to update.");
  });
});

describe("canFastPathCheck", () => {
  const entry: SkillLockEntry = {
    source: "wehuman01/aweskill",
    sourceType: "github",
    sourceUrl: "https://github.com/wehuman01/aweskill.git",
    computedHash: "local-baseline",
    remoteTreeSha: "recorded-tree-sha",
    installedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const check: UpdateOptions = { check: true };

  it("short-circuits when check mode sees a moved upstream and a comparable baseline", () => {
    expect(canFastPathCheck(check, false, "new-tree-sha", entry)).toBe(true);
  });

  it("never short-circuits outside check mode", () => {
    expect(canFastPathCheck({}, false, "new-tree-sha", entry)).toBe(false);
  });

  it("never short-circuits on a truncated tree", () => {
    expect(canFastPathCheck(check, true, "new-tree-sha", entry)).toBe(false);
  });

  it("never short-circuits without both tree SHAs", () => {
    expect(canFastPathCheck(check, false, undefined, entry)).toBe(false);
    expect(canFastPathCheck(check, false, "new-tree-sha", { ...entry, remoteTreeSha: undefined })).toBe(false);
  });

  it("never short-circuits when upstream is unchanged", () => {
    expect(canFastPathCheck(check, false, "recorded-tree-sha", entry)).toBe(false);
  });
});
