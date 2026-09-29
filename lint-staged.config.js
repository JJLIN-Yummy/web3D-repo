export default {
  "*.{js,ts,vue}": ["eslint --fix"],
  "*.{vue,css,scss,less}": ["stylelint --fix --allow-empty-input"],
  "*.{js,ts,vue,css,scss,json,md}": ["prettier --write"],
};
