import {JITTER_PART, MAX_DELAY_DEFAULT, MIN_DELAY_DEFAULT} from "./consts";
import type {RetryAfterCallbackReturn, RetryOptions} from "./types";


export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject): void => {
        const id: number = setTimeout(resolve, ms);

        signal?.addEventListener("abort", (): void => {
            clearTimeout(id);
            reject(new DOMException("Aborted", "AbortError"));
        });
    });
}

export function getBackoffDelay({
                                    type = "EXPONENTIAL",
                                    attempt,
                                    doJitter = true,
                                    maxDelay = MAX_DELAY_DEFAULT,
                                    minDelay = MIN_DELAY_DEFAULT,
                                    maxAttempts
                                }: RetryOptions): number {
    let jitter: number = 0;

    if (doJitter) {
        jitter = (Math.random() * 2 - 1) * maxDelay * JITTER_PART;
    }
    let curDelay: number

    if (type === "LINEAR") {
        curDelay = (attempt! + 1) / maxAttempts * maxDelay;
    } else if (type === "EXPONENTIAL") {
        curDelay = minDelay * Math.pow(2, attempt!);
    } else {
        throw new Error("Unknown delay type");
    }

    return Math.max(curDelay + jitter, minDelay);
}

export function retryAfterCallbackDefault(response: Response, retryAfter: string | null): RetryAfterCallbackReturn {
    if (retryAfter === null) {
        return {shouldRetry: true, delayAuto: true};
    }

    const parsed: number = Date.parse(retryAfter);

    if (!isNaN(parsed)) {
        const delay: number = parsed - Date.now();
        return {shouldRetry: true, delayAuto: false, delay};
    }

    const delay: number = parseInt(retryAfter, 10) * 1000;
    return {shouldRetry: true, delayAuto: false, delay};
}
