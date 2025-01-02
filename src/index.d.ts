/**
 * @file /src/index.d.ts
 * @name index.d.ts
 * @description TypeScript types for the package
 */

import { PaginationOptions } from "./PaginationExtension";
import type { Extension, Node } from "@tiptap/core";

declare module "tiptap-extension-pagination" {
    export const PageNode: Node;

    const Pagination: Extension<PaginationOptions>;
    export default Pagination;
}
