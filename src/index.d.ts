/**
 * @file /src/index.d.ts
 * @name index.d.ts
 * @description TypeScript types for the package
 */

declare module "tiptap-extension-pagination" {
    import { Extension, Node } from "@tiptap/core";

    export interface PaginationOptions {
        // Todo
    }

    export const PageNode: Node;

    export const Pagination: Extension<PaginationOptions>;
    export default Pagination;
}
