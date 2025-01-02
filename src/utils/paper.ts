/**
 * @file /src/utils/paper.ts
 * @name Paper
 * @description Utility functions for handling paper attributes in the editor.
 */

import { EditorState } from "@tiptap/pm/state";
import { Node as PMNode } from "@tiptap/pm/model";
import { Nullable } from "../types/record";
import { doesDocHavePageNodes, getLastPageNum, getPageNodeByPageNum, isPageNumInRange } from "./page";

/**
 * Handles cases where the given page number is out of range.
 * Logs a warning and falls back to the last page number.
 * @param state - The current editor state.
 * @param pageNum - The page number to validate.
 * @param fallbackFn - A function to determine the fallback value based on the last page number.
 * @returns {T} The result of the fallback function.
 */
const handleOutOfRangePageNum = <T>(state: EditorState, pageNum: number, fallbackFn: (state: EditorState, pageNum: number) => T): T => {
    console.warn("Page number:", pageNum, "is out of range for the document. Using last page.");
    const lastPageNum = getLastPageNum(state.doc);
    return fallbackFn(state, lastPageNum);
};

/**
 * Retrieves a specific attribute of a given page number.
 * Falls back to defaults if the page number is invalid or the attribute is missing.
 * @param state - The current editor state.
 * @param pageNum - The page number to retrieve the attribute for.
 * @param getDefault - A function to get the default value for the attribute.
 * @param getNodeAttribute - A function to extract the attribute from the page node.
 * @returns {T} The attribute of the specified page or default.
 */
export const getPageAttribute = <T>(
    state: EditorState,
    pageNum: number,
    getDefault: () => T,
    getNodeAttribute: (node: PMNode) => Nullable<T>
): T => {
    if (!doesDocHavePageNodes(state)) {
        return getDefault();
    }

    if (!isPageNumInRange(state.doc, pageNum)) {
        return handleOutOfRangePageNum(state, pageNum, (s, p) => getPageAttribute(s, p, getDefault, getNodeAttribute));
    }

    const pageNode = getPageNodeByPageNum(state.doc, pageNum);
    if (!pageNode) {
        return getDefault();
    }

    return getNodeAttribute(pageNode) ?? getDefault();
};
