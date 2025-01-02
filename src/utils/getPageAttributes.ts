/**
 * @file /src/utils/getPageAttributes.ts
 * @name GetPageAttributes
 * @description Utility functions for getting page attributes.
 */

import { EditorState } from "@tiptap/pm/state";
import { PageNodeAttributes } from "../types/page";
import { getPageNumPaperSizeFromState } from "./paperSize";
import { getPageNumPaperColourFromState } from "./paperColour";
import { getPageNumPaperOrientationFromState } from "./paperOrientation";

/**
 * Retrieves page attributes from the editor state.
 * @param state - The current editor state.
 * @param pageNum - The page number to retrieve the attributes for.
 * @returns {PageNodeAttributes} The attributes of the specified page.
 */
export const getPageAttributesFromState = (state: EditorState, pageNum: number): PageNodeAttributes => {
    let paperSize = getPageNumPaperSizeFromState(state, pageNum);
    let paperColour = getPageNumPaperColourFromState(state, pageNum);
    let paperOrientation = getPageNumPaperOrientationFromState(state, pageNum);

    return { paperSize, paperColour, paperOrientation };
};
