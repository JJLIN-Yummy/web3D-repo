/// <reference types="vite/client" />

/**
 * Vite 环境变量类型定义
 * 新增变量直接在这里追加，自动获得TS提示
 */
interface ImportMetaEnv {
  readonly VITE_STATIC_RESOURCE_URL: string;
  // 后续新增 VITE_xxx 写在这里
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
