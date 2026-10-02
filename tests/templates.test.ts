import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function extractOwner(repositoryUrl: string): string {
  const match = /github\.com[/:]([^/]+)\//.exec(repositoryUrl);
  if (!match) {
    throw new Error(`cannot extract owner from repository url: ${repositoryUrl}`);
  }
  return match[1] as string;
}

describe("bundle templates", () => {
  it("references the repository's own org only with the canonical casing", async () => {
    const pkg = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8")) as {
      repository?: { url?: string } | string;
    };
    const rawRepository = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
    const owner = extractOwner(rawRepository ?? "");

    const templatesDir = path.join(repoRoot, "resources", "bundle_templates");
    const files = (await readdir(templatesDir)).filter((file) => file.endsWith(".yaml"));
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const doc = parse(await readFile(path.join(templatesDir, file), "utf8")) as {
        skills?: Array<{ name?: unknown; source?: unknown }>;
      };
      for (const skill of doc.skills ?? []) {
        const source = typeof skill.source === "string" ? skill.source.trim() : "";
        if (source === "") {
          continue;
        }
        const [org] = source.split("/");
        if (org && org.toLowerCase() === owner.toLowerCase() && org !== owner) {
          offenders.push(`${file}: ${String(skill.name)} -> ${source} (expected ${owner})`);
        }
      }
    }
    expect(offenders, `non-canonical own-org sources:\n${offenders.join("\n")}`).toEqual([]);
  });
});
