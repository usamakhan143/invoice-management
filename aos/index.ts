/**
 * Agentic Operating System (AOS) module — domain-first entry point.
 *
 * Stage A: scaffold — config, constants, ports, placeholder pages.
 * Stage B+: domain entities, repositories, application services.
 *
 * UI and ERP/BOS integration writes remain behind feature flags.
 */

export * from "./types";
export * from "./constants";
export * from "./config";
export * from "./domain";
export * from "./contracts";
export * from "./application";
export * from "./integration";
export * from "./infrastructure";
export * from "./presentation";
export * from "./shared";
export * from "./hooks";
export * from "./wiring";
export * from "./services";
export * from "./components";
export * from "./pages";
export * from "./utils";
