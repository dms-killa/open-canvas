// Re-export barrel for reflection utilities.
// Canonical implementations live in ./lib/reflections.ts to prevent
// circular dependencies between reflection.ts <-> reflections/index.ts.
export {
  ensureStoreInConfig,
  formatReflections,
  getFormattedReflections,
} from "./lib/reflections";
