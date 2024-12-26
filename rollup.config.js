/**
 * @file rollup.config.js
 * @name rollup.config.js
 * @description Rollup configuration file
 */

import autoExternal from "rollup-plugin-auto-external";
import sourcemaps from "rollup-plugin-sourcemaps";
import commonjs from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import typescript from "rollup-plugin-typescript2";

const config = {
    input: "src/index.ts",
    output: [
        {
            file: "dist/index.cjs.js",
            format: "cjs",
            exports: "named",
        },
        {
            file: "dist/index.js",
            format: "esm",
            exports: "named",
        },
    ],
    plugins: [
        autoExternal({ packagePath: "./package.json" }),
        sourcemaps(),
        commonjs(),
        typescript({
            tsconfig: "./tsconfig.json",
            useTsconfigDeclarationDir: true,
            declaration: true,
        }),
        babel({
            babelHelpers: "bundled",
            extensions: [".ts"],
            exclude: "node_modules/**",
        }),
    ],
    external: [/^@tiptap\//],
};

export default config;
