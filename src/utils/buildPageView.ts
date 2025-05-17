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
import { DOMSerializer, Schema, Fragment } from "@tiptap/pm/model";

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
            const { newDoc, oldToNewPosMap } = buildNewDocument(editor, view, options, contentNodes, nodeHeights);

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

interface SplitParagraphResult {
    fittingPart: PMNode | null;
    remainingPart: PMNode | null;
    fittingPartHeight: number;
}

const trySplitParagraphNode = (
    paragraphNode: PMNode,
    availableHeight: number,
    availableWidth: number,
    schema: Schema,
    view: EditorView // For styling context
): SplitParagraphResult | null => {
    // Handle empty node
    if (paragraphNode.content.size === 0) {
        return {
            fittingPart: null,
            remainingPart: null,
            fittingPartHeight: 0,
        };
    }

    const tempDiv = document.createElement("div");
    const prosemirrorHostElement = view.dom.querySelector('.ProseMirror');
    if (!prosemirrorHostElement) {
        // Fallback or error handling if the .ProseMirror element isn't found.
        // Using view.dom directly might give overly broad styles.
        // For now, let's log an error and potentially use view.dom, 
        // but this indicates a potential issue with editor setup or selector.
        console.error("[Pagination] .ProseMirror element not found for style computation. Falling back to view.dom. Measurement accuracy may be affected.");
        // As a less accurate fallback, styles from view.dom could be used, or throw:
        // throw new Error("[Pagination] .ProseMirror element not found for style computation.");
    }
    const editorContentStyle = window.getComputedStyle(prosemirrorHostElement || view.dom); // Use view.dom as a last resort if querySelector fails
    
    // Apply essential styles for accurate measurement.
    // This list might need to be expanded based on your specific editor styling.
    tempDiv.style.fontFamily = editorContentStyle.fontFamily;
    tempDiv.style.fontSize = editorContentStyle.fontSize;
    tempDiv.style.lineHeight = editorContentStyle.lineHeight;
    tempDiv.style.fontWeight = editorContentStyle.fontWeight;
    tempDiv.style.fontStyle = editorContentStyle.fontStyle;
    tempDiv.style.letterSpacing = editorContentStyle.letterSpacing;
    tempDiv.style.wordSpacing = editorContentStyle.wordSpacing;
    tempDiv.style.textIndent = editorContentStyle.textIndent;
    tempDiv.style.textTransform = editorContentStyle.textTransform;
    tempDiv.style.whiteSpace = editorContentStyle.whiteSpace;
    tempDiv.style.paddingTop = editorContentStyle.paddingTop;
    tempDiv.style.paddingBottom = editorContentStyle.paddingBottom;
    tempDiv.style.paddingLeft = editorContentStyle.paddingLeft;
    tempDiv.style.paddingRight = editorContentStyle.paddingRight;
    // Border and margin are usually on the block, not affecting internal height directly unless box-sizing is border-box
    // However, if paragraphs have specific margins/padding that affect their flow or perceived height:    
    // tempDiv.style.marginTop = editorContentStyle.marginTop;
    // tempDiv.style.marginBottom = editorContentStyle.marginBottom;
    tempDiv.style.boxSizing = editorContentStyle.boxSizing; // Crucial: usually 'content-box' or 'border-box'

    tempDiv.style.width = `${availableWidth}px`;
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.top = '-9999px';
    tempDiv.style.left = '-9999px';

    document.body.appendChild(tempDiv);

    const domSerializer = DOMSerializer.fromSchema(schema);
    let bestFitCutPos = 0;

    // Binary search for the largest content slice (offset in the fragment) that fits
    let low = 0;
    let high = paragraphNode.content.size;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (mid === 0) { // An empty slice always fits
            bestFitCutPos = Math.max(bestFitCutPos, mid); // Ensure bestFitCutPos is at least 0
            low = mid + 1;
            continue;
        }

        const sliceToTest = paragraphNode.content.cut(0, mid);
        const domFragmentToTest = domSerializer.serializeFragment(sliceToTest, { document });
        
        tempDiv.innerHTML = ''; // Clear previous content
        tempDiv.appendChild(domFragmentToTest);

        if (tempDiv.offsetHeight <= availableHeight) {
            bestFitCutPos = mid; // This slice fits, store it as a potential best fit
            low = mid + 1;     // Try a larger slice
        } else {
            high = mid - 1;    // Slice is too big, try a smaller one
        }
    }

    let actualSplitPos = bestFitCutPos;
    if (bestFitCutPos > 0 && bestFitCutPos < paragraphNode.content.size) {
        // Try to refine to a word boundary by looking at the text content.
        // This is a simplified approach. A more robust one would inspect PM nodes.
        let textBeforeCut = "";
        paragraphNode.content.cut(0, bestFitCutPos).forEach(n => {
            if (n.isText) {
                textBeforeCut += n.text;
            }
            // Note: This doesn't handle inline nodes that might not have a direct .text property 
            // or represent non-textual boundaries appropriately.
            // For complex content, iterating through the fragment and checking node types/text content
            // more carefully would be needed.
        });

        const lastSpaceIndex = textBeforeCut.lastIndexOf(' ');
        if (lastSpaceIndex !== -1) {
            // Check if the character *after* the last space is indeed part of the word we are trying to keep
            // (i.e., not another space that got included due to trimming or multiple spaces).
            // This requires mapping lastSpaceIndex back to a PM Fragment offset, which is non-trivial with just text.
            
            // Simpler: if lastSpaceIndex is reasonably close to the end of textBeforeCut, assume it's a good split.
            // A more direct approach on PM Fragment:
            let tempPos = bestFitCutPos;
            while (tempPos > 0) {
                // const resolvedPos = paragraphNode.resolve(tempPos); // Resolves position *within the paragraph node itself*
                // Check node before this point, or char in text node
                // const nodeAtPrevPos = resolvedPos.nodeBefore; // This is for doc, not fragment. We need to inspect fragment directly.
                
                // To inspect the fragment directly:
                if (tempPos -1 < textBeforeCut.length && textBeforeCut.charAt(tempPos -1) === ' ') {
                     actualSplitPos = tempPos; // tempPos is an offset in the fragment
                     break;
                }
                // If we are at an actual PM node boundary (not text), that could also be a split point.
                // This requires iterating the fragment's children nodes and their sizes.

                tempPos--;
                if (tempPos === 0 && textBeforeCut.charAt(0) !== ' ') { // Reached start, no space found before the first word
                    actualSplitPos = 0; // Indicate no suitable word boundary split if first word itself is too long
                    break;
                }
            }
        } else if (textBeforeCut.length > 0 && bestFitCutPos > 0) {
            // No space found in the entire fitting text. If it has content, it means a long word.
            // Policy: either split mid-word (current bestFitCutPos) or don't split (actualSplitPos = 0).
            // For now, let's try not to split if no space is found, to avoid breaking long words if possible.
            // This might mean the content won't fit, and the calling logic will handle moving the whole item.
            actualSplitPos = 0; 
        }
    }

    // If after attempting to find a word boundary, actualSplitPos is 0 (and bestFitCutPos was >0),
    // it means no suitable word-boundary split was found that fits, or the first word is too long.
    // In this case, we probably shouldn't split, unless the availableHeight is very small (e.g. less than a line).
    if (actualSplitPos === 0 && bestFitCutPos > 0) {
        // If no word boundary is found and we have a policy against splitting mid-word for the first word,
        // then we indicate no fitting part can be reasonably created by word boundary rules.
        document.body.removeChild(tempDiv);
        return { fittingPart: null, remainingPart: paragraphNode, fittingPartHeight: 0 };
    }

    let fittingFragment: Fragment | null = null;
    let remainingFragment: Fragment | null = null;
    let measuredFittingHeight = 0;

    if (actualSplitPos > 0) {
        fittingFragment = paragraphNode.content.cut(0, actualSplitPos);
        
        // Re-measure the final fittingFragment to get its precise height
        tempDiv.innerHTML = ''; // Clear previous content
        const domFittingFragment = domSerializer.serializeFragment(fittingFragment, { document });
        tempDiv.appendChild(domFittingFragment);
        measuredFittingHeight = tempDiv.offsetHeight;

        // Ensure the re-measured fitting part still fits. If not, something is inconsistent.
        // This can happen if word boundary logic significantly changed the content length or structure.
        // For simplicity, we'll proceed, but a production system might add a check here.
        // if (measuredFittingHeight > availableHeight) { ... handle this unlikely case ... }

        if (actualSplitPos < paragraphNode.content.size) {
            remainingFragment = paragraphNode.content.cut(actualSplitPos);
            // Trim leading space from remainingFragment if necessary
            if (remainingFragment && remainingFragment.firstChild && remainingFragment.firstChild.isText) {
                const firstTextNode = remainingFragment.firstChild;
                if (firstTextNode.text && firstTextNode.text.startsWith(' ')) {
                    const newFirstNodeText = firstTextNode.text.substring(1);
                    const newMarks = firstTextNode.marks;
                    if (newFirstNodeText.length > 0) {
                        remainingFragment = Fragment.from(schema.text(newFirstNodeText, newMarks)).append(remainingFragment.cut(firstTextNode.nodeSize));
                    } else {
                        // If the text node becomes empty after removing the space, just remove it from the fragment
                        if (remainingFragment.childCount > 0) { // Ensure there is a child to cut
                           remainingFragment = remainingFragment.cut(firstTextNode.nodeSize); // Use original firstTextNode.nodeSize if still relevant
                                                                                      // or remainingFragment.firstChild.nodeSize if it has been modified.
                                                                                      // Assuming firstTextNode still refers to the node whose empty text version we are removing.
                        }
                    }
                }
            }
        }
    }

    document.body.removeChild(tempDiv);

    if (fittingFragment) {
        const fittingNode = schema.nodes[paragraphNode.type.name].create(paragraphNode.attrs, fittingFragment);
        const remainingNode = remainingFragment && remainingFragment.size > 0
            ? schema.nodes[paragraphNode.type.name].create(paragraphNode.attrs, remainingFragment)
            : null;
        
        return {
            fittingPart: fittingNode,
            remainingPart: remainingNode,
            fittingPartHeight: measuredFittingHeight,
        };
    }

    // If fittingFragment is null (e.g. actualSplitPos was 0 or initial checks failed)
    return {
        fittingPart: null,
        remainingPart: paragraphNode, // Return original node as remaining if no split occurred
        fittingPartHeight: 0,
    };
};

interface WorkItem {
    node: PMNode;
    originalOldPos: number;
    offsetInOriginalNode: number;
    height: number;
}

/**
 * Build the new document and keep track of new positions.
 *
 * @param editor - The editor instance.
 * @param view - The editor view.
 * @param options - The pagination options.
 * @param contentNodes - The content nodes and their positions.
 * @param nodeHeights - The heights of the content nodes.
 * @returns {newDoc: PMNode, oldToNewPosMap: CursorMap} The new document and the mapping from old positions to new positions.
 */
const buildNewDocument = (
    editor: Editor,
    view: EditorView,
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

    // Helper function to manage page finalization and setup for the next page
    const finalizePageAndPrepareNext = () => {
        const pageNode = addPage(currentPageContent);
        cumulativeNewDocPos += pageNode.nodeSize - getMaybeNodeSize(currentPageHeader); // Adjust based on actual header size used
        currentPageContent = [];
        currentHeight = 0;
        existingPageNode = doc.maybeChild(++pageNum); // Check next existing page for attributes
        if (isPageNumInRange(doc, pageNum)) {
            ({ pageNodeAttributes, pageRegionNodeAttributes, bodyPixelDimensions } = getPaginationNodeAttributes(editor, pageNum));
        } else if (existingPageNode) { // If pageNum is out of range but there was an existingPageNode, reset to default for new pages
            ({ pageNodeAttributes, pageRegionNodeAttributes, bodyPixelDimensions } = getPaginationNodeAttributes(editor, pageNum)); // Assuming getPaginationNodeAttributes can take a flag for defaults
        }
        // else, it keeps the last valid bodyPixelDimensions if creating new pages beyond original count

        currentPageHeader = constructHeader(pageRegionNodeAttributes.header);
        cumulativeNewDocPos += getMaybeNodeSize(currentPageHeader); // Add new header size
        cumulativeNewDocPos += bodyOffset; // Add body offset for the new page
    };

    // Header is constructed prior to the body because we need to know its node size for the cursor mapping
    let currentPageHeader: PMNode | undefined = constructHeader(pageRegionNodeAttributes.header);
    let currentPageContent: PMNode[] = [];
    let currentHeight = 0;

    const oldToNewPosMap: CursorMap = new Map<number, number>();
    const pageOffset = 1, // For the page node itself
        bodyOffset = 1; // For the body node wrapper
    let cumulativeNewDocPos = pageOffset + getMaybeNodeSize(currentPageHeader) + bodyOffset;

    const nodesToProcess: WorkItem[] = contentNodes.map((item, index) => ({
        node: item.node,
        originalOldPos: item.pos,
        offsetInOriginalNode: 0,
        height: nodeHeights[index],
    }));

    while (nodesToProcess.length > 0) {
        const currentWorkItem = nodesToProcess.shift(); // Using shift, effectively a queue
        if (!currentWorkItem) break; // Should not happen if length > 0

        const { node, originalOldPos, offsetInOriginalNode, height: nodeHeight } = currentWorkItem;

        const isPageFull = currentHeight + nodeHeight > bodyPixelDimensions.bodyHeight;

        if (isPageFull) {
            if (currentPageContent.length > 0) { // Current page has content, but this node overflows
                const remainingPageHeight = bodyPixelDimensions.bodyHeight - currentHeight;
                // Attempt to split only if it's a paragraph and there's some reasonable space left
                if (node.type === paragraphType && remainingPageHeight > MIN_PARAGRAPH_HEIGHT / 2) { // MIN_PARAGRAPH_HEIGHT / 2 is a heuristic
                    const splitResult = trySplitParagraphNode(node, remainingPageHeight, bodyPixelDimensions.bodyWidth, schema, view);

                    if (splitResult && splitResult.fittingPart) {
                        // A part of the node fits
                        const { fittingPart, remainingPart, fittingPartHeight } = splitResult;
                        
                        let nodeStartPosInNewDoc = cumulativeNewDocPos;
                        for(const contentNode of currentPageContent) {
                            nodeStartPosInNewDoc += contentNode.nodeSize;
                        }
                        oldToNewPosMap.set(originalOldPos + offsetInOriginalNode, nodeStartPosInNewDoc);
                        currentPageContent.push(fittingPart);
                        currentHeight += fittingPartHeight;

                        if (remainingPart) {
                            // If there's a remaining part, add it to the front of the queue
                            // Its height will need to be re-evaluated or estimated if not returned by trySplit
                            // For now, estimate with a default or MIN_PARAGRAPH_HEIGHT if it's also a paragraph.
                            // A more robust solution would be to measure it or have trySplit return its estimated height.
                            const remainingHeight = remainingPart.type === paragraphType ? MIN_PARAGRAPH_HEIGHT : 0; // Simplified height estimation
                            nodesToProcess.unshift({
                                node: remainingPart,
                                originalOldPos: originalOldPos, // originalOldPos stays the same for all parts of the original node
                                offsetInOriginalNode: offsetInOriginalNode + fittingPart.content.size, // Advance the offset
                                height: remainingHeight, // This height is a placeholder/estimation
                            });
                        }
                        // After adding the fitting part, the page might be full. 
                        // The loop will continue, and if nodesToProcess is not empty, 
                        // it might trigger finalizePageAndPrepareNext in the next iteration or if next node overflows.
                        // Or, if currentHeight exactly fills bodyPixelDimensions.bodyHeight, we could finalize here.
                        if (currentHeight >= bodyPixelDimensions.bodyHeight && nodesToProcess.length > 0) {
                            finalizePageAndPrepareNext();
                        }
                        continue; // Continue to process next item in queue or finalize if needed
                    } else {
                        // Splitting failed or no part fits, move the whole original node to the next page
                        finalizePageAndPrepareNext();
                        nodesToProcess.unshift(currentWorkItem); // Re-process the current item on the new page
                        continue;
                    }
                } else {
                    // Not a paragraph, or not enough space to even attempt a split. Move whole node.
                    finalizePageAndPrepareNext();
                    nodesToProcess.unshift(currentWorkItem);
                    continue;
                }
            } else { // Node is the first on this page, but it's too tall for a full page by itself
                if (node.type === paragraphType) {
                    const splitResult = trySplitParagraphNode(node, bodyPixelDimensions.bodyHeight, bodyPixelDimensions.bodyWidth, schema, view);
                    if (splitResult && splitResult.fittingPart) {
                        const { fittingPart, remainingPart, fittingPartHeight } = splitResult;

                        // oldToNewPosMap is set before pushing to currentPageContent
                        const mapKey = originalOldPos + offsetInOriginalNode;
                        const nodeStartPosInNewDoc = cumulativeNewDocPos;
                        // currentPageContent is empty here, so nodeStartPosInNewDoc is cumulativeNewDocPos
                        oldToNewPosMap.set(mapKey, nodeStartPosInNewDoc);

                        currentPageContent.push(fittingPart);
                        currentHeight += fittingPartHeight;

                        if (remainingPart) {
                            const remainingHeight = remainingPart.type === paragraphType ? MIN_PARAGRAPH_HEIGHT : 0; // Simplified
                            nodesToProcess.unshift({
                                node: remainingPart,
                                originalOldPos: originalOldPos,
                                offsetInOriginalNode: offsetInOriginalNode + fittingPart.content.size,
                                height: remainingHeight,
                            });
                        }
                        // If the fitting part itself makes the page full, and there are more items, finalize.
                        if (currentHeight >= bodyPixelDimensions.bodyHeight && nodesToProcess.length > 0) {
                            finalizePageAndPrepareNext();
                        }
                        continue;
                    } else {
                        // Splitting failed, or the node is simply too large and unsplittable (e.g., large image not handled by split logic).
                        // Add it as is and let it overflow. The map key and pos are set below.
                    }
                } else {
                    // Not a paragraph, but too large for a page. Add as is (overflows).
                }
            }
        } // End of isPageFull block

        // This block executes if: 
        // 1. The node fits (isPageFull was false)
        // 2. The node was too big for an empty page, couldn't be split (or wasn't a para), so it's added as-is (overflowing)
        const mapKey = originalOldPos + offsetInOriginalNode;
        
        // Calculate start position of the current node/fragment within the new document structure
        let nodeStartPosInNewDoc = cumulativeNewDocPos;
        for(const contentNode of currentPageContent) {
            nodeStartPosInNewDoc += contentNode.nodeSize;
        }
        // If currentPageContent is empty, nodeStartPosInNewDoc is already correct (cumulativeNewDocPos)

        oldToNewPosMap.set(mapKey, nodeStartPosInNewDoc);

        currentPageContent.push(node);
        currentHeight += nodeHeight;
    }

    if (currentPageContent.length > 0) {
        // Add final page (may not be full)
        addPage(currentPageContent); // This uses the last pageNum and attributes
    } else if (pages.length === 0 && contentNodes.length === 0) {
        // Handle empty document: add one empty page
        addPage([]);
    } else if (pages.length > 0 && currentPageContent.length === 0) {
         // If the last action was finalizePageAndPrepareNext, pageNum was incremented.
         // If no content was added to this new page, we might have an extra pageNum.
         // However, addPage uses the current pageNum. The page count is derived from `pages.length`.
         // No specific action needed here as addPage wasn't called for an empty final page.
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

    // Adapt contentNodes for mapCursorPosition or pass the original for lookups if necessary
    // For now, this part of mapCursorPosition might need adjustment later
    // if `contentNodes` (original NodePosArray) is required to find the old node range.
    // The `oldToNewPosMap` is the primary source for mapping.

    // A more direct way to use the map if we can find the relevant original node range:
    let bestMatchOldPos = -1;
    let smallestDiff = Infinity;

    // Find the entry in oldToNewPosMap whose oldPos is closest to and less than or equal to oldCursorPos
    // This assumes oldToNewPosMap keys are start positions of original nodes/fragments
    for (const [mapOldPos] of oldToNewPosMap) {
        if (oldCursorPos >= mapOldPos) {
            const diff = oldCursorPos - mapOldPos;
            if (diff < smallestDiff) {
                smallestDiff = diff;
                bestMatchOldPos = mapOldPos;
            }
        }
    }
    
    if (bestMatchOldPos !== -1) {
        const newNodeSegmentStartPos = oldToNewPosMap.get(bestMatchOldPos);

        if (newNodeSegmentStartPos !== undefined) {
            // We need to ensure this potentialPos is valid within the *actual content node* it landed in.
            // This might be tricky if the original node got split and its parts have different lengths than original.
            // The current mapping directly maps start positions. The offset calculation assumes content length parity.

            // For a more robust mapping, after getting `potentialPos`, resolve it and ensure it's valid.
            // The original logic iterating `contentNodes` might still be needed if a split changes node sizes significantly.
            // This is a placeholder for more robust cursor mapping with splits.
            // The original `inRange` check with `contentNodes` might be more reliable.

            // Reverting to a structure closer to original for finding the relevant node for offset calculation,
            // but using the map for the new base position.
            for (let i = 0; i < contentNodes.length; i++) { // Iterate original contentNodes to find which node oldCursorPos was in
                const { node: oldNode, pos: oldNodePos } = contentNodes[i];
                const oldNodeSize = oldNode.nodeSize;

                if (inRange(oldCursorPos, oldNodePos, oldNodePos + oldNodeSize)) { // oldCursorPos is within this original node
                    const offsetInOldNode = oldCursorPos - oldNodePos;
                    
                    // Now, find the corresponding map entry.
                    // If node was split, multiple map entries might originate from `oldNodePos`.
                    // We need the one that corresponds to the segment containing `offsetInOldNode`.
                    // This requires `oldToNewPosMap` to potentially store richer info or `WorkItem` to be queryable.
                    // For now, assume `oldToNewPosMap.get(oldNodePos)` gives the start of the first segment.
                    // This part needs significant refinement once splitting is in.

                    const mappedStartPos = oldToNewPosMap.get(oldNodePos); // This is simplified
                    if (mappedStartPos !== undefined) {
                        let potentialPos = mappedStartPos + offsetInOldNode;
                        potentialPos = Math.min(potentialPos, newDocContentSize -1 ); // Clamp to new doc size
                        potentialPos = Math.max(0, potentialPos); // Clamp to new doc size

                        try {
                            const $resolvedPos = newDoc.resolve(potentialPos);
                            mappedNewCursorPos = $resolvedPos.pos;
                        } catch (resolveError) {
                            console.warn(`[Pagination] Error in mapCursorPosition resolving potentialPos ${potentialPos} (from oldPos ${oldCursorPos}):`, resolveError);
                            // Fallback to the mapped start if resolution fails, or a safe boundary
                            mappedNewCursorPos = Math.max(0, Math.min(mappedStartPos, newDocContentSize - 1));
                        }
                    } else {
                         // If no direct mapping for oldNodePos (e.g. if it was fully skipped, unlikely)
                         mappedNewCursorPos = 0; // Or some other safe fallback
                    }
                    break; // Found the original node
                }
            }
        } else {
            // Fallback if no key in oldToNewPosMap was suitable (e.g. cursor outside all mapped regions)
             mappedNewCursorPos = 0;
        }
    }

    if (mappedNewCursorPos === null) {
        // If loop completed and no mapping found (e.g., oldCursorPos was after all contentNodes)
        const lastOriginalNode = contentNodes[contentNodes.length -1];
        if (contentNodes.length > 0 && lastOriginalNode && oldCursorPos >= lastOriginalNode.pos + lastOriginalNode.node.nodeSize) {
            // Cursor was after all original content. Try to map to end of new document.
            // Find the new position corresponding to the start of the last original node.
            const lastMappedNewPos = oldToNewPosMap.get(lastOriginalNode.pos);
            if (lastMappedNewPos !== undefined) {
                 // Attempt to place cursor at a similar relative position or end of document.
                 // This is a simplification. True end might be lastMappedNewPos + size of that last segment.
                 mappedNewCursorPos = newDocContentSize > 0 ? newDocContentSize -1 : 0;
            } else {
                 mappedNewCursorPos = newDocContentSize > 0 ? newDocContentSize -1 : 0;
            }
        } else {
            // Default fallback if cursor position is indeterminate
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
