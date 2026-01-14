import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import * as TOML from "@iarna/toml";
import type { Extension, ExtensionConfig } from "./types.ts";
import { getExtensionTemplate, getAvailableExtensionTemplates, type ExtensionTemplate } from "./templates.ts";

const EXTENSIONS_DIR = join(homedir(), ".config", "ccc", "extensions");

function configToExtension(config: ExtensionConfig): Extension {
  return {
    name: config.name,
    description: config.description || config.name,
    firewallDomains: config.firewall?.domains || [],
  };
}

export function loadExtensions(): Record<string, Extension> {
  const extensions: Record<string, Extension> = {};

  if (!existsSync(EXTENSIONS_DIR)) {
    return extensions;
  }

  try {
    const files = readdirSync(EXTENSIONS_DIR).filter((f) => f.endsWith(".toml"));

    for (const file of files) {
      try {
        const filePath = join(EXTENSIONS_DIR, file);
        const content = readFileSync(filePath, "utf-8");
        const config = TOML.parse(content) as unknown as ExtensionConfig;

        if (!config.name) {
          console.warn(`Skipping ${file}: missing required field (name)`);
          continue;
        }

        extensions[config.name] = configToExtension(config);
      } catch (err) {
        console.warn(`Failed to load extension from ${file}:`, err);
      }
    }
  } catch {}

  return extensions;
}

export function getExtensionsDir(): string {
  return EXTENSIONS_DIR;
}

export function listAvailableExtensions(): ExtensionTemplate[] {
  return getAvailableExtensionTemplates();
}

export function enableExtensions(names: string[]): string[] {
  if (!existsSync(EXTENSIONS_DIR)) {
    mkdirSync(EXTENSIONS_DIR, { recursive: true });
  }

  const enabled: string[] = [];

  for (const name of names) {
    const template = getExtensionTemplate(name);
    if (!template) {
      console.warn(`Unknown extension template: ${name}`);
      continue;
    }

    const filePath = join(EXTENSIONS_DIR, `${name}.toml`);
    writeFileSync(filePath, template.content);
    enabled.push(name);
  }

  return enabled;
}

export function disableExtension(name: string): boolean {
  const filePath = join(EXTENSIONS_DIR, `${name}.toml`);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    return true;
  }
  return false;
}

export function isExtensionEnabled(name: string): boolean {
  return existsSync(join(EXTENSIONS_DIR, `${name}.toml`));
}
