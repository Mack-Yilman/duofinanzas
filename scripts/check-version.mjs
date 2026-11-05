#!/usr/bin/env node
/**
 * Regla del proyecto: cada PR a `main` debe
 *   1) subir la versión de package.json (SemVer) respecto a `main`, y
 *   2) tener su entrada "## [X.Y.Z]" en CHANGELOG.md.
 * Uso: node scripts/check-version.mjs [versionBase]
 *   - Sin argumento, lee la versión base de `git show origin/main:package.json`.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function parse(v) {
  const m = SEMVER.exec(String(v).trim());
  if (!m) throw new Error(`Versión inválida "${v}" (usa X.Y.Z)`);
  return m.slice(1).map(Number);
}

export function isGreater(a, b) {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

export function hasChangelogEntry(changelog, version) {
  return changelog.includes(`## [${version}]`);
}

function main() {
  const current = JSON.parse(readFileSync("package.json", "utf8")).version;
  const base =
    process.argv[2] ??
    JSON.parse(execSync("git show origin/main:package.json", { encoding: "utf8" })).version;
  const changelog = readFileSync("CHANGELOG.md", "utf8");
  const errors = [];
  if (!isGreater(current, base)) {
    errors.push(`La versión de package.json (${current}) debe ser mayor que la de main (${base}).`);
  }
  if (!hasChangelogEntry(changelog, current)) {
    errors.push(`Falta la entrada "## [${current}]" en CHANGELOG.md.`);
  }
  if (errors.length) {
    console.error("❌ Versionado obligatorio:\n- " + errors.join("\n- "));
    console.error("\nGuía: patch = arreglos, minor = funcionalidades, major = cambios incompatibles.");
    process.exit(1);
  }
  console.log(`✅ Versión ${base} → ${current} con entrada en CHANGELOG.md`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
