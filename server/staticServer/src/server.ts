import type { Request, Response } from "express";
import express from "express";
import OSS from "ali-oss";
import dotenv from "dotenv";
import type { responseType } from "@common/request";
import cors from "cors";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = process.env.NODE_ENV || "development";

const isDev = process.env.NODE_ENV === "development";

// 先加载共享 .env，再加载环境特有 .env.${env}
dotenv.config({
  path: [
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, `../.env.${env}`),
  ],
  override: true, // 后面的覆盖前面的
});

const app = express();

app.use(cors());
// app.use('/public', express.static(path.join(__dirname, '../public'), {
//     maxAge: '7d',
//     setHeaders: (res, filePath) => {
//         const ext = path.extname(filePath).toLowerCase()
//         // console.log(filePath,path.extname(filePath))
//         const mimeMap:{[k in string]: string} = {
//             // 3D 模型
//             '.glb': 'model/gltf-binary',
//             '.gltf': 'model/gltf+json',
//             // 环境贴图
//             '.hdr': 'image/vnd.radiance',
//             '.exr': 'image/x-exr',
//             '.ktx2': 'image/ktx2',
//             // 图片
//             '.jpg': 'image/jpeg',
//             '.jpeg': 'image/jpeg',
//             '.png': 'image/png',
//             '.webp': 'image/webp',
//             '.svg': 'image/svg+xml',
//         }
//
//         if (mimeMap[ext]) {
//             res.setHeader('Content-Type', mimeMap[ext])
//         }
//     },
// }))

// 从环境变量读取配置，缺失时直接报错，避免运行时才发现
const region = process.env.VITE_OSS_REGION;
const accessKeyId = process.env.VITE_OSS_ACCESS_KEY_ID;
const accessKeySecret = process.env.VITE_OSS_ACCESS_KEY_SECRET;
const bucket = process.env.VITE_OSS_BUCKET;
const port = Number(process.env.VITE_PORT) || 3000;

if (!region || !accessKeyId || !accessKeySecret || !bucket) {
  throw new Error("缺少 OSS 环境变量，请检查 .env 文件");
}

// 初始化 OSS 客户端（私有 Bucket 默认即可）
const client = new OSS({
  region,
  accessKeyId,
  accessKeySecret,
  bucket,
});

/**
 * 生成签名 URL 的接口
 * GET /api/get-model-url?name=models/table.glb&expires=3600
 */
app.get("/api/get-model-url", (req: Request, res: Response) => {
  try {
    const name = req.query.name as string | undefined;
    const expires = Number(req.query.expires) || 3600; // 默认 1 小时

    if (!name) {
      return res.status(400).json({ error: "缺少 name 参数" });
    }

    const url = client.signatureUrl(name, {
      expires,
      // 如果路径里有中文或特殊字符，建议开启
      // slashSafe: true,
    });

    return res.json({
      IsSuccess: true,
      Value: {
        url,
      },
      Message: "ok",
    });
  } catch (err) {
    console.error("生成签名失败:", err);
    return res.status(500).json({
      IsSuccess: false,
      Value: null,
      Message: "生成签名失败",
    });
  }
});

// 健康检查
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    IsSuccess: true,
    Value: null,
    Message: "ok",
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// import express from "express";
// import cors from "cors";
// import path from "node:path";
// import { fileURLToPath } from "node:url";
//
// const app = express();
// const PORT = 3001;
//
// app.use(cors());
// app.use(express.json());
//
// // ========== ESM 获取 __dirname 固定写法 ==========
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// // ================================================
//
// // ===================== 本地模型静态托管 =====================
// // 静态目录指向项目根目录 public-models
// const modelRoot = path.join(__dirname, "../public");
//
// app.use("/public", express.static(modelRoot, {
//     setHeaders(res, filePath) {
//         // 根据后缀设置MIME类型
//         if (filePath.endsWith(".glb")) {
//             res.setHeader("Content-Type", "model/gltf-binary");
//         } else if (filePath.endsWith(".gltf")) {
//             res.setHeader("Content-Type", "model/gltf+json");
//         } else if (filePath.endsWith(".hdr")) {
//             res.setHeader("Content-Type", "image/vnd.radiance");
//         } else if (filePath.endsWith(".png")) {
//             res.setHeader("Content-Type", "image/png");
//         } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
//             res.setHeader("Content-Type", "image/jpeg");
//         } else if (filePath.endsWith(".blend")) {
//             // blend 原始二进制文件
//             res.setHeader("Content-Type", "application/octet-stream");
//         }
//         // 开发环境：不缓存
//         res.setHeader("Cache-Control", "no-cache");
//     }
// }));
//
//
//
// app.listen(PORT, () => {
//     console.log(`✅ Express 服务启动 http://localhost:${PORT}`);
//     console.log(`📦 模型静态地址前缀: http://localhost:${PORT}/models`);
//     console.log(`🔗 资源接口: GET http://localhost:${PORT}/api/get-asset?path=models/xxx.glb`);
// });
