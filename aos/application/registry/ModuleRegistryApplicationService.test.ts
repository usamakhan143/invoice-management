import { describe, expect, it } from "vitest";
import { AGENCY_TYPE } from "../../constants/agencyType";
import { ModuleRegistryApplicationService } from "./ModuleRegistryApplicationService";
import { filterAndRankRegistryModules } from "./registrySearch";
import { getModuleRegistrySeedCatalog, toRegistryListItem } from "./moduleRegistrySeed";

describe("filterAndRankRegistryModules", () => {
  const modules = getModuleRegistrySeedCatalog().map(toRegistryListItem);

  it("ranks exact module ID matches first", () => {
    const result = filterAndRankRegistryModules(modules, "auth-firebase-v2");
    expect(result[0]?.moduleId).toBe("auth-firebase-v2");
  });

  it("returns empty when search is below minimum length", () => {
    expect(filterAndRankRegistryModules(modules, "a")).toEqual([]);
  });
});

import { InMemoryModuleRegistryRepository } from "../../infrastructure/testing/inMemoryCatalogRepositories";

describe("ModuleRegistryApplicationService", () => {
  const scope = { companyId: "co1" };
  const service = new ModuleRegistryApplicationService({
    repository: new InMemoryModuleRegistryRepository(),
  });

  it("lists modules with agency and status filters", async () => {
    const result = await service.listModules(scope, {
      agencyType: AGENCY_TYPE.MOBILE,
      status: "stable",
    });

    expect(result.items.every((item) => item.agencyTypes.includes(AGENCY_TYPE.MOBILE))).toBe(true);
    expect(result.items.every((item) => item.status === "stable")).toBe(true);
  });

  it("returns module detail by ID", async () => {
    const detail = await service.getModule(scope, "form-field-kit");
    expect(detail?.moduleName).toBe("Form Field Kit");
    expect(detail?.usageHistory.length).toBeGreaterThan(0);
  });

  it("returns null for unknown module", async () => {
    expect(await service.getModule(scope, "missing-module")).toBeNull();
  });
});
