/**
 * @file /src/utils/nodes/document.ts
 * @name Document
 * @description Utility functions for the document node.
 */

import { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { getPageNumber } from "./page/pageNumber";
import { isPosMatchingEndOfBodyCondition, isPosMatchingStartOfBodyCondition } from "./body/bodyCondition";
import { getLastPageNum } from "./page/pageRange";

/**
 * Check if the given position is at the start of the document.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @param allowTextBlock - Whether to allow text blocks at the start of the document. Default is false.
 * @returns {boolean} True if the position is at the start of the document, false otherwise.
 */
export const isPosAtStartOfDocument = (doc: PMNode, $pos: ResolvedPos | number, allowTextBlock: boolean): boolean => {
    if (typeof $pos === "number") {
        return isPosAtStartOfDocument(doc, doc.resolve($pos), allowTextBlock);
    }

    const maxPos = allowTextBlock ? 2 : 1;

    return $pos.pos <= maxPos;
};

/**
 * Check if the given position is at the end of the document.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the position is at the end of the document, false otherwise.
 */
export const isPosAtEndOfDocument = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    if (typeof $pos === "number") {
        return isPosAtEndOfDocument(doc, doc.resolve($pos));
    }

    return $pos.pos >= doc.nodeSize - 2;
};

/**
 * Checks if the given position is at the start of the first page's body.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @param checkExactStart - Whether the position must be at the exact start of the body.
 * @returns {boolean} True if the position is at the start of the first page's body, false otherwise.
 */
export const isPosAtStartOfDocumentBody = (doc: PMNode, $pos: ResolvedPos | number, checkExactStart: boolean): boolean => {
    if (typeof $pos === "number") {
        return isPosAtStartOfDocumentBody(doc, doc.resolve($pos), checkExactStart);
    }

    const pageNumber = getPageNumber(doc, $pos);
    if (!isPosMatchingStartOfBodyCondition(doc, $pos, checkExactStart)) return false;

    return pageNumber === 0;
};

/**
 * Checks if the given position is at the end of the last page's body.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the position is at the end of the last page's body, false otherwise.
 */
export const isPosAtEndOfDocumentBody = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    if (typeof $pos === "number") {
        return isPosAtEndOfDocumentBody(doc, doc.resolve($pos));
    }

    const pageNumber = getPageNumber(doc, $pos);
    if (!isPosMatchingEndOfBodyCondition(doc, $pos, false)) return false;

    return pageNumber === getLastPageNum(doc);
};
