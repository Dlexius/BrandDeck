import fs from "node:fs";
import path from "node:path";

const RUNTIME_DIR =
  process.env.BRANDDECK_RUNTIME_DIR ??
  path.join(process.cwd(), ".branddeck-runtime");

export function runtimePath(...segments: string[]) {
  return path.join(RUNTIME_DIR, ...segments);
}

export function ensureRuntimeDir(...segments: string[]) {
  const target = runtimePath(...segments);
  fs.mkdirSync(target, { recursive: true });
  return target;
}

export function readRuntimeJson<T>(fileName: string, fallback: T): T {
  const filePath = runtimePath(fileName);

  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function writeRuntimeJson(fileName: string, value: unknown) {
  ensureRuntimeDir();
  const filePath = runtimePath(fileName);
  const tempPath = `${filePath}.tmp`;

  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2));
  fs.renameSync(tempPath, filePath);
}

export function readRuntimeBuffer(fileName: string) {
  return fs.readFileSync(runtimePath(fileName));
}

export function writeRuntimeBuffer(fileName: string, buffer: Buffer) {
  ensureRuntimeDir(path.dirname(fileName));
  fs.writeFileSync(runtimePath(fileName), buffer);
}
