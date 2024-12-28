/**
 * @file /src/utils/paper.ts
 * @name Paper
 * @description Utility functions for paper size calculations
 */

import { Transaction } from "@tiptap/pm/state";
import { Dispatch } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { DEFAULT_PAPER_SIZE, paperDimensions } from "../constants/paper";
import { DARK_THEME } from "../constants/theme";
import { PaperDimensions, PaperSize } from "../types/paper";
import { getDeviceTheme } from "./theme";
import { getPageNodeByPageNum, getPageNodePosByPageNum, isPageNode, setPageNodeAttribute, setPageNodesAttribute } from "./page";
import { Nullable } from "./record";
import { nodeHasAttribute } from "./node";
import { PAGE_NODE_PAPER_SIZE_ATTR } from "../constants/page";

/**
 * Check if the given paper size is valid.
 * @param paperSize - The paper size to check.
 * @returns {boolean} True if the paper size is valid, false otherwise.
 */
export const isValidPaperSize = (paperSize: PaperSize): boolean => {
    return paperSize in paperDimensions;
};

/**
 * Given a paper size, return the dimensions of the paper
 * @param paperSize - The paper size
 * @returns {PaperDimensions} - The dimensions of the paper
 */
export const getPaperDimensions = (paperSize: PaperSize): PaperDimensions => {
    if (!isValidPaperSize(paperSize)) {
        paperSize = DEFAULT_PAPER_SIZE;
    }

    return paperDimensions[paperSize];
};

/**
 * Get the default paper colour based on the device theme
 * @returns {string} The default paper colour
 */
export const getDefaultPaperColour = (): string => {
    return getDeviceTheme() === DARK_THEME ? "#222" : "#fff";
};

/**
 * Check if a page node has a paper size attribute.
 * @param pageNode - The page node to check.
 * @returns {boolean} True if the page node has a paper size attribute, false otherwise.
 */
export const pageNodeHasPageSize = (pageNode: PMNode): boolean => {
    return nodeHasAttribute(pageNode, PAGE_NODE_PAPER_SIZE_ATTR);
};

/**
 * Get the paper size of a particular page node in the document.
 * @param pageNode - The page node to find the paper size for
 * @returns {Nullable<PaperSize>} The paper size of the specified page or null
 * if the page could not be found.
 */
const getPageNodePaperSize = (pageNode: PMNode): Nullable<PaperSize> => {
    const { attrs } = pageNode;
    return attrs.paperSize;
};

/**
 * Get the paper size of a particular page in the document.
 * @param doc - The current document
 * @param pageNum - The page number to find the paper size for
 * @returns {Nullable<PaperSize>} The paper size of the specified page or null
 * if the page could not be found.
 */
export const getPageNumPaperSize = (doc: PMNode, pageNum: number): Nullable<PaperSize> => {
    const { children } = doc;
    const numPagesInDoc = children.length;

    if (pageNum < numPagesInDoc) {
        const pageNode = getPageNodeByPageNum(doc, pageNum);
        if (!pageNode) {
            console.error("Unexpected! Doc child num:", pageNum, "is not a page node!");
            return DEFAULT_PAPER_SIZE;
        }

        if (pageNodeHasPageSize(pageNode)) {
            return getPageNodePaperSize(pageNode);
        }
    }

    return null;
};

/**
 * Set the paper size for a particular page in the document.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param pageNum - The page number to set the paper size for.
 * @param paperSize - The paper size to set.
 * @returns {boolean} True if the paper size was set, false otherwise.
 */
export const setPageNumPaperSize = (tr: Transaction, dispatch: Dispatch, pageNum: number, paperSize: PaperSize): boolean => {
    const { doc } = tr;

    const pageNodePos = getPageNodePosByPageNum(doc, pageNum);
    if (!pageNodePos) {
        return false;
    }

    const { pos: pagePos, node: pageNode } = pageNodePos;

    return setPageNodePosPaperSize(tr, dispatch, pagePos, pageNode, paperSize);
};

/**
 * Set the paper size for a page node at the specified position.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param pagePos - The position of the page node to set the paper size for.
 * @param paperSize - The paper size to set.
 * @returns {boolean} True if the paper size was set, false otherwise.
 */
export const setPagePaperSize = (tr: Transaction, dispatch: Dispatch, pagePos: number, paperSize: PaperSize): boolean => {
    const pageNode = tr.doc.nodeAt(pagePos);
    if (!pageNode) {
        console.error("No node found at pos:", pagePos);
        return false;
    }

    return setPageNodePosPaperSize(tr, dispatch, pagePos, pageNode, paperSize);
};

/**
 * Helper to set the paper size for a page node at the specified position.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param pagePos - The position of the page node to set the paper size for.
 * @param pageNode - The page node to set the paper size for.
 * @param paperSize - The paper size to set.
 * @returns {boolean} True if the paper size was set, false otherwise.
 */
const setPageNodePosPaperSize = (tr: Transaction, dispatch: Dispatch, pagePos: number, pageNode: PMNode, paperSize: PaperSize): boolean => {
    if (!dispatch) return false;

    if (!isValidPaperSize(paperSize)) {
        console.warn(`Invalid paper size: ${paperSize}`);
        return false;
    }

    if (!isPageNode(pageNode)) {
        console.error("Unexpected! Node at pos:", pagePos, "is not a page node!");
        return false;
    }

    if (getPageNodePaperSize(pageNode) === paperSize) {
        // Paper size is already set
        return false;
    }

    setPageNodeAttribute(tr, pagePos, pageNode, PAGE_NODE_PAPER_SIZE_ATTR, paperSize);

    dispatch(tr);
    return true;
};

/**
 * Set the given paper size for the document to all page nodes.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param paperSize - The paper size to set.
 * @returns {boolean} True if the paper size was set, false otherwise.
 */
export const setDocumentPaperSize = (tr: Transaction, dispatch: Dispatch, paperSize: PaperSize): boolean => {
    if (!dispatch) return false;

    if (!isValidPaperSize(paperSize)) {
        console.warn(`Invalid paper size: ${paperSize}`);
        return false;
    }

    setPageNodesAttribute(tr, PAGE_NODE_PAPER_SIZE_ATTR, paperSize);

    dispatch(tr);
    return true;
};

/**
 * Set the given paper colour for the document.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param paperColour - The paper colour to set.
 * @returns {boolean} True if the paper colour was set, false otherwise.
 */
export const setDocumentPaperColour = (tr: Transaction, dispatch: Dispatch, paperColour: string): boolean => {
    if (!dispatch) return false;

    setPageNodesAttribute(tr, "paperColour", paperColour);

    dispatch(tr);
    return true;
};
