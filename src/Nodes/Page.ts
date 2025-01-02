/**
 * @file /src/Nodes/Page.ts
 * @name Page
 * @description Custom node for creating a page in the editor.
 */

import { Node, NodeViewRendererProps, mergeAttributes } from "@tiptap/core";
import { DOMSerializer, Fragment } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DEFAULT_PAPER_COLOUR, DEFAULT_PAPER_ORIENTATION, DEFAULT_PAPER_PADDING, DEFAULT_PAPER_SIZE } from "../constants/paper";
import {
    PAGE_NODE_NAME,
    PAGE_NODE_PAPER_COLOUR_ATTR,
    PAGE_NODE_PAPER_ORIENTATION_ATTR,
    PAGE_NODE_PAPER_SIZE_ATTR,
} from "../constants/page";
import { getPageNodePaperSize, getPaperDimensions } from "../utils/paperSize";
import { getPageNodePaperColour } from "../utils/paperColour";
import { isPageNode } from "../utils/page";

const baseElement = "div" as const;
const dataPageAttribute = "data-page" as const;

const PageNode = Node.create({
    name: PAGE_NODE_NAME,
    group: "block",
    content: "block*",
    defining: true,
    isolating: false,

    addAttributes() {
        return {
            [PAGE_NODE_PAPER_SIZE_ATTR]: {
                default: DEFAULT_PAPER_SIZE,
            },
            [PAGE_NODE_PAPER_COLOUR_ATTR]: {
                default: DEFAULT_PAPER_COLOUR,
            },
            [PAGE_NODE_PAPER_ORIENTATION_ATTR]: {
                default: DEFAULT_PAPER_ORIENTATION,
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
            dom.classList.add(PAGE_NODE_NAME);

            const paperSize = getPageNodePaperSize(node) ?? DEFAULT_PAPER_SIZE;
            const { width, height } = getPaperDimensions(paperSize);
            dom.style.width = `${width}mm`;
            dom.style.height = `${height}mm`;
            dom.style.padding = `${DEFAULT_PAPER_PADDING}mm`;

            dom.style.border = "1px solid #ccc";

            const paperColour = getPageNodePaperColour(node) ?? DEFAULT_PAPER_COLOUR;
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

    addProseMirrorPlugins() {
        const schema = this.editor.schema;

        // Extend DOMSerializer to override serializeFragment
        const paginationClipboardSerializer = Object.create(DOMSerializer.fromSchema(schema));

        // Override serializeFragment
        paginationClipboardSerializer.serializeFragment = (
            fragment: Fragment,
            options = {},
            target = document.createDocumentFragment()
        ) => {
            const serializer = DOMSerializer.fromSchema(schema);

            fragment.forEach((node) => {
                if (isPageNode(node)) {
                    // Serialize only the children of the page node
                    serializer.serializeFragment(node.content, options, target);
                } else {
                    // Serialize non-page nodes directly
                    serializer.serializeNode(node, options);
                }
            });

            return target;
        };

        return [
            new Plugin({
                key: new PluginKey("pageClipboardPlugin"),
                props: {
                    clipboardSerializer: paginationClipboardSerializer,
                },
            }),
        ];
    },
});

export default PageNode;
