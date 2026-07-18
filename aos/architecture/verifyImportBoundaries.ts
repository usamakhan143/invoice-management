import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  AOS_IMPORT_BOUNDARY_EXEMPT_PREFIXES,
  AOS_IMPORT_BOUNDARY_RULES,
} from "./importBoundaryRules";

const REPO_ROOT = join(import.meta.dirname, "..", "..");

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      collectSourceFiles(fullPath, files);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

function isExempt(filePath: string, repoRoot: string): boolean {
  const rel = normalizePath(relative(repoRoot, filePath));
  return AOS_IMPORT_BOUNDARY_EXEMPT_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function layerForFile(relPath: string): (typeof AOS_IMPORT_BOUNDARY_RULES)[number] | undefined {
  for (const rule of AOS_IMPORT_BOUNDARY_RULES) {
    const prefix = `aos/${rule.layer}/`;
    if (relPath.startsWith(prefix)) return rule;
  }
  if (relPath.startsWith("aos/pages/")) {
    return AOS_IMPORT_BOUNDARY_RULES.find((r) => r.layer === "pages");
  }
  if (relPath.startsWith("aos/hooks/")) {
    return AOS_IMPORT_BOUNDARY_RULES.find((r) => r.layer === "hooks");
  }
  return undefined;
}

function extractImportSources(content: string): string[] {
  const sources: string[] = [];
  const importRegex = /(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    sources.push(match[1]);
  }
  return sources;
}

export function verifyAosImportBoundaries(
  aosRoot: string = join(REPO_ROOT, "aos"),
  repoRoot: string = REPO_ROOT,
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const files = collectSourceFiles(aosRoot);

  for (const file of files) {
    const rel = normalizePath(relative(repoRoot, file));
    if (isExempt(file, repoRoot)) continue;

    const rule = layerForFile(rel);
    if (!rule) continue;

    const content = readFileSync(file, "utf8");
    const sources = extractImportSources(content);

    for (const source of sources) {
      for (const forbidden of rule.forbiddenImportPatterns) {
        if (source.includes(forbidden)) {
          violations.push(`${rel}: forbidden import "${source}" (${forbidden})`);
        }
      }
    }
  }

  return { ok: violations.length === 0, violations };
}
