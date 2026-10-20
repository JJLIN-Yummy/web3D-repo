import { isArray, isNull } from "@common/tools";

export function handleParams(params = {}) {
  let path = "";
  if (isNull(params)) {
    return "";
  }
  //1.收集到query参数的键
  const keys = Object.keys(params);
  //2.遍历keys
  keys.forEach((key) => {
    path += `/${params[key]}`; //依次拼接数值
  });
  return path[0] + encodeURIComponent(path.slice(1));
}

export function handleSearch(search = {}) {
  let path = "";
  if (isNull(search)) {
    return "";
  }
  const keys = Object.keys(search);
  keys.forEach((key) => {
    const value = search[key];
    let p = `${key}=${encodeURIComponent(value)}`;
    if (isArray(value)) {
      p = "";
      if (value.length > 0) {
        value.forEach((v) => {
          p = p + `${key}[]=${encodeURIComponent(v)}` + "&";
        });
        if (p.length > 0) p = p.slice(0, -1);
      }
    }
    path = path + p + "&";
  });

  return path.slice(0, -1);
}
