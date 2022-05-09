import * as fs from "fs";
import { Language } from "@cdktf/provider-generator";
import { findFileAboveCwd } from "../bin/cmds/helper/utilities";
import { Errors } from "./errors";
import path from "path";
import { logger } from "./logging";

export type ProviderDependencySpec = {
  name: string;
  source: string;
  version?: string;
  namespace?: string;
};

// TODO: move this to some common package from where it is used by @cdktf/provider-generator, cdktf, and cdktf-cli
// (might end up in cdktf)
export class CdktfConfig {
  constructor(private cdktfConfigPath: string) {}

  private readCdktfConfig(): Record<string, unknown> {
    const cdktfConfig = require(this.cdktfConfigPath);
    if (typeof cdktfConfig !== "object" || cdktfConfig === null) {
      throw Errors.External(
        "cdktf.json is malformed. The root must be a JSON object."
      ); // TODO: define a schema and validate against it
    }
    return cdktfConfig;
  }

  private writeCdktfConfig(cdktfConfig: Record<string, unknown>) {
    const cdktfConfigString = JSON.stringify(cdktfConfig, null, 2);
    fs.writeFileSync(this.cdktfConfigPath, cdktfConfigString);
  }

  private getProperty(property: string): unknown {
    const cdktfConfig = this.readCdktfConfig();
    return cdktfConfig[property];
  }

  public get language(): Language {
    const rawLanguage = this.getProperty("language");
    const language = Object.values(Language).find(
      (value) => value === rawLanguage
    );
    if (!language)
      throw Errors.Usage(
        `${rawLanguage} is not a valid language. It must be one of ${Object.values(
          Language
        )}`
      );

    return language;
  }

  public get terraformProviders(): (ProviderDependencySpec | string)[] {
    const providers = this.getProperty("terraformProviders");
    if (!Array.isArray(providers)) return [];
    return providers;
  }

  public writeTerraformProviders(
    providers: (ProviderDependencySpec | string)[]
  ) {
    const cdktfConfig = this.readCdktfConfig();
    cdktfConfig.terraformProviders = providers;
    this.writeCdktfConfig(cdktfConfig);
  }

  public get projectDirectory(): string {
    return path.dirname(this.cdktfConfigPath);
  }

  public static read(path: string = process.cwd()): CdktfConfig {
    const cdktfConfigPath = findFileAboveCwd("cdktf.json", path);
    if (!cdktfConfigPath) {
      throw Errors.External(
        "Could not find cdktf.json. Make sure there is a cdktf.json file in the current directory or one of its parents."
      );
    }
    logger.trace(`cdktf.json found at ${cdktfConfigPath}`);

    return new CdktfConfig(cdktfConfigPath);
  }
}
