import { httpClient } from "@common/request";
import { getEnv } from "@/utils/env";
import { type requestType, type responseType } from "@common/request";
import { handleSearch } from "@/utils/MyHttp";

const { RequestFactoryWrapper } = httpClient({
  apiUrl: getEnv().static_resource_url,
});

export const get_imageUrlFromOss = RequestFactoryWrapper<
  requestType<EmptyObj, { name: string; expires?: number }, EmptyObj>,
  responseType<{ url: string }>
>({ id: 3 }).collectData(({ query }) => {
  const queryUrl = handleSearch(query);

  return {
    url: "get-model-url" + "?" + queryUrl,
    method: "GET",
  };
});
