import { Component, type componentCbType } from "@/design/composeKit/component";

export class FunctionComponent extends Component {
  cb: componentCbType;
  constructor(option: { cb: componentCbType }) {
    super();
    this.cb = option.cb;
  }
  run(_args?: any[]): any {
    this.cb();
  }
}
