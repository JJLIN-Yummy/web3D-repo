import type { PluginOption } from "vite";
import visualizer from "rollup-plugin-visualizer";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import RekaResolver from "reka-ui/resolver";
import AutoImport from "unplugin-auto-import/vite";

export function createVitePlugins(): PluginOption[] {
  // 兼容CJS默认导出
  const visualizerPlugin = (visualizer as any).default ?? visualizer;
  // 开发环境不需要体积分析，仅打包时启用
  const plugins = [
    vue(),
    AutoImport({
      imports: ["vue"],
    }),
    Components({
      dts: "src/components.d.ts", // ✅必须开启，才会生成Reka组件全局类型
      resolvers: [RekaResolver()],
    }),
  ];

  if (process.env.NODE_ENV === "production") {
    plugins.push(
      visualizerPlugin({
        open: true,
        filename: "stats.html",
        gzipSize: true,
      })
    );
  }
  return plugins;
}
