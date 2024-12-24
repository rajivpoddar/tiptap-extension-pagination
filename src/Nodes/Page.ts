/**
 * @file /src/Nodes/Page.ts
 * @name Page
 * @description Custom node for creating a page in the editor.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { a4Height, a4Padding, a4Width } from "../constants/tiptap";

const baseElement = "div" as const;
const dataPageAttribute = "data-page" as const;
const pageNodeName = "page" as const;

const PageNode = Node.create({
    name: pageNodeName,
    group: "block",
    content: "block*",
    defining: true,
    isolating: false,

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
        return () => {
            const dom = document.createElement(baseElement);
            dom.setAttribute(dataPageAttribute, String(true));
            dom.classList.add(pageNodeName);
            dom.style.height = `${a4Height}mm`;
            dom.style.width = `${a4Width}mm`;
            dom.style.padding = `${a4Padding}mm`;
            dom.style.border = "1px solid #ccc";
            dom.style.background = "#222";
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
