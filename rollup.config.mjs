import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
	input: "src/plugin.ts",
	output: {
		file: "com.codex.aion2stats.sdPlugin/bin/plugin.js",
		format: "cjs",
		sourcemap: true,
	},
	external: [
		"node:assert", "node:buffer", "node:child_process", "node:crypto", "node:events",
		"node:fs", "node:http", "node:https", "node:net", "node:os", "node:path",
		"node:process", "node:stream", "node:tls", "node:url", "node:util", "node:zlib",
		"assert", "buffer", "child_process", "crypto", "events", "fs", "http", "https",
		"net", "os", "path", "process", "stream", "tls", "url", "util", "zlib",
	],
	plugins: [nodeResolve({ preferBuiltins: true }), commonjs(), typescript()],
};
