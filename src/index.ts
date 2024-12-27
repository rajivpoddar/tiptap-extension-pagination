/**
 * @file /src/index.ts
 * @name Index
 * @description Main entry point for the package
 */

// === Extensions ===
export default "./PaginationExtension";

// === Types ===

export type { PaperSize } from "./types/paper";

// === Constants ===
export { DEFAULT_PAPER_SIZE } from "./constants/paper";

export { getDefaultPaperColour } from "./utils/paper";

// === Nodes ===
import PageNode from "./Nodes/Page";

// === Exports ===
export { PageNode };
