/**
 * @file /src/utils/getPageAttributes.ts
 * @name GetPageAttributes
 * @description Utility functions for getting page attributes.
 */

import { EditorState } from "@tiptap/pm/state";
import { PageNodeAttributes, PageContentPixelDimensions } from "../types/page";
import { calculatePageContentPixelDimensions, getPageNumPaperSize } from "./paperSize";
import { getPageNumPaperColour } from "./paperColour";
import { getPageNumPaperOrientation } from "./paperOrientation";
import { getPageNumPaperMargins } from "./paperMargins";
import { getPageNumPageBorders } from "./pageBorders";

/**
 * Retrieves page attributes from the editor state.
 * @param state - The current editor state.
 * @param pageNum - The page number to retrieve the attributes for.
 * @returns {PageNodeAttributes} The attributes of the specified page.
 */
export const getPageNodeAttributes = (state: EditorState, pageNum: number): PageNodeAttributes => {
    const paperSize = getPageNumPaperSize(state, pageNum);
    const paperColour = getPageNumPaperColour(state, pageNum);
    const paperOrientation = getPageNumPaperOrientation(state, pageNum);
    const pageMargins = getPageNumPaperMargins(state, pageNum);
    const pageBorders = getPageNumPageBorders(state, pageNum);

    return { paperSize, paperColour, paperOrientation, pageMargins, pageBorders };
};

/**
 * Retrieves the page node attributes and calculates the pixel dimensions of the page.
 * @param pageNodeAttributes - The attributes of the page node.
 * @returns { PageNodeAttributes, PagePixelDimensions } The attributes of the page node and the pixel dimensions of the page.
 */
export const getCalculatedPageNodeAttributes = (
    state: EditorState,
    pageNum: number
): { pageNodeAttributes: PageNodeAttributes; pagePixelDimensions: PageContentPixelDimensions } => {
    const pageNodeAttributes = getPageNodeAttributes(state, pageNum);
    const pagePixelDimensions = calculatePageContentPixelDimensions(pageNodeAttributes);
    return { pageNodeAttributes, pagePixelDimensions };
};
