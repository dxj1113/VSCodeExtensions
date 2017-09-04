export declare type ExclusionFunction = (filename: string) => boolean;
export declare type Glob = string;
export interface ExcludeFilesGlobMap {
    [glob: string]: boolean;
}
export declare function extractGlobsFromExcludeFilesGlobMap(globMap: ExcludeFilesGlobMap): string[];
export declare function generateExclusionFunction(globs: Glob[], root: string): ExclusionFunction;
