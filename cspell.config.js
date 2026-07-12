import cspell from "@build/cspell-config";
const config = {
  ...cspell,
  import: [],
  ignorePaths: [...cspell.ignorePaths, "*.config.js"],
};
export default config;
