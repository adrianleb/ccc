import { existsSync, mkdirSync, writeFileSync, chmodSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";
import * as ui from "../utils/ui.ts";

const BINARIES_DIR = join(homedir(), ".ccc", "binaries");
const GITHUB_REPO = "adrianleb/ccc"; // TODO: Update with actual repo

export interface PlatformInfo {
  os: string; // "linux" | "darwin"
  arch: string; // "x64" | "arm64"
  binaryName: string; // "ccc-linux-x64"
}

export function detectRemotePlatform(host: string): PlatformInfo | null {
  try {
    const result = execSync(`ssh ${host} "uname -sm"`, {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();

    const [os, arch] = result.split(" ");

    const normalizedOs = os?.toLowerCase() === "darwin" ? "darwin" : "linux";
    const normalizedArch =
      arch === "x86_64" || arch === "amd64"
        ? "x64"
        : arch === "aarch64" || arch === "arm64"
          ? "arm64"
          : "x64";

    return {
      os: normalizedOs,
      arch: normalizedArch,
      binaryName: `ccc-${normalizedOs}-${normalizedArch}`,
    };
  } catch {
    return null;
  }
}

export function detectLocalPlatform(): PlatformInfo {
  const os = process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";

  return {
    os,
    arch,
    binaryName: `ccc-${os}-${arch}`,
  };
}

export function getBinaryCachePath(platform: PlatformInfo): string {
  return join(BINARIES_DIR, platform.binaryName);
}

export function isBinaryCached(platform: PlatformInfo): boolean {
  return existsSync(getBinaryCachePath(platform));
}

export async function downloadBinary(platform: PlatformInfo): Promise<string> {
  const cachePath = getBinaryCachePath(platform);

  if (!existsSync(BINARIES_DIR)) {
    mkdirSync(BINARIES_DIR, { recursive: true });
  }

  // Try to get the latest release URL
  const releaseUrl = `https://github.com/${GITHUB_REPO}/releases/latest/download/${platform.binaryName}`;

  ui.item(`Downloading ${platform.binaryName}...`, "pending");

  try {
    // Use curl to download (available on macOS and most Linux)
    execSync(`curl -fSL "${releaseUrl}" -o "${cachePath}"`, {
      stdio: "pipe",
    });
    chmodSync(cachePath, 0o755);
    ui.item(`Downloaded ${platform.binaryName}`, "ok");
    return cachePath;
  } catch (error) {
    throw new Error(
      `Failed to download binary from ${releaseUrl}. ` +
        `Make sure the release exists and contains ${platform.binaryName}`,
      { cause: error }
    );
  }
}

export async function ensureBinaryForPlatform(
  platform: PlatformInfo
): Promise<string> {
  // Check if already cached
  if (isBinaryCached(platform)) {
    ui.item(`Using cached ${platform.binaryName}`, "ok");
    return getBinaryCachePath(platform);
  }

  // Check if local platform matches - can use current binary
  const localPlatform = detectLocalPlatform();
  if (
    platform.os === localPlatform.os &&
    platform.arch === localPlatform.arch
  ) {
    // Find the current running binary
    const currentBinary = process.argv[0];
    if (currentBinary && existsSync(currentBinary)) {
      ui.item("Using current binary (same platform)", "ok");
      return currentBinary;
    }
  }

  // Need to download
  return await downloadBinary(platform);
}

export function getLocalBinaryPath(): string | null {
  // When running as compiled binary, argv[0] is the binary itself
  const currentBinary = process.argv[0];
  if (currentBinary && existsSync(currentBinary)) {
    return currentBinary;
  }
  return null;
}
