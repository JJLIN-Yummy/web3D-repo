import { get_imageUrlFromOss } from "@/api/apiOss";

export type optType = {
  url: string;
};
export interface IGetImageUrl {
  getUrl(opt: optType): Promise<string | undefined>;
}

export class ImageUrlManage {
  constructor(private strategy: IGetImageUrl) {}

  async getUrl(opt: optType) {
    try {
      return await this.strategy.getUrl(opt);
    } catch (e) {
      console.error(e);
      return "";
    }
  }
}

class GetImageUrlByOss implements IGetImageUrl {
  constructor() {}

  async getUrl(opt: optType) {
    const { data } = await get_imageUrlFromOss({
      query: { name: opt.url },
    }).response();
    if (!data || !data.IsSuccess || !data.Value) return;
    if (!data.Value.url) return;

    return data.Value.url;
  }
}

export const getImageUrlByOss = new GetImageUrlByOss();
