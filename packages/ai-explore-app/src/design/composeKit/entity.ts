import type { Component } from "@/design/composeKit/component";

export abstract class Entity {
  abstract components: Component[];

  abstract run(args?: any[]): any;

  addComponent(component: Component) {
    this.components.push(component);
  }

  removeComponent(component: Component) {
    const index = this.components.indexOf(component);
    this.components.splice(index, 1);
  }
}
