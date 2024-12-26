// rollup.config.js

const autoExternal = require("rollup-plugin-auto-external");
const sourcemaps = require("rollup-plugin-sourcemaps");
const commonjs = require("@rollup/plugin-commonjs");
const babel = require("@rollup/plugin-babel");
const typescript = require("rollup-plugin-typescript2");

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

module.exports = config;
