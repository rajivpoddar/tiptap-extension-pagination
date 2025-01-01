/**
 * @file /src/PaginationExtension.ts
 * @name Pagination
 * @description Custom pagination extension for the Tiptap editor.
 */

import { Extension, isNodeEmpty } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { DEFAULT_PAPER_SIZE, LIGHT_PAPER_COLOUR } from "./constants/paper";
import PaginationPlugin from "./Plugins/Pagination";
import {
    isHighlighting,
    getResolvedPosition,
    setSelectionAtPos,
    setSelection,
    moveToNextTextBlock,
    moveToNearestTextSelection,
    moveToPreviousTextBlock,
    setSelectionToEndOfParagraph,
} from "./utils/selection";
import {
    getNextParagraph,
    getParagraphNodeAndPosition,
    getPreviousParagraph,
    getThisPageNodePosition,
    isAtStartOrEndOfParagraph,
    isParagraphNode,
    isPosAtEndOfPage,
    isPosAtStartOfPage,
    isPositionWithinParagraph,
    isTextNode,
} from "./utils/pagination";
import { appendAndReplaceNode, deleteNode } from "./utils/node";
import { PaperSize } from "./types/paper";
import { isValidPaperSize, pageNodeHasPageSize, setPageNumPaperSize, setPagePaperSize } from "./utils/paper";
import { getPageNodeByPageNum, isPageNode, setPageNodesAttribute } from "./utils/page";
import { PAGE_NODE_PAPER_SIZE_ATTR } from "./constants/page";

export interface PaginationOptions {
    /**
     * The default paper size for the document. Note this is only the default
     * so you can have settings in your editor which change the paper size.
     * This is only the setting for new documents.
     * @default "A4"
     * @example "A3"
     */
    defaultPaperSize: PaperSize;

    /**
     * The default paper colour for the document. Note this is only the default
     * so you can have settings in your editor which change the paper colour.
     * This is only the setting for new documents.
     * @default "#fff"
     * @example "#f0f0f0"
     */
    defaultPaperColour: string;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        page: {
            /**
             * Set the paper size
             * @param paperSize The paper size
             * @example editor.commands.setDocumentPaperSize("A4")
             */
            setDocumentPaperSize: (paperSize: PaperSize) => ReturnType;

            /**
             * Set the default paper size
             * @example editor.commands.setDocumentDefaultPaperSize()
             */
            setDocumentDefaultPaperSize: () => ReturnType;

            /**
             * Set the paper size for a specific page
             * @param pageNum The page number (0-indexed)
             * @param paperSize The paper size
             * @example editor.commands.setPagePaperSize(0, "A4")
             */
            setPagePaperSize: (pageNum: number, paperSize: PaperSize) => ReturnType;

            /**
             * Checks the paper sizes are set for each page in the document.
             * Sets the default paper size if not set.
             * @example editor.commands.checkPaperSizes()
             */
            checkPaperSizes: () => ReturnType;

            /**
             * Set the paper colour for the document
             * @param paperColour The paper colour
             * @example editor.commands.setDocumentPaperColour("#fff")
             */
            setDocumentPaperColour: (paperColour: string) => ReturnType;

            /**
             * Set the default paper colour
             * @example editor.commands.setDocumentDefaultPaperColour()
             */
            setDocumentDefaultPaperColour: () => ReturnType;

            /**
             * Set the paper colour for a specific page
             * @param pageNum The page number (0-indexed)
             * @param paperColour The paper colour
             * @example editor.commands.setPagePaperColour(0, "#fff")
             */
            setPagePaperColour: (pageNum: number, paperColour: string) => ReturnType;
        };
    }
}

const PaginationExtension = Extension.create<PaginationOptions>({
    name: "pagination",

    addOptions() {
        return {
            defaultPaperSize: DEFAULT_PAPER_SIZE,
            defaultPaperColour: LIGHT_PAPER_COLOUR,
        };
    },

    onCreate() {
        this.editor.commands.checkPaperSizes();
    },

    addProseMirrorPlugins() {
        return [
            keymap({
                Enter: (state, dispatch) => {
                    if (!dispatch) {
                        console.warn("No dispatch function provided");
                        return false;
                    }

                    if (isHighlighting(state)) {
                        return false;
                    }

                    const { doc, tr, schema, selection } = state;
                    const { from } = selection;
                    const $pos = getResolvedPosition(state);

                    // Ensure that the position is within a valid block (paragraph)
                    if (!isPositionWithinParagraph($pos)) {
                        console.warn("Not inside a paragraph node");
                        return false;
                    }

                    const { paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
                    if (!paragraphNode) {
                        console.warn("No current paragraph node found");
                        return false;
                    }

                    // Create a new empty paragraph node
                    const newParagraph = schema.nodes.paragraph.create();
                    console.log("Inserting new paragraph at position", from);

                    if (isNodeEmpty(paragraphNode)) {
                        tr.insert(from, newParagraph);
                    } else {
                        if (isAtStartOrEndOfParagraph(doc, $pos)) {
                            tr.replaceSelectionWith(newParagraph);
                        } else {
                            const remainingContent = paragraphNode.content.cut($pos.parentOffset);
                            const newContentParagraph = schema.nodes.paragraph.create({}, remainingContent);
                            tr.replaceWith($pos.pos, $pos.pos + remainingContent.size, newContentParagraph);
                        }
                    }

                    const newSelection = moveToNextTextBlock(tr, from);
                    setSelection(tr, newSelection);
                    dispatch(tr);
                    return true;
                },
                Backspace: (state, dispatch) => {
                    if (!dispatch) {
                        console.warn("No dispatch function provided");
                        return false;
                    }

                    if (isHighlighting(state)) {
                        return false;
                    }

                    const { doc, tr, schema } = state;
                    const $pos = getResolvedPosition(state);
                    const thisNodePos = $pos.pos;

                    // Ensure that the position is within a valid block (paragraph)
                    if (!isPositionWithinParagraph($pos)) {
                        return false;
                    }

                    if (isPosAtEndOfPage(doc, $pos)) {
                        // Traverse $pos.path to find the nearest page node
                        const { paragraphPos, paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
                        if (!paragraphNode) {
                            console.warn("No current paragraph node found");
                            return false;
                        }

                        if (isNodeEmpty(paragraphNode)) {
                            deleteNode(tr, paragraphPos, paragraphNode);
                            const selection = moveToPreviousTextBlock(tr, paragraphPos);
                            setSelection(tr, selection);
                        } else {
                            // Remove the last character from the current paragraph
                            const newContent = paragraphNode.content.cut(0, paragraphNode.content.size - 1);
                            const newParagraph = schema.nodes.paragraph.create({}, newContent);
                            tr.replaceWith(paragraphPos, paragraphPos + paragraphNode.nodeSize, newParagraph);
                            setSelectionAtPos(tr, thisNodePos - 1);
                        }
                    } else if (!isPosAtStartOfPage(doc, $pos)) {
                        return false;
                    } else {
                        // Traverse $pos.path to find the nearest page node
                        const thisPageNodePos = getThisPageNodePosition(doc, $pos);
                        const firstChildPos = thisPageNodePos + 1;
                        if (firstChildPos !== thisNodePos - 1) {
                            // Not at the beginning of the page
                            return false;
                        }

                        const prevPageChild = doc.childBefore(thisPageNodePos);
                        const prevPageNode = prevPageChild.node;

                        // Confirm that the previous node is a page node
                        if (!prevPageNode) {
                            // Start of document
                            console.log("No previous page node found");
                            return false;
                        }

                        if (!isPageNode(prevPageNode)) {
                            console.warn("Previous node is not a page node");
                            return false;
                        }

                        // Append the content of the current paragraph to the end of the previous paragraph
                        const { paragraphPos, paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
                        if (!paragraphNode) {
                            console.warn("No current paragraph node found");
                            return false;
                        }

                        const { prevParagraphPos, prevParagraphNode } = getPreviousParagraph(doc, paragraphPos);
                        if (!prevParagraphNode) {
                            console.warn("No previous paragraph node found");
                            return false;
                        }

                        if (!isNodeEmpty(prevParagraphNode) || !isNodeEmpty(paragraphNode)) {
                            deleteNode(tr, paragraphPos, paragraphNode);
                        }

                        appendAndReplaceNode(tr, prevParagraphPos, prevParagraphNode, paragraphNode);

                        // Set the selection to the end of the previous paragraph
                        setSelectionToEndOfParagraph(tr, prevParagraphPos, prevParagraphNode);
                    }

                    dispatch(tr);
                    return true;
                },
                Delete: (state, dispatch) => {
                    if (!dispatch) {
                        console.warn("No dispatch function provided");
                        return false;
                    }

                    if (isHighlighting(state)) {
                        return false;
                    }

                    const { doc, tr } = state;
                    const $pos = getResolvedPosition(state);

                    // Ensure that the position is within a valid block (paragraph)
                    if (!isPositionWithinParagraph($pos)) {
                        console.warn("Not inside a paragraph node");
                        return false;
                    }

                    if (!isPosAtEndOfPage(doc, $pos)) {
                        return false;
                    }

                    // We need to remove the current paragraph node and prepend any
                    // content to the next paragraph node (which will now be at the
                    // end of the current page)
                    const thisPos = $pos.pos;
                    const expectedTextNodePos = thisPos - 1;
                    const thisTextNode = doc.nodeAt(expectedTextNodePos);
                    if (!thisTextNode) {
                        console.warn("No node found at position", expectedTextNodePos);
                        return false;
                    }

                    const { paragraphPos, paragraphNode } = getParagraphNodeAndPosition(doc, $pos);
                    if (!paragraphNode) {
                        console.warn("No current paragraph node found");
                        return false;
                    }

                    if (!isParagraphNode(thisTextNode) && !isTextNode(thisTextNode)) {
                        console.warn("Unexpected node type found at position", expectedTextNodePos);
                        return false;
                    }

                    const thisPageChild = doc.childAfter(paragraphPos);
                    if (!isPageNode(thisPageChild.node)) {
                        console.warn("No page node found");
                        return false;
                    }

                    const pageNum = thisPageChild.index;
                    const nextPageNum = pageNum + 1;
                    if (nextPageNum > doc.childCount - 1) {
                        console.log("At end of document");
                        // If we don't handle the delete, the default behaviour will remove this
                        // paragraph node, which we don't want.
                        dispatch(tr);
                        return true;
                    }

                    const nextPageNode = getPageNodeByPageNum(doc, nextPageNum);
                    if (!nextPageNode) {
                        console.log("No next page node found");
                        return false;
                    }

                    const { nextParagraphPos, nextParagraphNode } = getNextParagraph(doc, thisPos);
                    if (!nextParagraphNode) {
                        console.log("No first paragraph node found");
                        return false;
                    }

                    if (!isNodeEmpty(nextParagraphNode)) {
                        deleteNode(tr, nextParagraphPos, nextParagraphNode);
                    }

                    appendAndReplaceNode(tr, paragraphPos, paragraphNode, nextParagraphNode);

                    const thisNodeEmpty = isNodeEmpty(paragraphNode);
                    const nextNodeEmpty = isNodeEmpty(nextParagraphNode);

                    console.log("This node empty:", thisNodeEmpty);
                    console.log("Next node empty:", nextNodeEmpty);

                    if (thisNodeEmpty) {
                        const $newPos = tr.doc.resolve(thisPos);
                        if (nextNodeEmpty) {
                            moveToNextTextBlock(tr, $newPos);
                        } else {
                            moveToNearestTextSelection(tr, $newPos);
                        }
                    } else {
                        setSelectionAtPos(tr, thisPos);
                    }

                    dispatch(tr);
                    return true;
                },
            }),
            PaginationPlugin,
        ];
    },

    addCommands() {
        return {
            setDocumentPaperSize:
                (paperSize: PaperSize) =>
                ({ tr, dispatch }) => {
                    if (!dispatch) return false;

                    if (!isValidPaperSize(paperSize)) {
                        console.warn(`Invalid paper size: ${paperSize}`);
                        return false;
                    }

                    setPageNodesAttribute(tr, PAGE_NODE_PAPER_SIZE_ATTR, paperSize);

                    dispatch(tr);
                    return true;
                },

            setDocumentDefaultPaperSize:
                () =>
                ({ editor }) =>
                    editor.commands.setDocumentPaperSize(this.options.defaultPaperSize),

            setPagePaperSize:
                (pageNum: number, paperSize: PaperSize) =>
                ({ tr, dispatch }) =>
                    setPageNumPaperSize(tr, dispatch, pageNum, paperSize),

            checkPaperSizes:
                () =>
                ({ tr, dispatch }) => {
                    const { doc } = tr;
                    const paperSizeUpdates: boolean[] = [];
                    doc.descendants((node, pos) => {
                        if (isPageNode(node)) {
                            if (!pageNodeHasPageSize(node)) {
                                paperSizeUpdates.push(setPagePaperSize(tr, dispatch, pos, this.options.defaultPaperSize));
                            }
                        }
                    });

                    // If any page sizes were updated
                    return paperSizeUpdates.some((update) => update);
                },

            setDocumentPaperColour:
                (paperColour: string) =>
                ({ tr, dispatch }) => {
                    if (!dispatch) return false;

                    setPageNodesAttribute(tr, PAGE_NODE_PAPER_COLOUR_ATTR, paperColour);

                    dispatch(tr);
                    return true;
                },

            setDocumentDefaultPaperColour:
                () =>
                ({ editor }) =>
                    editor.commands.setDocumentPaperColour(this.options.defaultPaperColour),

          
        };
    },
});

export default PaginationExtension;
