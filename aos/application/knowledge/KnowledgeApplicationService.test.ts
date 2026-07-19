import { describe, expect, it } from "vitest";
import { AGENCY_TYPE } from "../../constants/agencyType";
import { KnowledgeApplicationService } from "./KnowledgeApplicationService";
import { filterAndRankKnowledgeItems } from "./knowledgeSearch";
import { getKnowledgeSeedCatalog, toKnowledgeListItem } from "./knowledgeSeed";

describe("filterAndRankKnowledgeItems", () => {
  const items = getKnowledgeSeedCatalog().map(toKnowledgeListItem);

  it("ranks exact pattern ID matches first", () => {
    const result = filterAndRankKnowledgeItems(items, "kp-auth-gates");
    expect(result[0]?.patternId).toBe("kp-auth-gates");
  });

  it("returns empty when search is below minimum length", () => {
    expect(filterAndRankKnowledgeItems(items, "a")).toEqual([]);
  });
});

describe("KnowledgeApplicationService", () => {
  const scope = { companyId: "co1" };
  const service = new KnowledgeApplicationService();

  it("lists knowledge filtered by agency type", async () => {
    const result = await service.listKnowledge(scope, { agencyType: AGENCY_TYPE.MOBILE });
    expect(result.items.every((item) => item.agencyTypes.includes(AGENCY_TYPE.MOBILE))).toBe(true);
  });

  it("returns knowledge detail by pattern ID", async () => {
    const detail = await service.getKnowledge(scope, "kp-form-a11y");
    expect(detail?.title).toBe("Form accessibility checklist");
    expect(detail?.relatedModules.length).toBeGreaterThan(0);
  });

  it("returns null for unknown pattern", async () => {
    expect(await service.getKnowledge(scope, "missing-pattern")).toBeNull();
  });
});
