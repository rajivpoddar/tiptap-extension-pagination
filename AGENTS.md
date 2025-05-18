# AGENTS.md (for tiptap-extension-pagination submodule)

## Submodule Overview
This is the `tiptap-extension-pagination` submodule. Its purpose is to provide pagination capabilities within a Tiptap editor, allowing content to be displayed in a page-like format (e.g., A4).

## Repository Structure (within this submodule)
- Source code: `src/`
  - Main extension logic is likely in `src/paginationExtension.ts` (or similar - *agent should verify actual main file name*).
  - Node definitions (Page, Body, Header/Footer) are in `src/nodes/`.
- Build output: `dist/`
- Configuration files: `package.json`, `rollup.config.js`, `tsconfig.json`, `.prettierrc`.

## Code Style
- Follow the Prettier formatting defined in `.prettierrc` in this directory.
- Adhere to modern TypeScript best practices.

## Local Development & Build (within this submodule)
1.  **Install dependencies:** If not already done, run `npm install` from this directory (`packages/tiptap-extension-pagination`).
2.  **Build:** To build the extension, run `npm run build` from this directory. This will generate output in the `dist/` folder.
    *   *(Agent note: Check `package.json` for other relevant scripts like `dev` or `watch` if continuous local development of the extension is needed.)*

## Testing
- (To be defined - if there are specific test commands for this submodule, list them here. If tests are run from the parent project, note that.)
- Currently, testing is primarily done by integrating with the main `tiptap-pages-demo` application.

## Relationship to Parent Project (`tiptap-pages-demo`)
- This submodule provides core pagination functionality to the main `tiptap-pages-demo` application.
- **Crucial:** After making changes and rebuilding this submodule (using `npm run build` here), you **must** follow the rebuild and reinstallation steps outlined in the main project's root `AGENTS.md` (e.g., `npm run dev:submodule` or `npm run reinstall:submodule` from the project root) for the changes to be reflected in the demo application.

## Expected Agent Behavior (when modifying this submodule)
- Modify code primarily within the `src/` directory.
- Ensure any changes are compatible with the Tiptap ecosystem.
- After making changes, remember the need to rebuild this submodule AND then ensure the parent project rebuilds/reinstalls it.
- Preserve the core functionality of paginating content.
- Refer to this submodule's `README.md` for user-facing configuration and API details. 