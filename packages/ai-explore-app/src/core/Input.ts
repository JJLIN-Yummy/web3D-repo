/**
 * 全局输入管理器
 * 统一管理键盘按键、鼠标移动、指针锁定
 * 解耦输入逻辑与控制器，方便后续扩展多种操控模式
 */
export class Input {
  // 当前按下所有按键
  public keys = new Set<string>();
  // 鼠标相对位移，每帧重置
  public mouse = { dx: 0, dy: 0 };
  // 是否开启鼠标锁定（第一人称必备）
  public locked = false;
  public keyHoldCache: Set<string> = new Set();

  constructor(canvas: HTMLElement) {
    // 点击画布申请鼠标锁定
    canvas.onclick = () => canvas.requestPointerLock();

    // 监听锁定状态变更
    document.addEventListener("pointerlockchange", () => {
      // console.log("sss", this.locked);
      this.locked = !!document.pointerLockElement;
    });

    // 键盘事件
    window.addEventListener("keydown", (e) => this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    // 鼠标移动捕获相对位移
    window.addEventListener("mousemove", (e) => {
      if (!this.locked) return;
      this.mouse.dx += e.movementX;
      this.mouse.dy += e.movementY;
    });
  }

  /**
   * 帧结束重置鼠标增量，防止持续累积
   */
  frameReset() {
    this.mouse.dx = 0;
    this.mouse.dy = 0;
  }
}
