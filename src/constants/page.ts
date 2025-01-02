/**
 * @file /src/constants/page.ts
 * @name Page
 * @description Constants for page nodes in the editor.
 */

export const PAGE_NODE_ATTR_KEYS = {
    paperSize: "paperSize",
    paperColour: "paperColour",
    paperOrientation: "paperOrientation",
    pageMargins: "pageMargins",
} as const;

export const PAGE_NODE_NAME = "page" as const;
