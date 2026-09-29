/** @type {import('stylelint').Config} */
export default {
  extends: ["stylelint-config-standard", "stylelint-config-standard-vue"],
  // 忽略文件：tailwind生成css、构建产物
  ignores: [
    // '**/tailwind.css',
    "**/debug-tw.css",
    "**/debug-tw.css",
    "**/build/**",
    "**/dist/**",
  ],
  rules: {
    // 允许 @tailwind base; 指令，不然会报unknown at-rule
    "at-rule-no-unknown": [
      true,
      {
        ignoreAtRules: ["tailwind", "apply", "layer", "screen"],
      },
    ],
    // 关闭一些比较严格的规则，可选
    "selector-class-pattern": null,
  },
};
