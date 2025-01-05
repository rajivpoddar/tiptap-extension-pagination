/**
 * @file /src/utils/setPageAttributes.ts
 * @name SetPageAttributes
 * @description Utility functions for setting page attributes.
 */

import { Node as PMNode } from "@tiptap/pm/model";
import { Transaction } from "@tiptap/pm/state";
import { isPageNode } from "./page";
import { MultiSide, PageSide } from "../types/paper";
import { pageSides } from "../constants/paper";
import { Nullable } from "../types/record";
import { Dispatch } from "@tiptap/core";

/**
 * Set a page node attribute to the given value for all page nodes in the document.
 * @param tr - The transaction to apply the change to.
 * @param attr - The attribute to set.
 * @param value - The value to set the attribute to.
 * @returns {boolean} True if any attribute was changed, false otherwise.
 */
export const setPageNodesAttribute = (tr: Transaction, attr: string, value: any): boolean => {
    const { doc } = tr;
    const transactions: boolean[] = [];

    doc.forEach((node, pos) => {
        transactions.push(setPageNodeAttribute(tr, pos, node, attr, value));
    });

    return transactions.some((changed) => changed);
};

/**
 * Set a page node attribute to the given value.
 * @param tr - The transaction to apply the change to.
 * @param pos - The position of the node to set the attribute for.
 * @param node - The node to set the attribute for.
 * @param attr - The attribute to set.
 * @param value - The value to set the attribute to.
 * @returns {boolean} True if the attribute was changed, false otherwise.
 */
export const setPageNodeAttribute = (tr: Transaction, pos: number, node: PMNode, attr: string, value: any): boolean => {
    if (!isPageNode(node)) {
        return false;
    }

    const nodeAttr = node.attrs[attr];
    const isDifferent = nodeAttr !== value;
    if (isDifferent) {
        tr.setNodeAttribute(pos, attr, value);
    }

    return isDifferent;
};

/**
 * Set the paper side configuration of a page node.
 * @param tr - The transaction to apply the change to.
 * @param dispatch - The dispatch function to apply the transaction.
 * @param pagePos - The position of the page node to set the side config for.
 * @param pageNode - The page node to set the side config for.
 * @param paperMargins - The side config to set.
 * @param isValidConfig - A function to validate the side config.
 * @param getPageNodeSideConfig - A function to get the existing side config from the page node.
 * @param attrKey - The key of the attribute to update.
 * @returns {boolean} True if the side config were set, false otherwise.
 */
export const setPageNodePosSideConfig = <V, T extends { [key in PageSide]: V }>(
    tr: Transaction,
    dispatch: Dispatch,
    pagePos: number,
    pageNode: PMNode,
    configObj: T,
    isValidConfig: (config: T) => boolean,
    getPageNodeSideConfig: (pageNode: PMNode) => Nullable<T>,
    attrKey: string
): boolean => {
    if (!dispatch) return false;

    if (!isValidConfig(configObj)) {
        console.warn("Invalid paper margins", configObj);
        return false;
    }

    if (!isPageNode(pageNode)) {
        console.error("Unexpected! Node at pos:", pagePos, "is not a page node!");
        return false;
    }

    if (getPageNodeSideConfig(pageNode) === configObj) {
        return false;
    }

    const success = setPageNodeAttribute(tr, pagePos, pageNode, attrKey, configObj);
    if (success) {
        dispatch(tr);
    }

    return success;
};

/**
 * Updates a page side configuration attribute. Does not dispatch the transaction.
 * @param tr - The transaction to apply the change to.
 * @param pagePos - The position of the page node to update the attribute for.
 * @param pageNode - The page node to update the attribute for.
 * @param configObj - The configuration object to update.
 * @param value - The new value of the configuration object.
 * @param getExistingConfig - A function to get the existing configuration object from
 * the page node. Can return null if the configuration object is missing or invalid.
 * @param isValidConfig - A function to validate the configuration object.
 * @param defaultConfig - The default configuration object.
 * @param attrKey - The key of the attribute to update.
 * @returns {boolean} True if the attribute was updated, false otherwise.
 */
export const updatePageSideConfig = <V, T extends { [key in PageSide]: V }>(
    tr: Transaction,
    pagePos: number,
    pageNode: PMNode,
    configObj: Exclude<MultiSide, "all">,
    value: V,
    getExistingConfig: (pageNode: PMNode) => Nullable<T>,
    isValidConfig: (config: T) => boolean,
    defaultConfig: T,
    attrKey: string
): boolean => {
    if (!isPageNode(pageNode)) {
        return false;
    }

    const existingMargins = getExistingConfig(pageNode);
    let updatedMargins: T = { ...defaultConfig };
    if (existingMargins && isValidConfig(existingMargins)) {
        updatedMargins = { ...existingMargins };
    } else {
        if ((pageSides as MultiSide[]).includes(configObj)) {
            updatedMargins[configObj as PageSide] = value;
        } else {
            switch (configObj) {
                case "x":
                    updatedMargins.left = value;
                    updatedMargins.right = value;
                    break;
                case "y":
                    updatedMargins.top = value;
                    updatedMargins.bottom = value;
                    break;
                default:
                    console.error("Unhanded margin side", configObj);
            }
        }
    }

    return setPageNodeAttribute(tr, pagePos, pageNode, attrKey, updatedMargins);
};
