import type { requestType, responseType } from "@common/request";

import { httpClient } from "@common/request";
import { getEnv } from "@/utils/env";
import { RequestEnum } from "@/enums";

const { RequestFactoryWrapper } = httpClient({
  apiUrl: getEnv().front_monitor_url,
});

export type loginType = { userPhone: string; userPassword: string };
export type loginResponseType = {
  id: string;
  userName: string;
  userEmail: string;
  token: string;
};

export const post_login = RequestFactoryWrapper<
  requestType<EmptyObj, EmptyObj, loginType>,
  responseType<loginResponseType>
>({ id: 5 }).collectData(({ data }) => {
  return {
    url: "/login",
    method: RequestEnum.POST,
    data,
    headers: {
      "X-Real-IP": "127.0.0.2",
    },
  };
});
