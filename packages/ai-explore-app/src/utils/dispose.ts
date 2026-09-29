import * as THREE from "three";

export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    // 只处理Mesh
    if (!(child instanceof THREE.Mesh)) return;
    const mesh = child;

    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => disposeMaterial(mat));
    } else if (mesh.material) {
      disposeMaterial(mesh.material);
    }
  });
  // 切断父子引用，帮助GC
  obj.removeFromParent();
}

function disposeMaterial(mat: THREE.Material) {
  // 补齐全部PBR贴图key
  const mapKeys = [
    "map",
    "normalMap",
    "roughnessMap",
    "metalnessMap",
    "emissiveMap",
    "aoMap",
    "bumpMap",
    "displacementMap",
  ] as const;

  mapKeys.forEach((key) => {
    const tex = (mat as any)[key] as THREE.Texture | null;
    if (tex) {
      tex.dispose();
    }
  });

  mat.dispose();
}
