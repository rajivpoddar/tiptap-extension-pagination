/**
 * @file /src/constants/tiptap.ts
 * @name TipTap
 * @description Constants for the TipTap editor
 */

// === Font Size ===
export const defaultFontSize: number = 12;

// === Font Family ===
export const fonts = ["Arial", "Times New Roman", "Verdana", "Helvetica", "Georgia"];
export const defaultFontFamily = "Arial";

// === Font Colour ===
export const defaultFontColour = "#000000"; // Black

// === Block Styles ===
export type HeadingBlockType = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type BlockType = "title" | "paragraph" | "quote" | "code" | HeadingBlockType;
export type ParagraphStyle = {
    id: BlockType;
    display: string;
};

const numHeaderStyles: number = 6;

export const blockLevels = Array.from({ length: numHeaderStyles }, (_, index) => index + 1);

export const headingStyles: ParagraphStyle[] = Array.from(
    { length: numHeaderStyles },
    (_, index) =>
        ({
            id: `h${index + 1}`,
            display: `Heading ${index + 1}`,
        } as ParagraphStyle)
);

export const paragraphStyles: ParagraphStyle[] = [
    { id: "paragraph", display: "Normal Text" },
    { id: "title", display: "Title" },
    ...headingStyles,
    { id: "code", display: "Code" },
    { id: "quote", display: "Quote" },
];

export const headingBlocks: HeadingBlockType[] = Array.from({ length: numHeaderStyles }, (_, index) => `h${index + 1}` as HeadingBlockType);
export const blockTypes: BlockType[] = [...headingBlocks, "title", "paragraph", "quote", "code"];
export const defaultBlockType: BlockType = "paragraph";

// === Text Align ===
export type TextAlign = "left" | "center" | "right" | "justify";
export const textAligns: TextAlign[] = ["left", "center", "right", "justify"];
export const defaultTextAlign: TextAlign = "left";

// === Pagination ===

// A4
export const a4Width: number = 210;
export const a4Height: number = 297;
export const a4Padding: number = 10;

export const MIN_PARAGRAPH_HEIGHT = 45;

// === Expressions ===

export type ExpressionMode = "value" | "code";

export type ExpressionNodeAttrs = {
    mode: ExpressionMode;
    code: string;
};
