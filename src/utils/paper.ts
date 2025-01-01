/**
 * @file /src/utils/paper.ts
 * @name Paper
 * @description Utility functions for paper size calculations
 */

import { Transaction } from "@tiptap/pm/state";
import { Dispatch } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { DARK_PAPER_COLOUR, DEFAULT_PAPER_SIZE, LIGHT_PAPER_COLOUR, paperDimensions } from "../constants/paper";
import { DARK_THEME } from "../constants/theme";
import { PAGE_NODE_PAPER_COLOUR_ATTR, PAGE_NODE_PAPER_SIZE_ATTR } from "../constants/page";
import { PaperDimensions, PaperSize } from "../types/paper";
import { PagePixelDimensions } from "../types/page";
import { Nullable } from "../types/record";
import { getDeviceTheme } from "./theme";
import { getPageNodeByPageNum, isPageNode, setPageNodeAttribute } from "./page";
import { mmToPixels } from "./window";
import { nodeHasAttribute } from "./node";
import { isValidColour } from "./colour";

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
 * Calculates the pixel width and height of a given paper size.
 * @param paperSize - The paper size to calculate the dimensions for.
 * @returns {PagePixelDimensions} The height and width of the A4 page in pixels.
 */
export const calculatePagePixelDimensions = (paperSize: PaperSize): PagePixelDimensions => {
    const paperDimensions = getPaperDimensions(paperSize);
    const { width, height } = paperDimensions;
    const pageHeight = mmToPixels(height);
    const pageWidth = mmToPixels(width);

    return { pageHeight, pageWidth };
};

/**
 * Get the paper colour based on the device theme.
 * @returns {string} The paper colour based on the device theme.
 */
export const getDeviceThemePaperColour = (): string => {
    return getDeviceTheme() === DARK_THEME ? DARK_PAPER_COLOUR : LIGHT_PAPER_COLOUR;
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
 * Check if a page node has a paper colour attribute.
 * @param pageNode - The page node to check.
 * @returns {boolean} True if the page node has a paper colour attribute, false otherwise.
 */
export const pageNodeHasPaperColour = (pageNode: PMNode): boolean => {
    return nodeHasAttribute(pageNode, PAGE_NODE_PAPER_COLOUR_ATTR);
};

/**
 * Get the paper size of a particular page node in the document.
 * @param pageNode - The page node to find the paper size for
 * @returns {Nullable<PaperSize>} The paper size of the specified page or null
 * if the paper size is not set.
 */
const getPageNodePaperSize = (pageNode: PMNode): Nullable<PaperSize> => {
    const { attrs } = pageNode;
    return attrs[PAGE_NODE_PAPER_SIZE_ATTR];
};

/**
 * Get the paper colour of a particular page node in the document.
 * @param pageNode - The page node to find the paper colour for
 * @returns {Nullable<string>} The paper colour of the specified page or null
 * if the paper colour is not set.
 */
const getPageNodePaperColour = (pageNode: PMNode): Nullable<string> => {
    const { attrs } = pageNode;
    return attrs[PAGE_NODE_PAPER_COLOUR_ATTR];
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
 * Get the paper colour of a particular page in the document.
 * @param doc - The current document
 * @param pageNum - The page number to find the paper colour for
 * @returns {string} The paper colour of the specified page or the default paper colour.
 */
export const getPageNumPaperColour = (doc: PMNode, pageNum: number): string => {
    const { children } = doc;
    const numPagesInDoc = children.length;

    if (pageNum < numPagesInDoc) {
        const pageNode = getPageNodeByPageNum(doc, pageNum);
        if (!pageNode) {
            console.error("Unexpected! Doc child num:", pageNum, "is not a page node!");
            return LIGHT_PAPER_COLOUR;
        }

        if (pageNodeHasPaperColour(pageNode)) {
            return getPageNodePaperColour(pageNode) || LIGHT_PAPER_COLOUR;
        }
    }

    return LIGHT_PAPER_COLOUR;
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
export const setPageNodePosPaperSize = (
    tr: Transaction,
    dispatch: Dispatch,
    pagePos: number,
    pageNode: PMNode,
    paperSize: PaperSize
): boolean => {
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
 * Set the paper colour for a page node at the specified position.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param pagePos - The position of the page node to set the paper colour for.
 * @param pageNode - The page node to set the paper colour for.
 * @param paperColour - The paper colour to set.
 * @returns {boolean} True if the paper colour was set, false otherwise.
 */
export const setPageNodePosPaperColour = (
    tr: Transaction,
    dispatch: Dispatch,
    pagePos: number,
    pageNode: PMNode,
    paperColour: string
): boolean => {
    if (!dispatch) return false;

    if (!isValidColour(paperColour)) {
        console.warn(`Invalid paper colour: ${paperColour}`);
        return false;
    }

    if (!isPageNode(pageNode)) {
        console.error("Unexpected! Node at pos:", pagePos, "is not a page node!");
        return false;
    }

    if (getPageNodePaperColour(pageNode) === paperColour) {
        // Paper colour is already set
        return false;
    }

    setPageNodeAttribute(tr, pagePos, pageNode, PAGE_NODE_PAPER_COLOUR_ATTR, paperColour);

    dispatch(tr);
    return true;
};
