import { Logger } from './logger';
export { LogLevel } from './logger';
export declare const logger: Logger;
export declare function log(msg: string, uri?: string | string[]): void;
export declare function logError(msg: string, uri?: string | string[]): void;
export declare function logInfo(msg: string, uri?: string | string[]): void;
export declare function setWorkspaceBase(uri: string): void;
export declare function setWorkspaceFolders(folders: string[]): void;
