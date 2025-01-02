/**
 * @file /src/index.ts
 * @name Index
 * @description Main entry point for the package
 */

// === Extensions ===
import PaginationExtension from "./PaginationExtension";

// === Types ===

export type { PaperSize, PaperOrientation, PaperOrientationSelect } from "./types/paper";

// === Constants ===
export {
    DEFAULT_PAPER_SIZE,
    paperSizes,
    paperDimensions,
    DEFAULT_PAPER_ORIENTATION,
    paperOrientationsSelect,
    LIGHT_PAPER_COLOUR,
    DARK_PAPER_COLOUR,
    DEFAULT_PAPER_COLOUR,
    DEFAULT_MARGIN_CONFIG,
} from "./constants/paper";

// === Nodes ===
import PageNode from "./Nodes/Page";

// === Utils ===
export { isPageNode } from "./utils/page";
export { getPageNumber } from "./utils/pagination";
export { getPageNumPaperSize } from "./utils/paperSize";
export { getPageNumPaperColour } from "./utils/paperColour";
export { getPageNumPaperOrientation } from "./utils/paperOrientation";

// === Exports ===
export { PageNode };

export default PaginationExtension;
