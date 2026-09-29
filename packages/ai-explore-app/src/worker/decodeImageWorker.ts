self.onmessage = async (e: MessageEvent) => {
  const { requestId, arrayBuffer, mimeType } = e.data;
  try {
    const blob = new Blob([arrayBuffer], { type: mimeType });
    const imageBitmap = await createImageBitmap(blob, {
      premultiplyAlpha: "none",
      colorSpaceConversion: "default",
      imageOrientation: "flipY", // ✅ 加上这一句，自动上下翻转，匹配three默认行为
    });
    // 返回的时候带上requestId，用来匹配对应的Promise
    self.postMessage(
      {
        requestId,
        type: "success",
        bitmap: imageBitmap,
      },
      [imageBitmap]
    );
  } catch (err) {
    self.postMessage({
      requestId,
      type: "error",
      msg: (err as Error).message,
    });
  }
};
