/** 材质子类型 */
export type MaterialInfo = {
  color?: string;
  metalness?: number;
  roughness?: number;
  emissive?: string | null;
  emissiveIntensity?: number | null;
};

/** 变换坐标/旋转/缩放 */
export type TransformInfo = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

/** 基础几何体尺寸 */
export type PrimitiveSize = {
  width: number;
  height: number;
  depth: number;
};

/** 基础几何体配置 */
export type PrimitiveInfo = {
  shape: "box" | "sphere" | "cylinder" | "plane" | "torus";
  size: PrimitiveSize;
};

export type generatorStatus = "success" | "fail" | "running";

export type ThreeModelResponseSuccess = {
  name: string;
  desc: string;
  type: "primitive" | "model";
  primitive: PrimitiveInfo | null;
  modelKey: string | null;
  ossUrl: string | null;
  material: MaterialInfo;
  transform: TransformInfo;
  interact: { hoverColor: string; clickTip: string } | null;
};

/** 后端返回完整3D物体数据类型 */
export type ThreeModelResponse = {} & (
  | {
      status: "success";
      data: ThreeModelResponseSuccess | ThreeModelResponseSuccess[];
    }
  | {
      status: "fail";
      error_msg: string;
    }
  | {
      status: "running";
    }
);

export type ThreeModelSubmitResponse = {
  task_id: string;
};
