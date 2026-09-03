declare module 'bwip-js' {
  export interface BwipToBufferOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    includetext?: boolean;
  }

  export function toBuffer(options: BwipToBufferOptions): Promise<Buffer>;
}
