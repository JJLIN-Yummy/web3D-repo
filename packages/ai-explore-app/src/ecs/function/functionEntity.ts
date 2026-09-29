import { Entity } from "@/design/composeKit/entity";
import type { Component } from "@/design/composeKit/component";

export class FunctionEntity extends Entity {
  components: Component[] = [];

  constructor(option?: { components?: Component[] }) {
    super();
    if (!option) return;
    option.components && this.components.push(...option.components);
  }

  run() {
    this.components.forEach((component) => {
      component.run();
    });
  }
}
