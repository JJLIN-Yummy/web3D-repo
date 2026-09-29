import type * as THREE from "three";
import { concurRequests } from "@common/request";
import { runTask } from "@/utils/idleTimeTask";

export class TextureManager {
  private emitter = concurRequests(1).emitter;

  public renderer: THREE.WebGLRenderer;

  constructor({ renderer }: { renderer: THREE.WebGLRenderer }) {
    this.renderer = renderer;
  }

  async warmup(option: { texture: THREE.Texture }) {
    const initTexture = () => this.renderer.initTexture(option.texture);
    await new Promise((resolve) => {
      this.emitter(async () => {
        const f = function* () {
          initTexture();
          yield;
          resolve();
        };
        await runTask(f());
      });
    });
  }
}
