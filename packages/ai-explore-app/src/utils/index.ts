import * as THREE from "three";
export function setupGroundTexture(tex: THREE.Texture) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16); // 贴图在20*20地面重复16次，纹理不会拉伸模糊
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
