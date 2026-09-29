/**
 * 全局统一帧循环调度器
 * 禁止零散到处书写 requestAnimationFrame
 * 所有渲染、更新逻辑统一注册，统一时间片管理
 * delta：距离上一帧时间(秒)，用来实现帧率无关移动
 */
export class Loop {
  private animId?: number;
  private lastTime = 0;
  private callbackList: Set<(delta: number) => void> = new Set();

  /**
   * 注册每一帧执行回调
   */
  add(fn: (delta: number) => void) {
    this.callbackList.add(fn);
  }

  /**
   * 启动渲染循环
   */
  start() {
    const tick = (timestamp: number) => {
      const delta = (timestamp - this.lastTime) / 1000;
      this.lastTime = timestamp;
      this.callbackList.forEach((fn) => fn(delta));
      this.animId = requestAnimationFrame(tick);
    };
    tick(0);
  }

  /**
   * 停止循环，释放动画帧资源
   */
  stop() {
    cancelAnimationFrame(this.animId!);
  }
}
