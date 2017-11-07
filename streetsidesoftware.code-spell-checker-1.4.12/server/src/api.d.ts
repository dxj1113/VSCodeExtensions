import * as config from './cspellConfig';
export interface GetConfigurationForDocumentResult {
    languageEnabled: boolean | undefined;
    fileEnabled: boolean | undefined;
    settings: config.CSpellUserSettings | undefined;
    docSettings: config.CSpellUserSettings | undefined;
}
export interface IsSpellCheckEnabledResult {
    languageEnabled: boolean | undefined;
    fileEnabled: boolean | undefined;
}
export interface SplitTextIntoWordsResult {
    words: string[];
}
export declare type RequestMethods = 'isSpellCheckEnabled' | 'getConfigurationForDocument' | 'splitTextIntoWords';
export declare type RequestMethodConstants = {
    [key in RequestMethods]: RequestMethods;
};
