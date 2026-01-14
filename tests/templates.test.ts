import { expect, test } from "bun:test";
import type { Agent } from "../src/agents/types.ts";
import type { Extension } from "../src/extensions/types.ts";
import { generateCompose } from "../src/templates/compose.ts";
import { generateDockerfile } from "../src/templates/dockerfile.ts";
import { generateEntrypoint } from "../src/templates/entrypoint.ts";
import { generateFirewall } from "../src/templates/firewall.ts";

const agentA: Agent = {
  name: "alpha",
  installCmd: "install alpha",
  versionCmd: "alpha --version",
  runCmd: "alpha",
  firewallDomains: ["api.example.com", "registry.example.com"],
  skipPermissionsFlag: "--skip",
  configPath: "/home/ccc/.alpha",
  getAuthInstructions: () => "auth",
  getDockerfileSnippet: () => "RUN install alpha",
};

const agentB: Agent = {
  name: "beta",
  installCmd: "install beta",
  versionCmd: "beta --version",
  runCmd: "beta",
  firewallDomains: ["api.example.com", "other.example.com"],
  getAuthInstructions: () => "auth",
  getDockerfileSnippet: () => "RUN install beta",
};

test("generateCompose includes home volume", () => {
  const compose = generateCompose({ agents: [agentA] });
  expect(compose).toContain("ccc-home:/home/ccc");
  expect(compose).toContain("name: ccc-home");
});

test("generateFirewall de-duplicates domains", () => {
  const firewall = generateFirewall({ agents: [agentA, agentB] });
  const count = (firewall.match(/api\.example\.com/g) || []).length;
  expect(count).toBe(1);
});

test("generateEntrypoint embeds version command", () => {
  const entrypoint = generateEntrypoint({ agents: [agentA] });
  expect(entrypoint).toContain(agentA.versionCmd);
});

test("generateDockerfile includes entrypoint", () => {
  const dockerfile = generateDockerfile({ agents: [agentA] });
  // Agents are now installed at runtime via entrypoint, not at build time
  expect(dockerfile).toContain("entrypoint.sh");
  expect(dockerfile).toContain("shpool"); // Session manager is always installed
});

const extensionA: Extension = {
  name: "takopi",
  description: "Telegram bot",
  firewallDomains: ["api.telegram.org"],
};

const extensionB: Extension = {
  name: "context7",
  description: "MCP server",
  firewallDomains: ["api.context7.com", "context7.com"],
};

test("generateFirewall includes extension domains", () => {
  const firewall = generateFirewall({ agents: [agentA], extensions: [extensionA] });
  expect(firewall).toContain("api.telegram.org");
});

test("generateFirewall includes user domains", () => {
  const firewall = generateFirewall({ agents: [agentA], userDomains: ["custom.example.com"] });
  expect(firewall).toContain("custom.example.com");
});

test("generateFirewall de-duplicates across agents, extensions, and user domains", () => {
  const firewall = generateFirewall({
    agents: [agentA],
    extensions: [{ ...extensionA, firewallDomains: ["api.example.com"] }],
    userDomains: ["api.example.com"],
  });
  const count = (firewall.match(/api\.example\.com/g) || []).length;
  expect(count).toBe(1);
});

test("generateFirewall merges all three sources", () => {
  const firewall = generateFirewall({
    agents: [agentA],
    extensions: [extensionA, extensionB],
    userDomains: ["myapi.example.com"],
  });
  expect(firewall).toContain("api.example.com"); // from agent
  expect(firewall).toContain("api.telegram.org"); // from takopi extension
  expect(firewall).toContain("api.context7.com"); // from context7 extension
  expect(firewall).toContain("myapi.example.com"); // from user
});
