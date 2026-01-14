import { execSync, spawnSync } from "child_process";
import type { Agent, AgentConfig, AuthStatus } from "./types.ts";

const DEFAULT_CONTAINER_NAME = "ccc";

export interface AuthCheckOptions {
  containerName?: string;
  host?: string | null; // null = local, string = remote
}

/**
 * Check auth status by looking for config files in container volume
 */
export function checkAuthStatus(
  agent: Agent,
  config: AgentConfig,
  options: AuthCheckOptions = {}
): AuthStatus {
  const { containerName = DEFAULT_CONTAINER_NAME, host = null } = options;

  const authMethod = config.auth?.method || "none";
  const authCheckFiles = config.auth?.auth_check_files || agent.authCheckFiles || [];

  if (authMethod === "none") {
    return { authenticated: true, method: "none", details: "No auth required" };
  }

  if (!agent.configPath) {
    return { authenticated: false, method: authMethod, details: "No config path" };
  }

  if (authCheckFiles.length === 0) {
    return { authenticated: false, method: authMethod, details: "No auth check files configured" };
  }

  // Check each auth file in the container
  for (const file of authCheckFiles) {
    const fullPath = `${agent.configPath}/${file}`;
    const checkCmd = `test -f "${fullPath}" && echo "exists" || echo "missing"`;
    const dockerCmd = `docker exec ${containerName} sh -c '${checkCmd}'`;

    try {
      let result: string;
      if (host) {
        result = execSync(`ssh ${host} "${dockerCmd}"`, {
          encoding: "utf-8",
          stdio: "pipe",
        }).trim();
      } else {
        result = execSync(dockerCmd, {
          encoding: "utf-8",
          stdio: "pipe",
        }).trim();
      }

      if (result === "exists") {
        return {
          authenticated: true,
          method: authMethod,
          details: authMethod === "oauth" ? "Session active" : "API key configured",
        };
      }
    } catch {
      // Continue checking other files
    }
  }

  return {
    authenticated: false,
    method: authMethod,
    details: authMethod === "oauth" ? "Not authenticated" : "API key required",
  };
}

/**
 * Check if agent binary is installed in container
 */
export function checkAgentInstalled(
  agent: Agent,
  options: AuthCheckOptions = {}
): { installed: boolean; version?: string } {
  const { containerName = DEFAULT_CONTAINER_NAME, host = null } = options;

  // Use bash -c to inherit Docker ENV PATH (npm-global, cargo, etc.)
  const dockerCmd = `docker exec ${containerName} bash -c '${agent.versionCmd} 2>/dev/null || echo "__NOT_INSTALLED__"'`;

  try {
    let result: string;
    if (host) {
      result = execSync(`ssh ${host} "${dockerCmd}"`, {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();
    } else {
      result = execSync(dockerCmd, {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();
    }

    if (result === "__NOT_INSTALLED__" || result === "") {
      return { installed: false };
    }

    // Extract version - often first line, maybe with prefix
    const firstLine = result.split("\n")[0] || result;
    return { installed: true, version: firstLine };
  } catch {
    return { installed: false };
  }
}

/**
 * Install agent in running container (hot-add)
 */
export function installAgentInContainer(
  agent: Agent,
  options: AuthCheckOptions = {}
): boolean {
  const { containerName = DEFAULT_CONTAINER_NAME, host = null } = options;

  // Use bash -c to inherit Docker ENV PATH
  const dockerCmd = `docker exec ${containerName} bash -c '${agent.installCmd}'`;

  try {
    if (host) {
      spawnSync("ssh", [host, dockerCmd], { stdio: "inherit" });
    } else {
      spawnSync("docker", ["exec", containerName, "bash", "-c", agent.installCmd], {
        stdio: "inherit",
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Run interactive auth in container
 */
export function runAgentAuth(
  agent: Agent,
  config: AgentConfig,
  options: AuthCheckOptions = {}
): boolean {
  const { containerName = DEFAULT_CONTAINER_NAME, host = null } = options;

  // Use auth_cmd if specified, otherwise fall back to run_cmd
  const authCmd = agent.authCmd || agent.runCmd;

  try {
    if (host) {
      // Use ssh -t for TTY allocation
      spawnSync("ssh", ["-t", host, `docker exec -it ${containerName} ${authCmd}`], {
        stdio: "inherit",
      });
    } else {
      // Run through bash -ic (interactive, non-login) to get TTY while keeping Docker ENV PATH
      spawnSync("docker", ["exec", "-it", containerName, "bash", "-ic", authCmd], {
        stdio: "inherit",
      });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if remote container is running
 */
export function checkRemoteContainerRunning(host: string, containerName = DEFAULT_CONTAINER_NAME): boolean {
  try {
    const result = execSync(
      `ssh ${host} "docker inspect -f '{{.State.Running}}' ${containerName} 2>/dev/null"`,
      { encoding: "utf-8", stdio: "pipe" }
    );
    return result.trim() === "true";
  } catch {
    return false;
  }
}
