/**
 * @file /src/index.d.ts
 * @name index.d.ts
 * @description TypeScript types for the package
 */

import { PaginationOptions } from "./PaginationExtension";
import { PageNodeAttributes } from "./types/page";
import type { Extension, Node } from "@tiptap/core";

declare module "tiptap-extension-pagination" {
    export { PaginationOptions, PageNodeAttributes };

    export const PageNode: Node;

    export const Pagination: Extension<PaginationOptions>;
    export default Pagination;
}
