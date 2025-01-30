/**
 * Object containing line information about a paragraph
 */
export type ParagraphLineInfo = {
    /**
     * The number of lines in the paragraph (as visible in the DOM)
     */
    lineCount: number;

    /**
     * The line number of a specific position within the paragraph
     * (as visible in the DOM)
     */
    lineNumber: number;
};
