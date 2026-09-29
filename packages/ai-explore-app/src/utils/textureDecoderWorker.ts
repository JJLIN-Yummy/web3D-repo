import * as THREE from "three";

// TextureDecoderWorker.ts
class TextureDecoderWorker {
  private worker: Worker;
  // 存储pending请求，requestId映射resolve/reject/定时器
  private pendingRequests = new Map<
    string,
    {
      resolve: (bitmap: ImageBitmap) => void;
      reject: (err: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  // 超时时间5秒
  private readonly TIMEOUT = 5000;

  constructor() {
    // 创建web worker（Vite标准写法）
    this.worker = new Worker(
      new URL("../worker/decodeImageWorker.ts", import.meta.url),
      {
        type: "module",
      }
    );

    // 只绑定一次message监听
    this.worker.addEventListener("message", (e) => {
      const { requestId, type, bitmap, msg } = e.data;
      const pending = this.pendingRequests.get(requestId);
      if (!pending) return;

      clearTimeout(pending.timer);
      this.pendingRequests.delete(requestId);

      if (type === "success") {
        pending.resolve(bitmap);
      } else {
        pending.reject(new Error(msg));
      }
    });
  }

  /**
   * 对外方法：加载图片二进制 + Worker解码
   * @param url 图片地址
   * @returns {bitmap:ImageBitmap, requestId:string}
   */
  async decodeTexture(
    url: string
  ): Promise<{ bitmap: ImageBitmap; requestId: string }> {
    // 生成本次请求唯一ID
    const requestId = crypto.randomUUID();

    // fetch获取图片二进制数据
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    const mimeType = res.headers.get("content-type") || "image/png";

    return new Promise((resolve, reject) => {
      // 超时计时器
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`解码超时: ${url}`));
      }, this.TIMEOUT);

      // 注册pending回调
      this.pendingRequests.set(requestId, {
        resolve: (bitmap) => resolve({ bitmap, requestId }),
        reject,
        timer,
      });

      // 发送数据给worker，transfer arrayBuffer，零拷贝
      this.worker.postMessage(
        {
          requestId,
          arrayBuffer,
          mimeType,
        },
        [arrayBuffer]
      );
    });
  }

  /**
   * 取消未完成的解码任务（瓦片走远不需要图片时调用）
   */
  cancelRequest(requestId: string) {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingRequests.delete(requestId);
      pending.reject(new Error("任务被取消"));
    }
  }

  /**
   * 销毁worker，页面卸载调用
   */
  destroy() {
    this.worker.terminate();
    this.pendingRequests.clear();
  }
}

// 实例化
export const textureDecoder = new TextureDecoderWorker();

export async function loadTileTexture(url: string) {
  let reqId: string;
  try {
    // await拿到返回对象
    const { bitmap, requestId } = await textureDecoder.decodeTexture(url);
    reqId = requestId;

    // 拿到bitmap，创建Three纹理
    const tileTex = new THREE.CanvasTexture(bitmap);
    tileTex.wrapS = THREE.RepeatWrapping;
    tileTex.wrapT = THREE.RepeatWrapping;

    // 后面丢上传队列或者直接用
    return {
      texture: tileTex,
      requestId,
    };
  } catch (err) {
    console.error("解码失败：", err);
    return null;
  }
}
