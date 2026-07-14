import { describe, expect, it } from "vitest";
import { assertBridgeWriteTarget, BOS_ERP_BRIDGE_LAW } from "./erpBridge";

describe("erpBridge", () => {
  it("forbids writes to ERP collections", () => {
    for (const collection of BOS_ERP_BRIDGE_LAW.readOnlyErpCollections) {
      const result = assertBridgeWriteTarget(collection);
      expect(result.ok).toBe(false);
    }
  });

  it("allows bos sidecar collections", () => {
    for (const collection of BOS_ERP_BRIDGE_LAW.writeCollections) {
      const result = assertBridgeWriteTarget(collection);
      expect(result.ok).toBe(true);
    }
  });
});
