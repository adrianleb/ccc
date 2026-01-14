import * as TOML from "@iarna/toml";
import type { ExtensionConfig } from "./types.ts";

// @ts-ignore - Bun supports this import syntax
import takopiToml from "../../extensions/takopi.toml" with { type: "text" };
// @ts-ignore
import context7Toml from "../../extensions/context7.toml" with { type: "text" };

export interface ExtensionTemplate {
  name: string;
  description: string;
  content: string;
}

function parseTemplate(content: string): ExtensionTemplate {
  const parsed = TOML.parse(content) as ExtensionConfig;
  return {
    name: parsed.name,
    description: parsed.description || parsed.name,
    content,
  };
}

const EXTENSION_TEMPLATES: ExtensionTemplate[] = [
  parseTemplate(takopiToml),
  parseTemplate(context7Toml),
];

export function getAvailableExtensionTemplates(): ExtensionTemplate[] {
  return EXTENSION_TEMPLATES;
}

export function getExtensionTemplate(name: string): ExtensionTemplate | undefined {
  return EXTENSION_TEMPLATES.find((t) => t.name === name);
}
