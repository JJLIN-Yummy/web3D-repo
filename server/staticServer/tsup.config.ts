import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"], // 入口文件
  outDir: "dist", // 输出目录
  format: ["cjs"], // 输出 CommonJS，Node 直接跑
  target: "node18", // 目标 Node 版本
  platform: "node", // 平台为 Node
  clean: true, // 构建前清空 dist
  sourcemap: false, // 生成 sourcemap，方便排查
  dts: false, // 不需要类型声明
  splitting: false, // 不拆分 chunk
  minify: false, // 不压缩，方便排查
  shims: true, // 处理 __dirname 等 ESM 兼容问题
});
