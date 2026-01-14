export interface Agent {
  name: string;
  installCmd: string;
  versionCmd: string;
  runCmd: string;
  firewallDomains: string[];
  skipPermissionsFlag?: string;
  configPath?: string;
  authCheckFiles?: string[];
  getAuthInstructions(): string;
  getDockerfileSnippet(): string;
}

export interface AuthStatus {
  authenticated: boolean;
  method: "oauth" | "api_key" | "none";
  details?: string;
}

export interface AgentStatus {
  name: string;
  enabled: boolean;
  installed: boolean;
  version?: string;
  auth: AuthStatus;
}

export interface AgentConfig {
  name: string;
  description?: string;
  install_cmd: string;
  run_cmd: string;
  version_cmd: string;
  skip_permissions_flag?: string;
  config_path?: string;

  firewall?: {
    domains: string[];
  };

  auth?: {
    method: "oauth" | "api_key" | "none";
    instructions?: string;
    auth_check_files?: string[];
  };

  dockerfile?: {
    snippet?: string;
  };
}
