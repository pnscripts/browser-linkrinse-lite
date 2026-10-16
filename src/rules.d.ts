export interface Rule { readonly name: string; readonly stem: string; readonly prefix: boolean; readonly hosts: readonly string[] | null }
export interface CleanResult { url: string; changed: boolean; removed: string[]; skipped: null | 'not-http' | 'invalid' }
export interface Settings { cleanOnClick: boolean; cleanAddressBar: boolean; cleanedCount: number; pausedSites: string[] }
export const VERSION: string;
export const RULES: readonly Rule[];
export const DEFAULT_SETTINGS: Readonly<Settings>;
export function hostMatches(host: string, domain: string): boolean;
export function matchRule(name: string, host: string): Rule | null;
export function cleanUrl(input: string): CleanResult;
export function settings(stored?: Partial<Settings>): Settings;
export function siteOf(url: string): string | null;
export function isPaused(host: string, pausedSites: readonly string[]): boolean;
export function togglePaused(pausedSites: readonly string[], site: string, paused: boolean): string[];
