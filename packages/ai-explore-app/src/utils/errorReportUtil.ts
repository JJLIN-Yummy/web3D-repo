import { post_report, type reportType } from "@/api/apiReport";

/**
 * 获取UA解析：浏览器、系统、设备
 */
export function getBrowserAndOs() {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  let os = "Unknown";
  let device: "pc" | "mobile" = "pc";

  // 移动端判断
  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  ) {
    device = "mobile";
  }

  // 浏览器
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";

  // 系统
  if (ua.includes("Windows NT 10.0")) os = "Windows 10 (64-bit)";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Mac OS X")) os = "MacOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone")) os = "iOS";

  return { browser, os, device };
}

// 上报函数，你自己对接后端接口
async function report(payload: reportType) {
  // 防抖、节流，避免短时间疯狂上报
  // console.log('上报错误', payload)
  try {
    await post_report({ data: payload }).response();
    // console.log(res);
  } catch (e) {
    e;
    // 上报本身失败，静默，防止死循环
  }
}

/**
 * 初始化监控，在main.ts app创建后调用
 */
export function initWebMonitor(options: {
  projectId: string;
  env: string;
  projectVersion: string;
  fingerprint: string;
  fingerprintType: string;
  getUserIdentify: () => string;
}) {
  const {
    projectId,
    env,
    projectVersion,
    fingerprint,
    fingerprintType,
    getUserIdentify,
  } = options;
  const { browser, os, device } = getBrowserAndOs();

  // ========== 2. window.onerror 全局同步JS错误 ==========
  window.onerror = function (msg, _url, _line, _col, err) {
    const stack = err?.stack || "";
    report({
      projectId,
      env,
      errorType: "js_error",
      errorMsg: String(msg),
      stack,
      pageUrl: window.location.href,
      userIdentify: getUserIdentify(),
      routePath: window.location.href,
      browser,
      os,
      device,
      projectVersion,
      sdkType: "WEB",
      fingerprint,
      fingerprintType,
      level: "1",
    });
    return true; // 阻止浏览器控制台默认报错
  };

  // ========== 3. Promise 未捕获异常（fetch/axios async await） ==========
  window.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
    const reason = event.reason;
    const msg = reason?.message || String(reason);
    const stack = reason?.stack || "";
    report({
      projectId,
      env,
      errorType: "promise_error",
      errorMsg: msg,
      stack,
      pageUrl: window.location.href,
      routePath: window.location.href,
      userIdentify: getUserIdentify(),
      browser,
      os,
      device,
      projectVersion,
      sdkType: "WEB",
      fingerprint,
      fingerprintType,
      level: "1",
    });
  });

  // ========== 4. 资源加载错误（script/img/css 404） ==========
  window.addEventListener(
    "error",
    (event) => {
      // 区分资源错误，避免和上面js_error重复上报
      const target = event.target as HTMLElement;
      const tagName = target.tagName;
      if (["SCRIPT", "LINK", "IMG"].includes(tagName)) {
        report({
          projectId,
          env,
          errorType: "resource_error",
          errorMsg: `资源加载失败: ${tagName}, src=${
            (target as HTMLImageElement | HTMLScriptElement).src
          }`,
          stack: "",
          pageUrl: window.location.href,
          routePath: window.location.href,
          userIdentify: getUserIdentify(),
          browser,
          os,
          device,
          projectVersion,
          sdkType: "WEB",
          fingerprint,
          fingerprintType,
          level: "2",
        });
      }
    },
    true
  );
}

/**
 * 获取 canvas 指纹 web_canvas
 * @returns 指纹sha256字符串
 */
export async function getCanvasFingerprint(): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 60;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "unknown_canvas";

  ctx.textBaseline = "top";
  ctx.font = '14px "Arial"';
  // 绘制多层带透明度色块文字，放大渲染差异
  ctx.fillStyle = "#f60";
  ctx.fillRect(125, 1, 62, 20);
  ctx.fillStyle = "#069";
  ctx.fillText("ai-explore-fingerprint 0⚡", 2, 15);
  ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
  ctx.fillText("ai-explore-fingerprint 0⚡", 4, 17);

  const dataUrl = canvas.toDataURL("image/png");
  // crypto.subtle 必须 https / localhost 环境，http页面会报错
  const encoder = new TextEncoder();
  const bytes = encoder.encode(dataUrl);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
