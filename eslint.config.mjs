import next from "eslint-config-next"

export default [
  ...next,
  {
    rules: {
      "no-console": ["warn", { allow: ["log", "warn", "error"] }],
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]
