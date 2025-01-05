/**
 * @file /src/utils/pageBorders.ts
 * @name PageBorders
 * @description Utility functions for handling page borders.
 */

import { EditorState } from "@tiptap/pm/state";
import { Editor } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { PAGE_NODE_ATTR_KEYS } from "../constants/page";
import { DEFAULT_PAGE_BORDER_CONFIG } from "../constants/paper";
import { BorderConfig } from "../types/paper";
import { Nullable } from "../types/record";
import { px } from "./units";
import { getPageAttribute } from "./page";

/**
 * Get the page borders from a page node.
 * @param pageNode - The page node to get the page borders from.
 * @returns {Nullable<BorderConfig>} The page borders of the specified page.
 */
export const getPageNodePageBorders = (pageNode: PMNode): Nullable<BorderConfig> => {
    const { attrs } = pageNode;
    return attrs[PAGE_NODE_ATTR_KEYS.pageBorders];
};

/**
 * Converts a border config to a CSS string using px as the unit.
 * @param pageBorders - The page borders to convert to a CSS string.
 * @returns {string} The CSS string representation of the page borders. Remember MDN says
 * order is (top, right, bottom, left). See https://developer.mozilla.org/en-US/docs/Web/CSS/border.
 */
export const calculatePageBorders = (pageBorders: BorderConfig): string => {
    const { top, right, bottom, left } = pageBorders;

    const borders = [top, right, bottom, left].map(px).join(" ");
    return borders;
};

/**
 * Retrieves the page border config of a specific page using the editor instance.
 * Falls back to the default page border config if the page number is invalid.
 * @param context - The current editor instance or editor state.
 * @param pageNum - The page number to retrieve the page border config for.
 * @returns {MarginConfig} The page border config of the specified page or default.
 */
export const getPageNumPageBorders = (context: Editor | EditorState, pageNum: number): BorderConfig => {
    const getDefault = context instanceof Editor ? context.commands.getDefaultPageBorders : () => DEFAULT_PAGE_BORDER_CONFIG;
    return getPageAttribute(context, pageNum, getDefault, getPageNodePageBorders);
};
