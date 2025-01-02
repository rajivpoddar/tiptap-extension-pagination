/**
 * @file /src/utils/getPageAttributes.ts
 * @name GetPageAttributes
 * @description Utility functions for getting page attributes.
 */

import { EditorState } from "@tiptap/pm/state";
import { PageNodeAttributes, PagePixelDimensions } from "../types/page";
import { calculatePagePixelDimensions, getPageNumPaperSize } from "./paperSize";
import { getPageNumPaperColour } from "./paperColour";
import { getPageNumPaperOrientation } from "./paperOrientation";
import { getPageNumPaperMargins } from "./paperMargins";

/**
 * Retrieves page attributes from the editor state.
 * @param state - The current editor state.
 * @param pageNum - The page number to retrieve the attributes for.
 * @returns {PageNodeAttributes} The attributes of the specified page.
 */
export const getPageNodeAttributes = (state: EditorState, pageNum: number): PageNodeAttributes => {
    let paperSize = getPageNumPaperSize(state, pageNum);
    let paperColour = getPageNumPaperColour(state, pageNum);
    let paperOrientation = getPageNumPaperOrientation(state, pageNum);
    let margins = getPageNumPaperMargins(state, pageNum);

    return { paperSize, paperColour, paperOrientation, margins };
};

/**
 * Retrieves the page node attributes and calculates the pixel dimensions of the page.
 * @param pageNodeAttributes - The attributes of the page node.
 * @returns { PageNodeAttributes, PagePixelDimensions } The attributes of the page node and the pixel dimensions of the page.
 */
export const getCalculatedPageNodeAttributes = (
    state: EditorState,
    pageNum: number
): { pageNodeAttributes: PageNodeAttributes; pagePixelDimensions: PagePixelDimensions } => {
    const pageNodeAttributes = getPageNodeAttributes(state, pageNum);
    const pagePixelDimensions = calculatePagePixelDimensions(pageNodeAttributes);
    return { pageNodeAttributes, pagePixelDimensions };
};
