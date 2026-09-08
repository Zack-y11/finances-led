// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
    rules: {
      // Workspace packages resolve via pnpm; resolver often misses package exports.
      "import/no-unresolved": [
        "error",
        { ignore: ["^@finance/"] },
      ],
      // @rn-primitives packages are ESM; namespace export analysis is unreliable.
      "import/namespace": "off",
    },
  },
]);
