/**
 * @file /src/utils/paper.ts
 * @name Paper
 * @description Utility functions for paper size calculations
 */

import { Transaction } from "@tiptap/pm/state";
import { Dispatch } from "@tiptap/core";
import { DEFAULT_PAPER_SIZE, paperDimensions } from "../constants/paper";
import { DARK_THEME } from "../constants/theme";
import { PaperDimensions, PaperSize } from "../types/paper";
import { getDeviceTheme } from "./theme";
import { isPageNode } from "./page";

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
        return getPaperDimensions(DEFAULT_PAPER_SIZE);
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
 * Set a paper node attribute to the given value for all page nodes in the document.
 * @param tr - The transaction to apply the change to.
 * @param attr - The attribute to set.
 * @param value - The value to set the attribute to.
 * @returns {void}
 */
const setPaperNodeAttribute = (tr: Transaction, attr: string, value: any): void => {
    const { doc } = tr;

    doc.descendants((node, pos) => {
        if (isPageNode(node)) {
            const nodeAttr: PaperSize = node.attrs[attr];
            if (nodeAttr !== value) {
                tr.setNodeAttribute(pos, attr, value);
            }
        }
    });
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

    if (!isValidPaperSize(paperSize)) {
        console.warn(`Invalid paper size: ${paperSize}`);
        return false;
    }

    setPaperNodeAttribute(tr, "paperSize", paperSize);

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

    setPaperNodeAttribute(tr, "paperColour", paperColour);

    dispatch(tr);
    return true;
};
