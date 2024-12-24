/**
 * @file /src/PaginationExtension.ts
 * @name Pagination
 * @description Custom pagination extension for the Tiptap editor.
 */

import { Extension, isNodeEmpty } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { Selection } from "@tiptap/pm/state";
import PaginationPlugin from "./Plugins/Pagination";
import {
    isHighlighting,
    getResolvedPosition,
    setSelectionAtPos,
    setSelection,
    moveToNextTextBlock,
    moveToNearestTextSelection,
} from "./utils/selection";
import {
    getNextParagraph,
    getParagraphNodeAndPosition,
    getPreviousParagraph,
    getThisPageNodePosition,
    isAtStartOrEndOfParagraph,
    isPageNode,
    isParagraphNode,
    isPosAtEndOfPage,
    isPosAtStartOfPage,
    isPositionWithinParagraph,
    isTextNode,
} from "./utils/pagination";
import { appendAndReplaceNode, deleteNode } from "./utils/node";

const PaginationExtension = Extension.create({
    name: "pagination",
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

                    const { from } = state.selection;
                    const tr = state.tr;
                    const $pos = getResolvedPosition(state);

                    // Ensure that the position is within a valid block (paragraph)
                    if (!isPositionWithinParagraph($pos)) {
                        console.warn("Not inside a paragraph node");
                        return false;
                    }

                    const { paragraphNode } = getParagraphNodeAndPosition(state.doc, $pos);
                    if (!paragraphNode) {
                        console.warn("No current paragraph node found");
                        return false;
                    }

                    // Create a new empty paragraph node
                    const newParagraph = state.schema.nodes.paragraph.create();
                    console.log("Inserting new paragraph at position", from);

                    if (isNodeEmpty(paragraphNode)) {
                        tr.insert(from, newParagraph);
                    } else {
                        if (isAtStartOrEndOfParagraph(state.doc, $pos)) {
                            tr.replaceSelectionWith(newParagraph);
                        } else {
                            const remainingContent = paragraphNode.content.cut($pos.parentOffset);
                            const newContentParagraph = state.schema.nodes.paragraph.create({}, remainingContent);
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

                    const tr = state.tr;
                    const $pos = getResolvedPosition(state);

                    // Ensure that the position is within a valid block (paragraph)
                    if (!isPositionWithinParagraph($pos)) {
                        return false;
                    }

                    if (!isPosAtStartOfPage(state.doc, $pos)) {
                        return false;
                    }

                    // Traverse $pos.path to find the nearest page node
                    const thisNodePos = $pos.pos;
                    const thisPageNodePos = getThisPageNodePosition(state.doc, $pos);
                    const firstChildPos = thisPageNodePos + 1;
                    if (firstChildPos !== thisNodePos - 1) {
                        // Not at the beginning of the page
                        return false;
                    }

                    const prevPageChild = state.doc.childBefore(thisPageNodePos);
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
                    const { paragraphPos, paragraphNode } = getParagraphNodeAndPosition(state.doc, $pos);
                    if (!paragraphNode) {
                        console.warn("No current paragraph node found");
                        return false;
                    }

                    const { prevParagraphPos, prevParagraphNode } = getPreviousParagraph(state.doc, paragraphPos);
                    if (!prevParagraphNode) {
                        console.warn("No previous paragraph node found");
                        return false;
                    }

                    if (!isNodeEmpty(paragraphNode)) {
                        deleteNode(tr, paragraphPos, paragraphNode);
                    }

                    appendAndReplaceNode(tr, prevParagraphPos, prevParagraphNode, paragraphNode);

                    // Set the selection to the end of the previous paragraph
                    const lastChildPosition = tr.doc.resolve(prevPageNode.content.size);
                    const newSelection = Selection.near(lastChildPosition, 1);
                    setSelection(tr, newSelection);
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

                    const tr = state.tr;
                    const $pos = getResolvedPosition(state);

                    // Ensure that the position is within a valid block (paragraph)
                    if (!isPositionWithinParagraph($pos)) {
                        console.warn("Not inside a paragraph node");
                        return false;
                    }

                    if (!isPosAtEndOfPage(state.doc, $pos)) {
                        return false;
                    }

                    // We need to remove the current paragraph node and prepend any
                    // content to the next paragraph node (which will now be at the
                    // end of the current page)
                    const thisPos = $pos.pos;
                    const expectedTextNodePos = thisPos - 1;
                    const thisTextNode = state.doc.nodeAt(expectedTextNodePos);
                    if (!thisTextNode) {
                        console.warn("No node found at position", expectedTextNodePos);
                        return false;
                    }

                    const { paragraphPos, paragraphNode } = getParagraphNodeAndPosition(state.doc, $pos);
                    if (!paragraphNode) {
                        console.warn("No current paragraph node found");
                        return false;
                    }

                    if (!isParagraphNode(thisTextNode) && !isTextNode(thisTextNode)) {
                        console.warn("Unexpected node type found at position", expectedTextNodePos);
                        return false;
                    }

                    const thisPageChild = state.doc.childAfter(paragraphPos);
                    if (!isPageNode(thisPageChild.node)) {
                        console.warn("No page node found");
                        return false;
                    }

                    const pageNum = thisPageChild.index;
                    const nextPageNum = pageNum + 1;
                    if (nextPageNum > state.doc.childCount - 1) {
                        console.log("At end of document");
                        // If we don't handle the delete, the default behaviour will remove this
                        // paragraph node, which we don't want.
                        dispatch(tr);
                        return true;
                    }

                    const nextPageNode = state.doc.child(nextPageNum);
                    if (!nextPageNode) {
                        console.log("No next page node found");
                        return false;
                    }

                    const { nextParagraphPos, nextParagraphNode } = getNextParagraph(state.doc, thisPos);
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
});

export default PaginationExtension;
