import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

export function setUser(cfg: Config, userName: string): void {
  cfg.currentUserName = userName;
  writeConfig(cfg);
}

export function readConfig(): Config {
  const filePath = getConfigFilePath();
  const rawData = fs.readFileSync(filePath, "utf-8");
  const rawConfig = JSON.parse(rawData);
  return validateConfig(rawConfig);
}

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function writeConfig(cfg: Config): void {
  const filePath = getConfigFilePath();
  const data = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function validateConfig(rawConfig: any): Config {
  if (!rawConfig || typeof rawConfig !== "object") {
    throw new Error("Invalid config");
  }
  if (typeof rawConfig.db_url !== "string") {
    throw new Error("Invalid db_url");
  }
  return {
    dbUrl: rawConfig.db_url,
    currentUserName: rawConfig.current_user_name,
  };
}
