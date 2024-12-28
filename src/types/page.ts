/**
 * @file /src/types/page.ts
 * @name Page
 * @description This file contains type definitions for page sizes.
 */

/**
 * The dimensions of a page in pixels. Deliberately not using PaperDimensions
 * from /src/types/paper.ts to avoid mistakenly using the wrong units.
 */
export type PagePixelDimensions = { pageHeight: number; pageWidth: number };
