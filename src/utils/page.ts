/**
 * @file /src/utils/page.ts
 * @name Page
 * @description Utility functions for page nodes in the editor.
 */

import { Node as PMNode } from "@tiptap/pm/model";
import { Nullable } from "./record";
import { PaperSize } from "../types/paper";
import { mmToPixels } from "./window";
import { getPaperDimensions } from "./paper";
import { PagePixelDimensions } from "../types/page";

/**
 * Check if the given node is a page node.
 * @param node - The node to check.
 * @returns {boolean} True if the node is a page node, false otherwise.
 */
export const isPageNode = (node: Nullable<PMNode>): boolean => {
    if (!node) {
        console.warn("No node provided");
        return false;
    }

    return node.type.name === "page";
};

/**
 * Calculates the pixel width and height of a given paper size.
 * @returns {PagePixelDimensions} The height and width of the A4 page in pixels.
 */
export const calculatePagePixelDimensions = (paperSize: PaperSize): PagePixelDimensions => {
    const paperDimensions = getPaperDimensions(paperSize);
    const { width, height } = paperDimensions;
    const pageHeight = mmToPixels(height);
    const pageWidth = mmToPixels(width);

    return { pageHeight, pageWidth };
};
