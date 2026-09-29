import * as THREE from "three";
import type { Input } from "./Input";

export class FPC {
  // 基础移动参数
  public moveSpeed = 3;
  public sprintMultiplier = 2.2;
  public flySpeed = 6;
  public sensHorizontal = 0.6;
  public sensVertical = 0.6;
  public jumpPower = 4;
  public gravity = -9.8;

  private readonly BASE_DIV = 500;
  private yaw = 0;
  private pitch = 0;

  // 双击配置
  private readonly DOUBLE_DELAY = 300;
  private lastWPress = 0;
  private lastSpacePress = 0;

  // 状态
  private velocity = new THREE.Vector3();
  public isFlying = false;
  public isGrounded = true;
  private isSprinting = false;
  private sprintTimer = 0;

  // 记录上一帧按键，判断是否刚按下（关键修复点）
  private prevKeys = new Set<string>();

  constructor(private camera: THREE.PerspectiveCamera, private input: Input) {}

  /**
   * 设置玩家出生起点
   * @param pos 世界坐标 x,y,z
   * @param yawDeg 初始面朝方向，角度，0=正前方-Z，90朝右
   */
  setSpawnPoint(pos: THREE.Vector3, yawDeg = 0) {
    this.camera.position.copy(pos);
    // 角度转弧度
    this.yaw = THREE.MathUtils.degToRad(yawDeg);
    this.pitch = 0;
    // 重置速度，防止残留惯性
    this.velocity.set(0, 0, 0);
  }

  update(dt: number) {
    const { input, camera } = this;
    if (!input.locked) {
      this.prevKeys = new Set(input.keys);
      return;
    }

    // 视角旋转 保留原有
    this.yaw -= (input.mouse.dx * this.sensHorizontal) / this.BASE_DIV;
    this.pitch -= (input.mouse.dy * this.sensVertical) / this.BASE_DIV;
    this.pitch = Math.max(
      -Math.PI / 2 + 0.1,
      Math.min(Math.PI / 2 - 0.1, this.pitch)
    );
    camera.rotation.order = "YXZ";
    camera.rotation.y = this.yaw;
    camera.rotation.x = this.pitch;

    // 核心修复：用prevKeys判断【本次帧刚按下按键】，不再依赖input.keyHoldCache
    const justPressW = input.keys.has("KeyW") && !this.prevKeys.has("KeyW");
    const justPressSpace =
      input.keys.has("Space") && !this.prevKeys.has("Space");

    // 双击W冲刺
    if (justPressW) {
      const now = Date.now();
      if (now - this.lastWPress < this.DOUBLE_DELAY) {
        this.isSprinting = true;
        this.sprintTimer = 10;
      }
      this.lastWPress = now;
    }

    // 双击空格切换飞行（修复无法起飞核心逻辑）
    if (justPressSpace) {
      const now = Date.now();
      const gap = now - this.lastSpacePress;
      if (gap < this.DOUBLE_DELAY) {
        // 双击空格 切换飞行开关
        this.isFlying = !this.isFlying;
        this.velocity.y = 0;
        // console.log("飞行状态切换", this.isFlying); // 控制台打印调试
      } else if (this.isGrounded && !this.isFlying) {
        // 单次空格跳跃
        this.velocity.y = this.jumpPower;
      }
      this.lastSpacePress = now;
    }

    // 重力与地面检测
    this.handleGravity(dt);
    // 移动逻辑（飞行增加上下移动）
    this.handleMove(dt);
    // 冲刺倒计时
    if (this.isSprinting) {
      this.sprintTimer -= dt;
      if (this.sprintTimer <= 0) this.isSprinting = false;
    }

    // 保存当前按键到上一帧缓存
    this.prevKeys = new Set(input.keys);
  }

  private handleGravity(dt: number) {
    if (this.isFlying) {
      this.velocity.y = 0;
      this.isGrounded = false;
      return;
    }
    // 地面模式重力
    this.velocity.y += this.gravity * dt;
    const groundHeight = 1.2;
    if (this.camera.position.y <= groundHeight) {
      this.camera.position.y = groundHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  private handleMove(dt: number) {
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.yaw
    );
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.yaw
    );
    forward.y = 0;
    right.y = 0;
    forward.normalize();
    right.normalize();

    const moveDir = new THREE.Vector3();
    if (this.input.keys.has("KeyW")) moveDir.add(forward);
    if (this.input.keys.has("KeyS")) moveDir.sub(forward);
    if (this.input.keys.has("KeyA")) moveDir.sub(right);
    if (this.input.keys.has("KeyD")) moveDir.add(right);

    if (moveDir.length() > 0) moveDir.normalize();

    let speed = this.isFlying ? this.flySpeed : this.moveSpeed;
    if (this.isSprinting && !this.isFlying) speed *= this.sprintMultiplier;

    // 基础前后左右移动
    const delta = moveDir.clone().multiplyScalar(speed * dt);
    this.camera.position.add(delta);

    // ========== 新增：飞行模式上下移动 ==========
    if (this.isFlying) {
      const flyUpSpeed = speed * dt;
      if (this.input.keys.has("ShiftLeft")) {
        this.camera.position.y += flyUpSpeed;
      }
      if (this.input.keys.has("ControlLeft")) {
        this.camera.position.y -= flyUpSpeed;
      }
    } else {
      // 地面模式执行跳跃下落
      this.camera.position.y += this.velocity.y * dt;
    }
  }

  setSensitivity(h: number, v?: number) {
    this.sensHorizontal = h;
    this.sensVertical = v ?? h;
  }
}
