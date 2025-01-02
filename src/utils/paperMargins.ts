/**
 * @file /src/utils/paperMargins.ts
 * @name PaperMargins
 * @description Utility functions for paper margins.
 */

import { Editor } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { DEFAULT_MARGIN_CONFIG } from "../constants/paper";
import { PAGE_NODE_ATTR_KEYS } from "../constants/page";
import { MarginConfig } from "../types/paper";
import { Nullable } from "../types/record";
import { getPageAttribute } from "./page";

/**
 * Get the paper margins from a page node.
 * @param pageNode - The page node to get the paper margins from.
 * @returns {Nullable<MarginConfig>} The paper margins of the specified page.
 */
export const getPageNodePaperMargins = (pageNode: PMNode): Nullable<MarginConfig> => {
    const { attrs } = pageNode;
    return attrs[PAGE_NODE_ATTR_KEYS.paperMargins];
};

/**
 * Retrieves the paper margin config of a specific page using the editor instance.
 * Falls back to the default paper margin config if the page number is invalid.
 * @param context - The current editor instance or editor state.
 * @param pageNum - The page number to retrieve the paper margin config for.
 * @returns {PaperOrientation} The paper margin config of the specified page or default.
 */
export const getPageNumPaperMargins = (context: Editor | EditorState, pageNum: number): MarginConfig => {
    const getDefault = context instanceof Editor ? context.commands.getDefaultPaperMargins : () => DEFAULT_MARGIN_CONFIG;
    return getPageAttribute(context, pageNum, getDefault, getPageNodePaperMargins);
};
