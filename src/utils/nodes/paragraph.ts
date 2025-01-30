/**
 * @file /src/utils/paragraph.ts
 * @name Paragraph
 * @description Utility functions for paragraphs.
 */

import { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";
import { Nullable } from "../../types/record";
import { NullableNodePos } from "../../types/node";
import { getParentNodePosOfType, getPositionNodeType, isNodeEmpty } from "./node";
import { isPosAtEndOfDocument, isPosAtStartOfDocument } from "./document";
import { binarySearch, inRange } from "../math";
import { getBodyAfterPos, getBodyBeforePos, getEndOfBodyPosition } from "./body/bodyPosition";
import { ParagraphLineInfo } from "../../types/paragraph";

/**
 * Check if the given node is a paragraph node.
 * @param node - The node to check.
 * @returns {boolean} True if the node is a paragraph node, false otherwise.
 */
export const isParagraphNode = (node: Nullable<PMNode>): boolean => {
    if (!node) {
        console.warn("No node provided");
        return false;
    }

    return node.type.name === "paragraph";
};

/**
 * Get the type of the node at the specified position.
 * @param $pos - The resolved position in the document.
 * @returns The type of the node at the specified position.
 */
export const isPositionWithinParagraph = ($pos: ResolvedPos): boolean => {
    return getPositionNodeType($pos) === "paragraph";
};

/**
 * Get the start of the paragraph position.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {number} The start position of the paragraph.
 */
export const getStartOfParagraphPosition = (doc: PMNode, pos: ResolvedPos | number): number => {
    if (typeof pos === "number") {
        return getStartOfParagraphPosition(doc, doc.resolve(pos));
    }

    const { pos: paragraphPos } = getParagraphNodeAndPosition(doc, pos);
    return paragraphPos;
};

/**
 * Get the end of the paragraph position.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {number} The end position of the paragraph.
 */
export const getEndOfParagraphPosition = (doc: PMNode, $pos: ResolvedPos | number): number => {
    if (typeof $pos === "number") {
        return getEndOfParagraphPosition(doc, doc.resolve($pos));
    }

    const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
    if (!paragraphNode) {
        return paragraphPos;
    }

    return paragraphPos + paragraphNode.content.size;
};

/**
 * Get the previous paragraph node.
 * @param doc - The document node.
 * @param pos - The position in the document.
 * @returns {NullableNodePos} The previous paragraph node or null if not found and position.
 */
export const getPreviousParagraph = (doc: PMNode, pos: number): NullableNodePos => {
    let prevParagraphPos = pos;
    let prevParagraphNode = null;
    while (prevParagraphNode === null && prevParagraphPos > 0) {
        prevParagraphPos -= 1;
        const node = doc.nodeAt(prevParagraphPos);
        if (!node) {
            continue;
        }

        if (isParagraphNode(node)) {
            prevParagraphNode = node;
            prevParagraphPos = prevParagraphPos;
        }
    }

    if (!prevParagraphNode) {
        prevParagraphPos = -1;
    }

    return { pos: prevParagraphPos, node: prevParagraphNode };
};

/**
 * Get the next paragraph node.
 * @param doc - The document node.
 * @param pos - The position in the document.
 * @returns {NullableNodePos} The next paragraph node or null if not found and position.
 */
export const getNextParagraph = (doc: PMNode, pos: number): NullableNodePos => {
    const documentLength = doc.content.size;
    let nextParagraphPos = pos;
    let nextParagraphNode = null;
    while (nextParagraphNode === null && nextParagraphPos < documentLength) {
        nextParagraphPos += 1;
        const node = doc.nodeAt(nextParagraphPos);
        if (!node) {
            continue;
        }

        if (isParagraphNode(node)) {
            nextParagraphNode = node;
            nextParagraphPos = nextParagraphPos;
        }
    }

    if (!nextParagraphNode) {
        nextParagraphPos = -1;
    }

    return { pos: nextParagraphPos, node: nextParagraphNode };
};

/**
 * Determine if the resolved position is at the start of a paragraph node.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document.
 * @returns {boolean} True if the position is at the start of a paragraph node, false otherwise.
 */
export const isAtStartOfParagraph = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    if (typeof $pos === "number") {
        return isAtStartOfParagraph(doc, doc.resolve($pos));
    }

    const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
    if (!paragraphNode) {
        return false;
    }

    // We allow for the cursor to be at the start of the paragraph node or the start of the first text child node.
    return inRange($pos.pos, paragraphPos, paragraphPos + 1);
};

/**
 * Determine if the resolved position is at the end of a paragraph node.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document.
 * @returns {boolean} True if the position is at the end of a paragraph node, false otherwise.
 */
export const isAtEndOfParagraph = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    if (typeof $pos === "number") {
        return isAtEndOfParagraph(doc, doc.resolve($pos));
    }

    const { pos: paragraphPos, node: paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
    if (!paragraphNode) {
        return false;
    }

    return $pos.pos + 1 === paragraphPos + paragraphNode.nodeSize;
};

/**
 * Determine if the resolved position is at the start or end of a paragraph node.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document.
 * @returns {boolean} True if the position is at the start or end of a paragraph node, false otherwise.
 */
export const isAtStartOrEndOfParagraph = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    return isAtStartOfParagraph(doc, $pos) || isAtEndOfParagraph(doc, $pos);
};

/**
 * Determine if the previous paragraph is empty.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the previous paragraph is empty or does not exist, false otherwise.
 */
export const isPreviousParagraphEmpty = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    if (typeof $pos === "number") {
        return isPreviousParagraphEmpty(doc, doc.resolve($pos));
    }

    const { node: prevParagraphNode } = getPreviousParagraph(doc, $pos.pos);
    if (!prevParagraphNode) {
        return false;
    }

    return isNodeEmpty(prevParagraphNode);
};

/**
 * Determine if the next paragraph is empty.
 * @param doc - The document node.
 * @param $pos - The resolved position in the document or the absolute position of the node.
 * @returns {boolean} True if the next paragraph is empty or does not exist, false otherwise.
 */
export const isNextParagraphEmpty = (doc: PMNode, $pos: ResolvedPos | number): boolean => {
    if (typeof $pos === "number") {
        return isNextParagraphEmpty(doc, doc.resolve($pos));
    }

    const { node: nextParagraphNode } = getNextParagraph(doc, $pos.pos);
    if (!nextParagraphNode) {
        return false;
    }

    return isNodeEmpty(nextParagraphNode);
};

/**
 * Get the paragraph node position.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {number} The position of the paragraph node.
 */
export const getThisParagraphNodePosition = (doc: PMNode, pos: ResolvedPos | number): number => {
    return getParentNodePosOfType(doc, pos, "paragraph").pos;
};

/**
 * Get the paragraph node position and the paragraph node itself.
 * @param doc - The document node.
 * @param pos - The resolved position in the document or the absolute position of the node.
 * @returns {NullableNodePos} The position and the node or null if not found of the paragraph.
 */
export const getParagraphNodeAndPosition = (doc: PMNode, pos: ResolvedPos | number): NullableNodePos => {
    if (typeof pos === "number") {
        return getParagraphNodeAndPosition(doc, doc.resolve(pos));
    }

    if (isPosAtStartOfDocument(doc, pos, false)) {
        return getNextParagraph(doc, pos.pos);
    } else if (isPosAtEndOfDocument(doc, pos)) {
        return getPreviousParagraph(doc, pos.pos);
    }

    const paragraphPos = getThisParagraphNodePosition(doc, pos);
    const paragraphNode = doc.nodeAt(paragraphPos);
    if (!isParagraphNode(paragraphNode)) {
        console.warn("No paragraph node found");
        return { pos: -1, node: paragraphNode };
    }

    return { pos: paragraphPos, node: paragraphNode };
};

/**
 * Gets the previous page's past body paragraph and position, if any, before the given position.
 * @param doc - The current document.
 * @param pos - Any position within the current page's body
 * @returns {NullableNodePos} The previous page body's last paragraph and position, if any.
 */
export const getLastParagraphInPreviousPageBodyBeforePos = (doc: PMNode, pos: ResolvedPos | number): NullableNodePos => {
    const previousPageBody = getBodyBeforePos(doc, pos);
    if (!previousPageBody.node) {
        console.warn("No previous page body node found");
        return previousPageBody;
    }

    const endOfPrevPgBodyPos = getEndOfBodyPosition(doc, previousPageBody.pos);
    return getPreviousParagraph(doc, endOfPrevPgBodyPos);
};

/**
 * Gets the next page's first body paragraph and positiom, if any, after the given position.
 * @param doc - The current document.
 * @param pos - Any position within the current page's body
 * @returns {NullableNodePos} The next page body's first paragraph and position, if any.
 */
export const getFirstParagraphInNextPageBodyAfterPos = (doc: PMNode, pos: ResolvedPos | number): NullableNodePos => {
    const nextPageBody = getBodyAfterPos(doc, pos);
    if (!nextPageBody.node) {
        console.warn("No next page body node found");
        return nextPageBody;
    }

    return getNextParagraph(doc, nextPageBody.pos);
};

/**
 * Get the paragraph DOM node.
 * @param view - The editor view.
 * @param paragraphPos - The position of the paragraph in the document.
 * @returns {Node} The paragraph DOM node.
 */
const getParagraphDOMNode = (view: EditorView, paragraphPos: number): Nullable<HTMLElement> => {
    // DOM nodes are offsetted by 1 for some reason.
    const paragraphTextPos = paragraphPos + 1;
    return (view.domAtPos(paragraphTextPos).node as HTMLElement) ?? null;
};

/**
 * Measure the widths of each character in a paragraph.
 * @param pDOMNode - The paragraph DOM node.
 * @returns {number[]} An array of character widths.
 */
const measureTextWidths = (pDOMNode: HTMLElement): number[] => {
    const charWidths: number[] = [];

    const textContent = pDOMNode.textContent || "";
    const computedStyles = getComputedStyle(pDOMNode);

    for (let i = 0; i < textContent.length; i++) {
        const char = textContent[i];

        const span = document.createElement("span");
        span.textContent = char;
        span.style.position = "absolute";
        span.style.visibility = "hidden";
        span.style.whiteSpace = "nowrap";
        span.style.font = computedStyles.font;
        span.style.letterSpacing = computedStyles.letterSpacing;
        span.style.wordSpacing = computedStyles.wordSpacing;
        span.style.lineHeight = computedStyles.lineHeight;

        document.body.appendChild(span);

        const { width } = span.getBoundingClientRect();
        charWidths.push(width);

        document.body.removeChild(span);
    }

    return charWidths;
};

/**
 * Get offsets where explicit and soft line breaks occur in a paragraph.
 * @param pDOMNode - The paragraph DOM node.
 * @returns {number[]} An array of offsets where line breaks occur.
 */
const getParagraphLineBreakOffsets = (pDOMNode: HTMLElement): number[] => {
    const offsets: number[] = [0];
    let textOffset = 0;

    // 1. Find explicit `<br />` breaks and store their offsets
    for (const node of pDOMNode.childNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "BR") {
            offsets.push(textOffset);
        } else if (node.nodeType === Node.TEXT_NODE) {
            textOffset += node.textContent?.length || 0;
        }
    }

    // 2. Use `Range` to detect soft-wrapped line breaks
    const range = document.createRange();
    range.selectNodeContents(pDOMNode);
    const paragraphRects = range.getClientRects();

    // 3. Measure where soft-wrapped lines start and track offsets
    const textContent = pDOMNode.innerHTML || pDOMNode.textContent || "";
    const charWidths = measureTextWidths(pDOMNode);

    let cumulativeWidth = 0;
    let rectIndex = 0;

    for (let i = 0; i < textContent.length; i++) {
        if (rectIndex >= paragraphRects.length - 1) {
            // We are on the last line of the paragraph
            break;
        }

        cumulativeWidth += charWidths[i] || 0;

        if (cumulativeWidth >= paragraphRects[rectIndex].width) {
            // Detected a soft-wrapped line break
            offsets.push(i - 2);
            rectIndex++;
            cumulativeWidth = 0;
        }
    }

    return offsets;
};

/**
 * Get the line number for a given position within a paragraph using binary search.
 * @param lineBreakOffsets - The offsets where line breaks occur.
 * @param offset - The position within the paragraph.
 * @returns {number} The line number of the position (0-indexed).
 */
const getLineNumberForPosition = (lineBreakOffsets: number[], offset: number): number => {
    const compareOffsets = (a: number, b: number): number => a - b;
    return binarySearch(lineBreakOffsets, offset, compareOffsets);
};

/**
 * Given a paragraph position and position within said paragraph, return the number of
 * lines in the paragraph and the line number of the position.
 * @param view - The editor view.
 * @param pos - The [resolved] position in the document.
 * @returns {ParagraphLineInfo} The number of lines in the paragraph and the
 * line number of the position (0-indexed).
 */
const getParagraphLineInfo = (view: EditorView, pos: ResolvedPos | number): ParagraphLineInfo => {
    if (typeof pos !== "number") {
        pos = pos.pos;
    }

    const returnDefaultLineInfo = (): ParagraphLineInfo => ({ lineCount: 0, lineNumber: 0 });

    const paragraphPos = getThisParagraphNodePosition(view.state.doc, pos);

    const pDOMNode = getParagraphDOMNode(view, paragraphPos);
    if (!pDOMNode) return returnDefaultLineInfo();

    const lineBreakOffsets = getParagraphLineBreakOffsets(pDOMNode);
    const lineCount = lineBreakOffsets.length;

    const { offset } = view.domAtPos(pos);
    const lineNumber = getLineNumberForPosition(lineBreakOffsets, offset);

    return { lineCount, lineNumber };
};

/**
 * Checks if the position is at the first line of the paragraph.
 * @param view - The editor view.
 * @param $pos - The [resolved] position in the document.
 * @returns {boolean} True if the position is at the first line of the paragraph, false otherwise.
 */
export const isPosAtFirstLineOfParagraph = (view: EditorView, $pos: ResolvedPos | number): boolean => {
    const { lineNumber } = getParagraphLineInfo(view, $pos);
    return lineNumber === 0;
};

/**
 * Checks if the position is at the last line of the paragraph.
 * @param view - The editor view.
 * @param $pos - The [resolved] position in the document.
 * @returns {boolean} True if the position is at the last line of the paragraph, false otherwise.
 */
export const isPosAtLastLineOfParagraph = (view: EditorView, $pos: ResolvedPos | number): boolean => {
    const { lineCount, lineNumber } = getParagraphLineInfo(view, $pos);
    return lineNumber + 1 === lineCount;
};
