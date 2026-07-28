export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ns: "readonly",
        console: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none" }],
      "no-undef": "error",
      eqeqeq: "warn",
      "no-console": "off",
      "no-constant-condition": ["error", { checkLoops: false }]
    }
  }
];