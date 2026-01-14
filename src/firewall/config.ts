import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as TOML from "@iarna/toml";
import { ensureConfigDir } from "../config.ts";

const FIREWALL_CONFIG_FILE = join(homedir(), ".config", "ccc", "firewall.toml");

export interface FirewallConfig {
  domains: string[];
}

const DEFAULT_FIREWALL_CONFIG: FirewallConfig = {
  domains: [],
};

export function loadFirewallConfig(): FirewallConfig {
  ensureConfigDir();

  if (!existsSync(FIREWALL_CONFIG_FILE)) {
    return { ...DEFAULT_FIREWALL_CONFIG };
  }

  try {
    const content = readFileSync(FIREWALL_CONFIG_FILE, "utf-8");
    const parsed = TOML.parse(content) as unknown as FirewallConfig;
    return {
      domains: parsed.domains || [],
    };
  } catch (error) {
    console.error(`Warning: Could not parse firewall config: ${error}`);
    return { ...DEFAULT_FIREWALL_CONFIG };
  }
}

export function saveFirewallConfig(config: FirewallConfig): void {
  ensureConfigDir();
  const content = TOML.stringify(config as unknown as TOML.JsonMap);
  writeFileSync(FIREWALL_CONFIG_FILE, content);
}

export function getUserFirewallDomains(): string[] {
  return loadFirewallConfig().domains;
}

export function addUserFirewallDomain(domain: string): boolean {
  const config = loadFirewallConfig();

  // Normalize domain (lowercase, no trailing slash)
  const normalized = domain.toLowerCase().replace(/\/+$/, "");

  if (config.domains.includes(normalized)) {
    return false; // Already exists
  }

  config.domains.push(normalized);
  config.domains.sort();
  saveFirewallConfig(config);
  return true;
}

export function removeUserFirewallDomain(domain: string): boolean {
  const config = loadFirewallConfig();
  const normalized = domain.toLowerCase().replace(/\/+$/, "");

  const index = config.domains.indexOf(normalized);
  if (index === -1) {
    return false; // Not found
  }

  config.domains.splice(index, 1);
  saveFirewallConfig(config);
  return true;
}

export function getFirewallConfigPath(): string {
  return FIREWALL_CONFIG_FILE;
}
