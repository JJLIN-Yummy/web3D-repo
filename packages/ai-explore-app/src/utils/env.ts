export const getEnv = () => {
  const env = import.meta.env;

  return {
    static_resource_url: env.VITE_STATIC_RESOURCE_URL,
  };
};

/**
 * 拼接静态资源路径
 * @param url 后缀
 */
export const getStaticResourceUrl = (url: string) => {
  return getEnv().static_resource_url + url;
};
