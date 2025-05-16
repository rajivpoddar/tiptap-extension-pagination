/**
 * @file /src/utils/buildPageView.ts
 * @name BuildPageView
 * @description Utility functions for building the page view.
 */

import { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { Transaction } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { PaginationOptions } from "../PaginationExtension";
import { MIN_PARAGRAPH_HEIGHT } from "../constants/pagination";
import { NodePosArray } from "../types/node";
import { CursorMap } from "../types/cursor";
import { Nullable, Undefinable } from "../types/record";
import { moveToNearestValidCursorPosition, moveToThisTextBlock, setSelection, setSelectionAtEndOfDocument } from "./selection";
import { inRange } from "./math";
import { getPaginationNodeAttributes } from "./nodes/page/attributes/getPageAttributes";
import { isParagraphNode } from "./nodes/paragraph";
import { isTextNode } from "./nodes/text";
import { getPaginationNodeTypes } from "./pagination";
import { isPageNumInRange } from "./nodes/page/pageRange";
import { HeaderFooter, HeaderFooterNodeAttributes } from "../types/pageRegions";
import { getPageRegionNode } from "./pageRegion/getAttributes";
import { getMaybeNodeSize } from "./nodes/node";
import { isPageNode } from "./nodes/page/page";
import { isHeaderFooterNode } from "./nodes/headerFooter/headerFooter";
import { isBodyNode } from "./nodes/body/body";
import { Editor } from "@tiptap/core";

/**
 * Builds a new document with paginated content.
 *
 * @param view - The editor view.
 * @param options - The pagination options.
 * @returns {void}
 */
export const buildPageView = (editor: Editor, view: EditorView, options: PaginationOptions): void => {
    requestAnimationFrame(() => {
        const { state, dispatch } = view;
        const { doc } = state;

        try {
            const contentNodes = collectContentNodes(doc);

            const nodeHeights = measureNodeHeights(view, contentNodes);
            const oldCursorPos = state.selection.from;
            const { newDoc, oldToNewPosMap } = buildNewDocument(editor, options, contentNodes, nodeHeights);

            if (!newDoc.content.eq(doc.content)) {
                const tr = state.tr;
                tr.replaceWith(0, doc.content.size, newDoc.content);
                tr.setMeta("pagination", true);
                const newCursorPos = mapCursorPosition(contentNodes, oldCursorPos, oldToNewPosMap, newDoc);
                paginationUpdateCursorPosition(tr, newCursorPos);
                if (tr.docChanged || tr.selectionSet) {
                    dispatch(tr);
                }
            } else {
                const newCursorPos = mapCursorPosition(contentNodes, oldCursorPos, oldToNewPosMap, doc);
                if (newCursorPos !== null && newCursorPos !== oldCursorPos) {
                    const tr = state.tr;
                    paginationUpdateCursorPosition(tr, newCursorPos);
                    if (tr.selectionSet) {
                        dispatch(tr);
                    }
                }
            }
        } catch (error) {
            console.error("Error updating page view. Details:", error);
        }
    });
};

/**
 * Collect content nodes and their existing positions.
 *
 * @param doc - The document node.
 * @returns {NodePosArray} The content nodes and their positions.
 */
const collectContentNodes = (doc: PMNode): NodePosArray => {
    const contentNodes: NodePosArray = [];
    doc.forEach((pageNode, pageOffset) => {
        if (isPageNode(pageNode)) {
            pageNode.forEach((pageRegionNode, pageRegionOffset) => {
                // Offsets in forEach loop start from 0, however, the child nodes of any given node
                // have a starting offset of 1 (for the first child)
                const truePageRegionOffset = pageRegionOffset + 1;

                if (isHeaderFooterNode(pageRegionNode)) {
                    // Don't collect header/footer nodes
                } else if (isBodyNode(pageRegionNode)) {
                    pageRegionNode.forEach((child, childOffset) => {
                        // First child of body node (e.g. paragraph) has an offset of 1 more
                        // than the body node itself.
                        const trueChildOffset = childOffset + 1;

                        contentNodes.push({ node: child, pos: pageOffset + truePageRegionOffset + trueChildOffset });
                    });
                } else {
                    contentNodes.push({ node: pageRegionNode, pos: pageOffset + truePageRegionOffset });
                }
            });
        } else {
            contentNodes.push({ node: pageNode, pos: pageOffset });
        }
    });

    return contentNodes;
};

/**
 * Calculates the margins of the element.
 *
 * @param element - The element to calculate margins for.
 * @returns {MarginConfig} The margins of the element.
 */
const calculateElementMargins = (element: HTMLElement): {
    top: number;
    right: number;
    bottom: number;
    left: number;
} => {
    const style = window.getComputedStyle(element);
    return {
        top: parseFloat(style.marginTop),
        right: parseFloat(style.marginRight),
        bottom: parseFloat(style.marginBottom),
        left: parseFloat(style.marginLeft),
    };
};

/**
 * Measure the heights of the content nodes.
 *
 * @param view - The editor view.
 * @param contentNodes - The content nodes and their positions.
 * @returns {number[]} The heights of the content nodes.
 */
const measureNodeHeights = (view: EditorView, contentNodes: NodePosArray): number[] => {
    const paragraphType = view.state.schema.nodes.paragraph;

    const nodeHeights = contentNodes.map(({ pos, node }) => {
        let domNode: Node | null | undefined = null;
        try {
            if (!view.dom) {
                return MIN_PARAGRAPH_HEIGHT;
            }
            if (pos < 0 || pos > view.state.doc.content.size) {
                return MIN_PARAGRAPH_HEIGHT;
            }
            view.state.doc.resolve(pos);
            domNode = view.nodeDOM(pos);
        } catch (e) {
            console.error(`[Pagination] Error in measureNodeHeights during resolve/nodeDOM for node ${node.type.name} at pos ${pos}:`, e);
            return MIN_PARAGRAPH_HEIGHT;
        }

        if (!domNode) {
            return MIN_PARAGRAPH_HEIGHT;
        } else if (!(domNode instanceof HTMLElement)) {
            return MIN_PARAGRAPH_HEIGHT;
        }

        const { height: BCRHeight } = domNode.getBoundingClientRect();
        const { top: marginTop, bottom: marginBottom } = calculateElementMargins(domNode);
        let calculatedHeight = BCRHeight;

        if (calculatedHeight === 0) {
            if (node.type === paragraphType || node.isTextblock) {
                calculatedHeight = MIN_PARAGRAPH_HEIGHT;
            }
        }
        const finalHeightForPagination = calculatedHeight + marginTop + marginBottom;
        return finalHeightForPagination;
    });

    return nodeHeights;
};

/**
 * Build the new document and keep track of new positions.
 *
 * @param editor - The editor instance.
 * @param options - The pagination options.
 * @param contentNodes - The content nodes and their positions.
 * @param nodeHeights - The heights of the content nodes.
 * @returns {newDoc: PMNode, oldToNewPosMap: CursorMap} The new document and the mapping from old positions to new positions.
 */
const buildNewDocument = (
    editor: Editor,
    options: PaginationOptions,
    contentNodes: NodePosArray,
    nodeHeights: number[]
): { newDoc: PMNode; oldToNewPosMap: CursorMap } => {
    const { schema, doc } = editor.state;
    const { pageAmendmentOptions } = options;
    const {
        pageNodeType: pageType,
        headerFooterNodeType: headerFooterType,
        bodyNodeType: bodyType,
        paragraphNodeType: paragraphType,
    } = getPaginationNodeTypes(schema);

    let pageNum = 0;
    const pages: PMNode[] = [];
    let existingPageNode: Nullable<PMNode> = doc.maybeChild(pageNum);
    let { pageNodeAttributes, pageRegionNodeAttributes, bodyPixelDimensions } = getPaginationNodeAttributes(editor, pageNum);

    const constructHeaderFooter =
        <HF extends HeaderFooter>(pageRegionType: HeaderFooter) =>
        (headerFooterAttrs: HeaderFooterNodeAttributes<HF>): PMNode | undefined => {
            if (!headerFooterType) return;

            if (existingPageNode) {
                const hfNode = getPageRegionNode(existingPageNode, pageRegionType);
                if (hfNode) {
                    return hfNode;
                }
            }

            const emptyParagraph = paragraphType.create();
            return headerFooterType.create(headerFooterAttrs, [emptyParagraph]);
        };

    const constructHeader = <HF extends HeaderFooter>(headerFooterAttrs: HeaderFooterNodeAttributes<HF>) => {
        if (!pageAmendmentOptions.enableHeader) return;
        return constructHeaderFooter("header")(headerFooterAttrs);
    };
    const constructFooter = <HF extends HeaderFooter>(headerFooterAttrs: HeaderFooterNodeAttributes<HF>) => {
        if (!pageAmendmentOptions.enableFooter) return;
        return constructHeaderFooter("footer")(headerFooterAttrs);
    };

    const constructPageRegions = (currentPageContent: PMNode[]): PMNode[] => {
        const { body: bodyAttrs, footer: footerAttrs } = pageRegionNodeAttributes;
        const pageBody = bodyType.create(bodyAttrs, currentPageContent);
        const pageFooter = constructFooter(footerAttrs);

        const pageRegions: Undefinable<PMNode>[] = [currentPageHeader, pageBody, pageFooter];
        return pageRegions.filter((region) => !!region);
    };

    const addPage = (currentPageContent: PMNode[]): PMNode => {
        const pageNodeContents = constructPageRegions(currentPageContent);
        const pageNode = pageType.create(pageNodeAttributes, pageNodeContents);
        pages.push(pageNode);
        return pageNode;
    };

    // Header is constructed prior to the body because we need to know its node size for the cursor mapping
    let currentPageHeader: PMNode | undefined = constructHeader(pageRegionNodeAttributes.header);
    let currentPageContent: PMNode[] = [];
    let currentHeight = 0;

    const oldToNewPosMap: CursorMap = new Map<number, number>();
    const pageOffset = 1,
        bodyOffset = 1;
    let cumulativeNewDocPos = pageOffset + getMaybeNodeSize(currentPageHeader) + bodyOffset;

    for (let i = 0; i < contentNodes.length; i++) {
        const { node, pos: oldPos } = contentNodes[i];
        const nodeHeight = nodeHeights[i];

        const isPageFull = currentHeight + nodeHeight > bodyPixelDimensions.bodyHeight;
        if (isPageFull && currentPageContent.length > 0) {
            const pageNode = addPage(currentPageContent);
            cumulativeNewDocPos += pageNode.nodeSize - getMaybeNodeSize(currentPageHeader);
            currentPageContent = [];
            currentHeight = 0;
            existingPageNode = doc.maybeChild(++pageNum);
            if (isPageNumInRange(doc, pageNum)) {
                ({ pageNodeAttributes, pageRegionNodeAttributes, bodyPixelDimensions } = getPaginationNodeAttributes(editor, pageNum));
            }

            // Next page header
            currentPageHeader = constructHeader(pageRegionNodeAttributes.header);
            cumulativeNewDocPos += getMaybeNodeSize(currentPageHeader);
        }

        // Record the mapping from old position to new position
        const nodeStartPosInNewDoc = cumulativeNewDocPos + currentPageContent.reduce((sum, n) => sum + n.nodeSize, 0);

        oldToNewPosMap.set(oldPos, nodeStartPosInNewDoc);

        currentPageContent.push(node);
        currentHeight += nodeHeight;
    }

    if (currentPageContent.length > 0) {
        // Add final page (may not be full)
        addPage(currentPageContent);
    } else {
        pageNum--;
    }

    const newDoc = schema.topNodeType.create(null, pages);
    const docSize = newDoc.content.size;
    limitMappedCursorPositions(oldToNewPosMap, docSize);

    return { newDoc, oldToNewPosMap };
};

/**
 * Limit mapped cursor positions to document size to prevent out of bounds errors
 * when setting the cursor position.
 *
 * @param oldToNewPosMap - The mapping from old positions to new positions.
 * @param docSize - The size of the new document.
 * @returns {void}
 */
const limitMappedCursorPositions = (oldToNewPosMap: CursorMap, docSize: number): void => {
    oldToNewPosMap.forEach((newPos, oldPos) => {
        if (newPos > docSize) {
            oldToNewPosMap.set(oldPos, docSize);
        }
    });
};

/**
 * Map the cursor position from the old document to the new document.
 *
 * @param contentNodes - The content nodes and their positions.
 * @param oldCursorPos - The old cursor position.
 * @param oldToNewPosMap - The mapping from old positions to new positions.
 * @param newDoc - The new document node.
 * @returns {number} The new cursor position.
 */
const mapCursorPosition = (contentNodes: NodePosArray, oldCursorPos: number, oldToNewPosMap: CursorMap, newDoc: PMNode) => {
    let mappedNewCursorPos: Nullable<number> = null;
    const newDocContentSize = newDoc.content.size;

    for (let i = 0; i < contentNodes.length; i++) {
        const { node: oldNode, pos: oldNodePos } = contentNodes[i];
        const oldNodeSize = oldNode.nodeSize;

        if (inRange(oldCursorPos, oldNodePos, oldNodePos + oldNodeSize)) {
            const offsetInOldNode = oldCursorPos - oldNodePos;
            const newNodeStartPos = oldToNewPosMap.get(oldNodePos);

            if (newNodeStartPos === undefined) {
                mappedNewCursorPos = 0;
            } else {
                let potentialPos = newNodeStartPos + offsetInOldNode;
                potentialPos = Math.min(potentialPos, newDocContentSize -1);
                potentialPos = Math.max(0, potentialPos);
                try {
                    const $resolvedPos = newDoc.resolve(potentialPos);
                    mappedNewCursorPos = $resolvedPos.pos;
                } catch (resolveError) {
                    console.warn(`[Pagination] Error in mapCursorPosition resolving potentialPos ${potentialPos} (from oldPos ${oldCursorPos}):`, resolveError);
                    mappedNewCursorPos = Math.max(0, Math.min(newNodeStartPos, newDocContentSize - 1));
                }
            }
            break;
        }
    }

    if (mappedNewCursorPos === null) {
        if (contentNodes.length > 0 && oldCursorPos >= contentNodes[contentNodes.length - 1].pos + contentNodes[contentNodes.length - 1].node.nodeSize) {
            mappedNewCursorPos = newDocContentSize > 0 ? newDocContentSize -1 : 0;
        } else {
            mappedNewCursorPos = 0;
        }
    }
    return mappedNewCursorPos;
};

/**
 * Check if the given position is at the start of a text block.
 *
 * @param doc - The document node.
 * @param $pos - The resolved position in the document.
 * @returns {boolean} True if the position is at the start of a text block, false otherwise.
 */
const isNodeBeforeAvailable = ($pos: ResolvedPos): boolean => {
    return !!$pos.nodeBefore && (isTextNode($pos.nodeBefore) || isParagraphNode($pos.nodeBefore));
};

/**
 * Check if the given position is at the end of a text block.
 *
 * @param doc - The document node.
 * @param $pos - The resolved position in the document.
 * @returns {boolean} True if the position is at the end of a text block, false otherwise.
 */
const isNodeAfterAvailable = ($pos: ResolvedPos): boolean => {
    return !!$pos.nodeAfter && (isTextNode($pos.nodeAfter) || isParagraphNode($pos.nodeAfter));
};

/**
 * Sets the cursor selection after creating the new document.
 *
 * @param tr - The current transaction.
 * @returns {void}
 */
const paginationUpdateCursorPosition = (tr: Transaction, newCursorPos: Nullable<number>): void => {
    if (newCursorPos !== null) {
        const $pos = tr.doc.resolve(newCursorPos);
        let selection;

        if ($pos.parent.isTextblock || isNodeBeforeAvailable($pos) || isNodeAfterAvailable($pos)) {
            selection = moveToThisTextBlock(tr, $pos);
        } else {
            selection = moveToNearestValidCursorPosition($pos);
        }

        if (selection) {
            setSelection(tr, selection);
        } else {
            // Fallback to a safe selection at the end of the document
            setSelectionAtEndOfDocument(tr);
        }
    } else {
        setSelectionAtEndOfDocument(tr);
    }
};
