export default {
  "*.{js,ts,vue}": ["eslint --fix"],
  "*.{vue,css,scss,less}": ["stylelint --fix"],
  "*.{js,ts,vue,css,scss,json,md}": ["prettier --write"],
};
