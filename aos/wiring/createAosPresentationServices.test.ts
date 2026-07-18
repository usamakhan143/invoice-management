import { describe, expect, it, vi } from "vitest";

vi.mock("../infrastructure/wiring/createAosDeliveryReadPorts", () => ({
  createAosDeliveryReadPorts: vi.fn(() => ({
    customers: {},
    leads: {},
    users: {},
    initiatives: {},
  })),
}));

vi.mock("../infrastructure/firestore/wiring/createAosDeliveryRepositories", () => ({
  createAosDeliveryRepositories: vi.fn(() => ({
    engagements: {},
    templates: {},
    qualityReports: {},
  })),
}));

import { DeliveryApplicationService } from "../application/delivery/DeliveryApplicationService";
import { createAosPresentationServices } from "./createAosPresentationServices";

describe("createAosPresentationServices", () => {
  it("returns injected delivery service without infrastructure wiring", () => {
    const delivery = {
      getEngagement: vi.fn(),
    } as unknown as DeliveryApplicationService;

    const services = createAosPresentationServices({ delivery });

    expect(services.delivery).toBe(delivery);
  });

  it("constructs DeliveryApplicationService when using default wiring", () => {
    const services = createAosPresentationServices();
    expect(services.delivery).toBeInstanceOf(DeliveryApplicationService);
  });
});
