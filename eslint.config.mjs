import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disable unused variable warnings
      "@typescript-eslint/no-unused-vars": "off",
      
      // Disable explicit any warnings
      "@typescript-eslint/no-explicit-any": "off",
      
      // Disable img element warnings (allow using img instead of Next.js Image)
      "@next/next/no-img-element": "off",
      
      // Disable var usage warnings
      "no-var": "off",
      
      // Disable missing alt text warnings
      "jsx-a11y/alt-text": "off",
      
      // Disable missing dependency warnings in useEffect/useCallback
      "react-hooks/exhaustive-deps": "off",
      
      // Disable unescaped entities warnings
      "react/no-unescaped-entities": "off",
    },
  },
];

export default eslintConfig;
