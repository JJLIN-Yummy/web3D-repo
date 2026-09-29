export type componentCbType = (args?: any[]) => any;
export abstract class Component {
  abstract cb: componentCbType;
  abstract run(args?: any[]): any;
}
