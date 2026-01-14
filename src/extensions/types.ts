export interface Extension {
  name: string;
  description: string;
  firewallDomains: string[];
}

export interface ExtensionConfig {
  name: string;
  description?: string;
  firewall?: {
    domains: string[];
  };
}
