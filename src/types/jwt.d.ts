import 'jsonwebtoken';

declare module 'jsonwebtoken' {
  export interface JwtPayload {
    userId: string;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface Jwt {}
}
