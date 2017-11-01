import * as cspell from 'cspell';
export { LanguageSetting } from 'cspell';
export interface SpellCheckerSettings {
    checkLimit?: number;
}
export interface CSpellUserSettingsWithComments extends cspell.CSpellUserSettingsWithComments, SpellCheckerSettings {
}
export interface CSpellUserSettings extends cspell.CSpellUserSettings, SpellCheckerSettings {
}
