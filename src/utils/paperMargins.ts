/**
 * @file /src/utils/paperMargins.ts
 * @name PaperMargins
 * @description Utility functions for paper margins.
 */

import { Dispatch, Editor } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { EditorState, Transaction } from "@tiptap/pm/state";
import { DEFAULT_MARGIN_CONFIG } from "../constants/paper";
import { PAGE_NODE_ATTR_KEYS } from "../constants/page";
import { MarginConfig } from "../types/paper";
import { Nullable } from "../types/record";
import { getPageAttribute, isPageNode } from "./page";
import { setPageNodeAttribute } from "./setPageAttributes";

/**
 * Checks if the paper margins are valid.
 * Margins must be non-negative and finite to be considered valid.
 * @param paperMargins - The paper margins to check.
 * @returns {boolean} True if the paper margins are valid, false otherwise.
 */
export const isValidPaperMargins = (paperMargins: MarginConfig): boolean => {
    return Object.values(paperMargins).every((margin) => margin >= 0 && isFinite(margin));
};

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

/**
 * Set the paper margins of a page node.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param pagePos - The position of the page node to set the paper margins for.
 * @param pageNode - The page node to set the paper margins for.
 * @param paperMargins - The paper margins to set.
 * @returns {boolean} True if the paper margins were set, false otherwise.
 */
export const setPageNodePosPaperMargins = (
    tr: Transaction,
    dispatch: Dispatch,
    pagePos: number,
    pageNode: PMNode,
    paperMargins: MarginConfig
): boolean => {
    if (!dispatch) return false;

    if (!isValidPaperMargins(paperMargins)) {
        console.warn("Invalid paper margins", paperMargins);
        return false;
    }

    if (!isPageNode(pageNode)) {
        console.error("Unexpected! Node at pos:", pagePos, "is not a page node!");
        return false;
    }

    if (getPageNodePaperMargins(pageNode) === paperMargins) {
        return false;
    }

    setPageNodeAttribute(tr, pagePos, pageNode, PAGE_NODE_ATTR_KEYS.paperMargins, paperMargins);

    dispatch(tr);
    return true;
};
