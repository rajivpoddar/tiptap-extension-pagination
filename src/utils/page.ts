/**
 * @file /src/utils/page.ts
 * @name Page
 * @description Utility functions for page nodes in the editor.
 */

import { Node as PMNode } from "@tiptap/pm/model";
import { EditorState, Transaction } from "@tiptap/pm/state";
import { NodePos, NodePosArray } from "../types/node";
import { Nullable } from "../types/record";
import { inRange } from "./math";
import { PAGE_NODE_NAME } from "../constants/page";

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

    return node.type.name === PAGE_NODE_NAME;
};

/**
 * Get the page number of the given node.
 * @param node - The node to get the page number for.
 * @returns {Nullable<number>} The page number of the node or null if the node is not a page node.
 */
export const getNumPagesInDoc = (doc: PMNode): number => {
    return doc.childCount;
};

/**
 * Get the last page number in the document.
 * @param doc - The current document.
 * @returns {number} The last page number in the document.
 */
export const getLastPageNum = (doc: PMNode): number => {
    return getNumPagesInDoc(doc) - 1;
};

/**
 * Check if the given node is a page node.
 * @param doc - The current document.
 * @param node - The node to check.
 * @returns {boolean} True if the node is a page node, false otherwise.
 */
export const isPageNumInRange = (doc: PMNode, pageNum: number): boolean => {
    const lastPageNum = getLastPageNum(doc);
    return inRange(pageNum, 0, lastPageNum);
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
 * Check if the document has page nodes.
 * @param state - The editor state.
 * @returns {boolean} True if the document has page nodes, false otherwise.
 */
export const doesDocHavePageNodes = (state: EditorState): boolean => {
    const { schema } = state;
    const pageType = schema.nodes.page;

    let hasPageNodes = false;

    state.doc.forEach((node) => {
        if (node.type === pageType) {
            hasPageNodes = true;
            return false;
        }
    });

    return hasPageNodes;
};

/**
 * Collect page nodes and their positions in the document.
 * @param doc - The document node.
 * @returns {NodePosArray} A map of page positions to page nodes.
 */
export const collectPageNodes = (doc: PMNode): NodePosArray => {
    const pageNodes: NodePosArray = [];
    doc.forEach((node, offset) => {
        if (isPageNode(node)) {
            pageNodes.push({ node, pos: offset });
        }
    });

    return pageNodes;
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

    doc.forEach((node, pos) => {
        setPageNodeAttribute(tr, pos, node, attr, value);
    });
};

/**
 * Set a page node attribute to the given value.
 * @param tr - The transaction to apply the change to.
 * @param pos - The position of the node to set the attribute for.
 * @param node - The node to set the attribute for.
 * @param attr - The attribute to set.
 * @param value - The value to set the attribute to.
 * @returns {void}
 */
export const setPageNodeAttribute = (tr: Transaction, pos: number, node: PMNode, attr: string, value: any): void => {
    if (!isPageNode(node)) {
        return;
    }

    const nodeAttr = node.attrs[attr];
    if (nodeAttr !== value) {
        tr.setNodeAttribute(pos, attr, value);
    }
};
