import {
  httpClient,
  type requestType,
  type responseType,
} from "@common/request";
import type { ThreeModelResponse, ThreeModelSubmitResponse } from "@/api/type";

const { RequestFactoryWrapper } = httpClient({
  apiUrl: "http://127.0.0.1:8001/api",
});

export const threeGeneratorSubmit = RequestFactoryWrapper<
  requestType<
    EmptyObj,
    EmptyObj,
    { message: string; image_url?: string; thread_id: string }
  >,
  responseType<ThreeModelSubmitResponse>
>({ id: 1 }).collectData(({ data }) => {
  return {
    url: "/three/generate/submit",
    method: "POST",
    data,
  };
});

export const threeGeneratorQuery = RequestFactoryWrapper<
  requestType<{ task_id: string }, EmptyObj, EmptyObj>,
  responseType<ThreeModelResponse>
>({ id: 1 }).collectData(({ params }) => {
  return {
    url: "/three/generate/result" + `/${params.task_id}`,
    method: "GET",
  };
});
