/**
 * @file /src/utils/nodes/text.ts
 * @name Text
 * @description Utility functions for text nodes.
 */

import { Node as PMNode } from "@tiptap/pm/model";
import { Nullable } from "../../types/record";

/**
 * Check if the given node is a text node.
 * @param node - The node to check.
 * @returns {boolean} True if the node is a text node, false otherwise.
 */
export const isTextNode = (node: Nullable<PMNode>): boolean => {
    if (!node) {
        console.warn("No node provided");
        return false;
    }

    return node.type.name === "text";
};

/**
 * Measure the width and height of a text node.
 * @param text - The text content of the node.
 * @param computedStyles - The computed styles of the node.
 * @returns {DOMRect} The bounding rectangle of the text node.
 */
export const measureText = (text: string, computedStyles: CSSStyleDeclaration): DOMRect => {
    const span = document.createElement("span");
    span.textContent = text;
    span.style.position = "absolute";
    span.style.visibility = "hidden";
    span.style.whiteSpace = "nowrap";
    span.style.font = computedStyles.font;
    span.style.letterSpacing = computedStyles.letterSpacing;
    span.style.wordSpacing = computedStyles.wordSpacing;
    span.style.lineHeight = computedStyles.lineHeight;

    document.body.appendChild(span);

    const clientBoundingRect = span.getBoundingClientRect();
    document.body.removeChild(span);

    return clientBoundingRect;
};
