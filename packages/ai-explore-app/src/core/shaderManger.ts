import type * as THREE from "three";
import { concurRequests } from "@common/request";
import { runTask } from "@/utils/idleTimeTask";

export class ShaderManager {
  private emitter = concurRequests(1).emitter;

  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  constructor({
    renderer,
    scene,
    camera,
  }: {
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
  }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  async warmup(option: { mesh: THREE.Mesh }) {
    const initShader = () =>
      this.renderer.compile(option.mesh, this.camera, this.scene);
    await new Promise((resolve) => {
      this.emitter(async () => {
        const f = function* () {
          initShader();
          yield;
          resolve(1);
        };
        await runTask(f());
      });
    });
  }
}
