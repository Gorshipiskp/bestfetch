import type {RetryAfterInfo} from "./types";
import {retryAfterCallbackDefault} from "./utils";

export const DEFAULT_NUM_RETRIES: number = 5;
export const JITTER_PART: number = 1 / 5000;
export const MIN_DELAY_DEFAULT: number = 500;
export const MAX_DELAY_DEFAULT: number = 60000;
export const MIDDLEWARE_COUNT_WARN: number = 30;


export const DEFAULT_RETRY_AFTER_CODES: number[] = [408, 429, 500, 502, 503, 504];


export const retryAfterInfoDefault: RetryAfterInfo = {
    retryAfterCallback: retryAfterCallbackDefault,
    retryAfterCodes: DEFAULT_RETRY_AFTER_CODES
}
