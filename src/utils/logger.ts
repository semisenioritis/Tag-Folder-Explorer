/**
 * Central logger for the plugin.
 *
 * `error` and `warn` always print. `debug` and `info` print only while debug logging is on
 * (the "Debug logging" setting). This module must not import the plugin or its settings:
 * the plugin calls `setDebugLogging` on load and whenever the setting changes.
 *
 * Debug and info messages use `console.debug` / `console.info`. In the developer console,
 * enable the "Verbose" level to see `console.debug` output.
 */

const PREFIX = "[Tag Folder Explorer]";

let debugEnabled = false;

export function setDebugLogging(enabled: boolean): void {
debugEnabled = enabled;
}

export function isDebugLogging(): boolean {
return debugEnabled;
}

export const logger = {
debug(...args: unknown[]): void {
if (debugEnabled) console.debug(PREFIX, ...args);
},
info(...args: unknown[]): void {
if (debugEnabled) console.info(PREFIX, ...args);
},
warn(...args: unknown[]): void {
console.warn(PREFIX, ...args);
},
error(...args: unknown[]): void {
console.error(PREFIX, ...args);
},
};