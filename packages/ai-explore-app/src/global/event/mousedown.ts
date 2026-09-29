import { FunctionEntity } from "@/ecs/function";

document.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;

  mousedownEntity.run();
});

export const mousedownEntity = new FunctionEntity();
