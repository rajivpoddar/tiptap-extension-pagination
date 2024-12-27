/**
 * @file /src/Nodes/Page.ts
 * @name Page
 * @description Custom node for creating a page in the editor.
 */

import { Node, NodeViewRendererProps, mergeAttributes } from "@tiptap/core";
import { DEFAULT_PAPER_SIZE, DEFAULT_PAPER_PADDING } from "../constants/paper";
import { PaperSize } from "../types/paper";
import { defaultPaperColour, getPaperDimensions } from "../utils/paper";

const baseElement = "div" as const;
const dataPageAttribute = "data-page" as const;
const pageNodeName = "page" as const;

const PageNode = Node.create({
    name: pageNodeName,
    group: "block",
    content: "block*",
    defining: true,
    isolating: false,

    addAttributes() {
        return {
            paperSize: {
                default: this.options.defaultPaperSize,
            },
            paperColour: {
                default: this.options.defaultPaperColour,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: `${baseElement}[${dataPageAttribute}]`,
                getAttrs: (node) => {
                    const parent = (node as HTMLElement).parentElement;

                    // Prevent nested page nodes
                    if (parent && parent.hasAttribute(dataPageAttribute)) {
                        debugger;
                        return false;
                    }
                    return {};
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [baseElement, mergeAttributes(HTMLAttributes, { [dataPageAttribute]: true, class: "page" }), 0];
    },

    addNodeView() {
        return (props: NodeViewRendererProps) => {
            const { node } = props;
            const dom = document.createElement(baseElement);
            dom.setAttribute(dataPageAttribute, String(true));
            dom.classList.add(pageNodeName);

            const paperSize = (node.attrs.paperSize as PaperSize) || DEFAULT_PAPER_SIZE;
            const { width, height } = getPaperDimensions(paperSize);
            dom.style.width = `${width}mm`;
            dom.style.height = `${height}mm`;
            dom.style.padding = `${DEFAULT_PAPER_PADDING}mm`;

            dom.style.border = "1px solid #ccc";

            const paperColour = (node.attrs.paperColour as string) || defaultPaperColour();
            dom.style.background = paperColour;

            dom.style.overflow = "hidden";
            dom.style.position = "relative";
            dom.style.marginLeft = "auto";
            dom.style.marginRight = "auto";

            const contentDOM = document.createElement(baseElement);
            dom.appendChild(contentDOM);

            return {
                dom,
                contentDOM,
            };
        };
    },
});

export default PageNode;
