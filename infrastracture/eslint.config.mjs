import eslint from "@eslint/js";
import tsEslint from "typescript-eslint";
import eslintCdkPlugin from "eslint-cdk-plugin";

export default [
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  ...tsEslint.configs.stylistic,
  {
    files: ["lib/**/*.ts", "bin/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        project: "./tsconfig.json",
      },
    },
    plugins: {
      cdk: eslintCdkPlugin,
    },
    rules: {
      ...eslintCdkPlugin.configs.recommended.rules,
    },
  },
  // 無視するディレクトリを指定
  {
    ignores: ["cdk.out", "node_modules", "*.js"],
  },
];
