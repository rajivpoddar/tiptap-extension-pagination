/**
 * @file /src/types.d.ts
 * @name types.d.ts
 * @description TypeScript types for the package
 */

declare module "tiptap-extension-pagination" {
    import { Extension } from "@tiptap/core";

    export interface PaginationOptions {
        // Todo
    }

    export const Pagination: Extension<PaginationOptions>;

    export default Pagination;
}
