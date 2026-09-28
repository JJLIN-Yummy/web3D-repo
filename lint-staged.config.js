export default {
  "packages/*/src/**/*.{js,ts,vue}": [
    "eslint --fix",
    "cspell lint --no-must-find-files",
  ],
  "packages/*/src/**/*.{vue,css,scss,less}": ["stylelint --fix"],
  "*.{js,ts,vue,css,scss,json,md}": ["prettier --write"],
};
