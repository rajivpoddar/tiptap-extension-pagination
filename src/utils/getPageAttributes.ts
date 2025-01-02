/**
 * @file /src/utils/getPageAttributes.ts
 * @name GetPageAttributes
 * @description Utility functions for getting page attributes.
 */

import { EditorState } from "@tiptap/pm/state";
import { PageNodeAttributes } from "../types/page";
import { getPageNumPaperSize } from "./paperSize";
import { getPageNumPaperColour } from "./paperColour";
import { getPageNumPaperOrientation } from "./paperOrientation";

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

    return { paperSize, paperColour, paperOrientation };
};
