/**
 * @file /src/utils/setPageAttributes.ts
 * @name SetPageAttributes
 * @description Utility functions for setting page attributes.
 */

import { Node as PMNode } from "@tiptap/pm/model";
import { Transaction } from "@tiptap/pm/state";
import { isPageNode } from "./page";

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
