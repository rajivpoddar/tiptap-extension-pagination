/**
 * @file /src/Plugins/Pagination.ts
 * @name Pagination
 * @description Custom plugin for paginating the editor content.
 */

import { Editor } from "@tiptap/core";
import { Plugin, PluginKey, EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { buildPageView } from "../utils/buildPageView";
// import { isNodeEmpty } from "../utils/nodes/node"; // Removing unused import
// import { doesDocHavePageNodes } from "../utils/nodes/page/page"; // Removing unused import
import { PaginationOptions } from "../PaginationExtension";

type PaginationPluginProps = {
    editor: Editor;
    options: PaginationOptions;
};

const PaginationPlugin = ({ editor, options }: PaginationPluginProps) => {
    return new Plugin({
        key: new PluginKey("pagination"),
        view() {
            let isPaginating = false;

            return {
                update(view: EditorView, prevState: EditorState) {
                    if (isPaginating) return;

                    const { state } = view;
                    const { doc, schema } = state;
                    const pageType = schema.nodes.page;

                    if (!pageType) return; // Schema not ready

                    const docChanged = !doc.eq(prevState.doc);

                    // Only proceed if the document has actually changed and is not empty.
                    // This simplifies the logic and avoids reacting to intermediate empty/placeholder states.
                    if (!docChanged || doc.content.size <= 2) {
                        return;
                    }

                    // The isInitialContentLoaded logic and its setTimeout can be removed for now.
                    // We are relying on docChanged and a non-empty doc to be the trigger.

                    isPaginating = true;
                    try {
                        // buildPageView now internally uses requestAnimationFrame
                        buildPageView(editor, view, options);
                    } finally {
                        isPaginating = false;
                    }
                },
            };
        },
    });
};

export default PaginationPlugin;
