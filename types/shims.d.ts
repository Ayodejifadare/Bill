// Ambient shims for test and env globals used in the project
declare var global: any;
interface ImportMetaEnv {
  MODE: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare const process: any;

// Vendor modules without type definitions
declare module '@radix-ui/react-aspect-ratio';
declare module '@radix-ui/react-context-menu';
