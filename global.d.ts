/**
 * React 19 ships without @types/react in this project.
 * Declare the minimum JSX namespace so TypeScript recognises `key` as a
 * JSX-intrinsic attribute rather than a regular component prop.
 */
declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number | bigint | null;
  }
}
