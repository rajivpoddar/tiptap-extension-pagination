/**
 * @file /src/utils/paperOrientation.ts
 * @name PaperOrientation
 * @description Utility functions for paper orientations.
 */

import { EditorState } from "@tiptap/pm/state";
import { Node as PMNode } from "@tiptap/pm/model";
import { PAGE_NODE_PAPER_ORIENTATION_ATTR } from "../constants/page";
import { DEFAULT_PAPER_ORIENTATION } from "../constants/paper";
import { Nullable } from "../types/record";
import { getPageAttribute } from "./paper";
import { Editor } from "@tiptap/core";
import { Orientation } from "../types/paper";

/**
 * Get the paper orientation of a particular page node in the document.
 * @param pageNode - The page node to find the paper orientation for
 * @returns {Nullable<Orientation>} The paper orientation of the specified page or null
 * if the paper orientation is not set.
 */
export const getPageNodePaperOrientation = (pageNode: PMNode): Nullable<Orientation> => {
    const { attrs } = pageNode;
    return attrs[PAGE_NODE_PAPER_ORIENTATION_ATTR];
};

/**
 * Retrieves the paper orientation of a specific page using the editor instance.
 * Falls back to the default paper orientation if the page number is invalid.
 * @param editor - The current editor instance.
 * @param pageNum - The page number to retrieve the paper orientation for.
 * @returns {Orientation} The paper orientation of the specified page or default.
 */
export const getPageNumPaperOrientation = (editor: Editor, pageNum: number): Orientation => {
    const { state, commands } = editor;
    return getPageAttribute(state, pageNum, commands.getDefaultPaperOrientation, getPageNodePaperOrientation);
};

/**
 * Retrieves the paper orientation of a specific page using only the editor state.
 * Falls back to the default paper orientation if the page number is invalid.
 * @param state - The current editor state.
 * @param pageNum - The page number to retrieve the paper orientation for.
 * @returns {string} The paper orientation of the specified page or default.
 */
export const getPageNumPaperOrientationFromState = (state: EditorState, pageNum: number): Orientation => {
    return getPageAttribute(state, pageNum, () => DEFAULT_PAPER_ORIENTATION, getPageNodePaperOrientation);
};
