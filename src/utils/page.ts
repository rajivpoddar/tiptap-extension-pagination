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
import { Transaction } from "@tiptap/pm/state";
import { collectPageNodes, NodePos } from "./pagination";
import { inRange } from "./math";

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
 * Check if the given node is a page node.
 * @param doc - The current document.
 * @param node - The node to check.
 * @returns {boolean} True if the node is a page node, false otherwise.
 */
const isPageNumInRange = (doc: PMNode, pageNum: number): boolean => {
    const numPagesInDoc = doc.childCount;
    return inRange(pageNum, 0, numPagesInDoc - 1);
};

/**
 * Get the page node by page number.
 * @param doc - The current document.
 * @param pageNum - The page number to find the page node for (0-indexed).
 * @returns {Nullable<PMNode>} The page node of the specified page or null
 * if the page could not be found.
 */
export const getPageNodeByPageNum = (doc: PMNode, pageNum: number): Nullable<PMNode> => {
    if (!isPageNumInRange(doc, pageNum)) {
        console.warn("Page number:", pageNum, "is out of range for the document");
        return null;
    }

    const pageNode = doc.child(pageNum);
    if (!isPageNode(pageNode)) {
        console.error("Unexpected! Doc child num:", pageNum, "is not a page node!");
        return null;
    }

    return pageNode;
};

/**
 * Get the page node and position by page number.
 * @param doc - The current document.
 * @param pageNum - The page number to find the page node for (0-indexed).
 * @returns {Nullable<NodePos>} The page node position of the specified page or null
 * if the page could not be found.
 */
export const getPageNodePosByPageNum = (doc: PMNode, pageNum: number): Nullable<NodePos> => {
    if (!isPageNumInRange(doc, pageNum)) {
        console.warn("Page number:", pageNum, "is out of range for the document");
        return null;
    }

    const pageNodes = collectPageNodes(doc);
    return pageNodes[pageNum];
};

/**
 * Set a page node attribute to the given value for all page nodes in the document.
 * @param tr - The transaction to apply the change to.
 * @param attr - The attribute to set.
 * @param value - The value to set the attribute to.
 * @returns {void}
 */
export const setPageNodesAttribute = (tr: Transaction, attr: string, value: any): void => {
    const { doc } = tr;

    doc.descendants((node, pos) => {
        if (isPageNode(node)) {
            const nodeAttr = node.attrs[attr];
            if (nodeAttr !== value) {
                tr.setNodeAttribute(pos, attr, value);
            }
        }
    });
};
