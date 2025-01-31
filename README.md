# Tiptap Pagination Extension

<h3 align="center">
    A tiptap extension that allows for pages inside your document
</h3>

<br />

<p align="center">
  <a href="https://www.npmjs.com/package/tiptap-extension-pagination">
    <img
     alt="NPM URL"
     src="https://img.shields.io/badge/npm-tiptapExtensionpagination?logo=npm">
  </a>
  <img
     alt="version"
     src="https://img.shields.io/npm/v/tiptap-extension-pagination.svg">
</p>

---

## Installation

```bash
npm install tiptap-extension-pagination
```

## Usage

```ts
/**
 * @file /src/Tiptap/Editor.tsx
 * @name Editor
 * @description Example Tiptap editor with pagination plugin.
 */

import React from "react";
import { Stack } from "@mui/material";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Pagination, { PageNode, HeaderFooterNode, BodyNode } from "tiptap-extension-pagination";

type DispatchOrFunction<T> = Dispatch<T> | ((value: T) => void);

type EditorProps = {
    content: string;
    setContent: DispatchOrFunction<string>;
    editable?: boolean;
};

const Editor: React.FC<EditorProps> = ({ content, setContent, editable = true }) => {
    // ====== Prop Destructuring ======

    // ====== Constants ======

    const extensions = [StarterKit, Pagination, PageNode, HeaderFooterNode, BodyNode];

    // ====== State Variables ======

    // ====== Refs ======

    // ====== Memo Hooks ======

    // ====== Effect Hooks ======

    // ====== Hooks ======

    const editor = useEditor({
        extensions,
        content,
        onUpdate({ editor }) {
            const editorContent = editor.getHTML();
            handleChange(editorContent);
        },
        editable,
        onSelectionUpdate({ editor }) {
            const { state } = editor;
            const { selection } = state;
            const { $from, $to } = selection;
            console.log("Selection updated:", $from.pos, $to.pos);
        },
    });

    // ====== Functions ======

    // ====== Event Handlers ======

    /**
     * Handles change in text.
     * @param value - new text value
     * @returns {void}
     */
    const handleChange = (value: string): void => {
        setContent(value);
    };

    // ====== Render Helpers ======

    // ====== Render ======

    return (
        <Stack direction="column" flexGrow={1} paddingX={2} overflow="auto">
            <EditorContent editor={editor} />
        </Stack>
    );
};

export default Editor;
```

# References

Improved from [clemente-xyz](https://github.com/clemente-xyz)'s comment [here](https://github.com/ueberdosis/tiptap/discussions/5719#discussioncomment-11352489) in TipTap discussion [#5719](https://github.com/ueberdosis/tiptap/discussions/5719).
