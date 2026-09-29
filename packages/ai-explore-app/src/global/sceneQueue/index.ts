import { concurRequests } from "@common/request";
import type * as THREE from "three";

type sceneQueueItemType = {
  mesh: THREE.Object3D;
};
export class SceneQueue {
  public scene: THREE.Scene;

  private emitter = concurRequests(5).emitter;

  constructor({ scene }: { scene: THREE.Scene }) {
    this.scene = scene;
  }

  add(item: sceneQueueItemType) {
    const addFunc = () => this.scene.add(item.mesh);
    this.emitter(async () => {
      return new Promise((resolve) => {
        // runTask((function*(){
        //     addFunc();
        //     yield;
        //     resolve(1);
        // })())

        resolve(addFunc());
      });
    });
  }

  remove(item: sceneQueueItemType) {
    this.scene.remove(item.mesh);
  }
}
