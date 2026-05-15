/**
 * Handles returned by **`window.setTimeout`** / **`window.setInterval`** in browsers (numeric IDs).
 *
 * TypeScript's merged **`lib.dom`** + **`@types/node`** typings often widen timer helpers so that
 * **`ReturnType<typeof setTimeout>`** or **`ReturnType<typeof window.setTimeout>`** becomes
 * **`NodeJS.Timeout`**, while actual **`window.setTimeout(...)`** expressions still infer **`number`**.
 * That mismatch breaks strict builds (`number` is not assignable to `Timeout`) on Vercel / Next.js.
 *
 * Store **`window.*`** timer IDs as **`number`** and clear them with **`window.clearTimeout`** /
 * **`window.clearInterval`** — matches browser runtime and stays strict-clean.
 */
export type BrowserTimeoutId = number;
export type BrowserIntervalId = number;
