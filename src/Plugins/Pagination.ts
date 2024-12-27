/**
 * @file /src/Plugins/Pagination.ts
 * @name Pagination
 * @description Custom plugin for paginating the editor content.
 */

import { Plugin, PluginKey, EditorState } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import {
    buildNewDocument,
    collectContentNodes,
    doesDocHavePageNodes,
    mapCursorPosition,
    measureNodeHeights,
    paginationUpdateCursorPosition,
} from "../utils/pagination";

const PaginationPlugin = new Plugin({
    key: new PluginKey("pagination"),
    view() {
        let isPaginating = false;

        return {
            update(view: EditorView, prevState: EditorState) {
                if (isPaginating) return;

                const { state } = view;
                const pageType = state.schema.nodes.page;

                if (!pageType) return;

                const docChanged = !view.state.doc.eq(prevState.doc);
                const initialLoad = prevState.doc.content.size === 0 && state.doc.content.size > 0;

                const hasPageNodes = doesDocHavePageNodes(state);

                if (!docChanged && hasPageNodes && !initialLoad) return;

                isPaginating = true;

                const contentNodes = collectContentNodes(state);
                const nodeHeights = measureNodeHeights(view, contentNodes);

                // Record the cursor's old position
                const { selection } = view.state;
                const oldCursorPos = selection.from;

                const { newDoc, oldToNewPosMap } = buildNewDocument(state, contentNodes, nodeHeights);

                // Compare the content of the documents
                if (newDoc.content.eq(state.doc.content)) {
                    isPaginating = false;
                    return;
                }

                const tr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content);
                tr.setMeta("pagination", true);

                const newCursorPos = mapCursorPosition(contentNodes, oldCursorPos, oldToNewPosMap);
                paginationUpdateCursorPosition(tr, newCursorPos);

                view.dispatch(tr);

                isPaginating = false;
            },
        };
    },
});

export default PaginationPlugin;
