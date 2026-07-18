/**
 * Frozen import boundary rules — docs/aos-frontend-architecture/30_FRONTEND_ARCHITECTURE.md
 */
export interface ImportBoundaryRule {
  /** Path segment after aos/ (e.g. presentation/ui) */
  layer: string;
  /** Substrings that must not appear in import sources from files in this layer */
  forbiddenImportPatterns: string[];
}

export const AOS_IMPORT_BOUNDARY_RULES: readonly ImportBoundaryRule[] = [
  {
    layer: "presentation/ui",
    forbiddenImportPatterns: [
      "/application/",
      "/domain/",
      "/infrastructure/",
      "/contracts/",
      "firebase/firestore",
      "firebase/compat",
      "/wiring/",
    ],
  },
  {
    layer: "presentation/screens",
    forbiddenImportPatterns: [
      "/domain/",
      "/infrastructure/",
      "firebase/firestore",
      "firebase/compat",
    ],
  },
  {
    layer: "presentation/layouts",
    forbiddenImportPatterns: [
      "/domain/",
      "/infrastructure/",
      "firebase/firestore",
      "firebase/compat",
    ],
  },
  {
    layer: "presentation/gates",
    forbiddenImportPatterns: [
      "/domain/",
      "/infrastructure/",
      "firebase/firestore",
      "firebase/compat",
    ],
  },
  {
    layer: "hooks",
    forbiddenImportPatterns: [
      "/domain/",
      "/infrastructure/",
      "firebase/firestore",
      "firebase/compat",
      "/presentation/ui/",
      "/presentation/screens/",
    ],
  },
  {
    layer: "pages",
    forbiddenImportPatterns: [
      "/domain/",
      "/infrastructure/",
      "firebase/firestore",
      "firebase/compat",
      "/application/",
    ],
  },
] as const;

/**
 * wiring/ may import application + infrastructure (composition root).
 * presentation/providers/ may import wiring + application factories.
 */
export const AOS_IMPORT_BOUNDARY_EXEMPT_PREFIXES = [
  "aos/wiring/",
  "aos/presentation/providers/",
] as const;
