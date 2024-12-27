/**
 * @file /src/utils/paper.ts
 * @name Paper
 * @description Utility functions for paper size calculations
 */

import { Transaction } from "@tiptap/pm/state";
import { DEFAULT_PAPER_SIZE, paperSizes } from "../constants/paper";
import { DARK_THEME } from "../constants/theme";
import { PaperDimensions, PaperSize } from "../types/paper";
import { getDeviceTheme } from "./theme";
import { isPageNode } from "./pagination";
import { Dispatch } from "@tiptap/core";

/**
 * Check if the given paper size is valid.
 * @param paperSize - The paper size to check.
 * @returns {boolean} True if the paper size is valid, false otherwise.
 */
export const isValidPaperSize = (paperSize: PaperSize): boolean => {
    return paperSize in paperSizes;
};

/**
 * Given a paper size, return the dimensions of the paper
 * @param paperSize - The paper size
 * @returns {PaperDimensions} - The dimensions of the paper
 */
export const getPaperDimensions = (paperSize: PaperSize): PaperDimensions => {
    if (!isValidPaperSize(paperSize)) {
        return getPaperDimensions(DEFAULT_PAPER_SIZE);
    }

    return paperSizes[paperSize];
};

/**
 * Get the default paper colour based on the device theme
 * @returns {string} The default paper colour
 */
export const defaultPaperColour = (): string => {
    return getDeviceTheme() === DARK_THEME ? "#222" : "#fff";
};

/**
 * Set the given paper size for the document.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param paperSize - The paper size to set.
 * @returns {boolean} True if the paper size was set, false otherwise.
 */
export const setDocumentPaperSize = (tr: Transaction, dispatch: Dispatch, paperSize: PaperSize): boolean => {
    if (!dispatch) return false;

    const { doc } = tr;

    doc.descendants((node, pos) => {
        if (isPageNode(node)) {
            const nodePaperSize: PaperSize = node.attrs.paperSize;
            if (nodePaperSize !== paperSize) {
                tr.setNodeAttribute(pos, "paperSize", paperSize);
            }
        }
    });

    dispatch(tr);
    return true;
};
