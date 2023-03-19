module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: ["standard", "plugin:prettier/recommended"],
  plugins: ["import"],
  rules: {
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
    "no-console": "off",
  },
};
