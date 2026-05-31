import {sleep} from "./misc";

export interface RetryOptions {
    retries: number;
    baseDelay?: number;
    maxDelay?: number;
    factor?: number;
    jitter?: boolean;
    retryOn?: number[];
}

export interface RetryContext {
    attempt: number;
    isLastAttempt: boolean;
    response?: Response;
    error?: unknown;
}

export type RetryDecision =
    | { retry: true; delay: number }
    | { retry: false };

export type RetryStrategy = (context: RetryContext) => Promise<RetryDecision> | RetryDecision;

export type RetryHooks = {
    onHttpError?: (response: Response, attempt: number, isLastAttempt: boolean) => boolean | void;
    onNetworkError?: (error: unknown, attempt: number, isLastAttempt: boolean) => boolean | void;
};

function parseRetryAfter(value: string): number {
    const date: number = Date.parse(value);
    if (!isNaN(date)) {
        return Math.max(date - Date.now(), 0);
    }

    const seconds: number = parseInt(value, 10);
    if (!isNaN(seconds)) {
        return seconds * 1000;
    }

    return 0;
}

export function defaultRetryStrategy(options: RetryOptions): RetryStrategy {
    const {
        baseDelay = 300,
        maxDelay = 30000,
        factor = 2,
        jitter = true,
        retryOn = [408, 429, 500, 502, 503, 504]
    } = options;

    return async ({attempt, response, error}: RetryContext): Promise<RetryDecision> => {
        if (error && !response) {
            return {
                retry: true,
                delay: computeDelay(attempt)
            };
        }

        if (!response) return {retry: false};

        if (!retryOn.includes(response.status)) {
            return {retry: false};
        }

        const retryAfter: string | null = response.headers.get("Retry-After");

        if (retryAfter) {
            const delay = parseRetryAfter(retryAfter);
            return {retry: true, delay};
        }

        return {
            retry: true,
            delay: computeDelay(attempt)
        };
    };

    function computeDelay(attempt: number): number {
        let delay: number = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);

        if (jitter) {
            delay = delay * (0.5 + Math.random() * 0.5);
        }

        return delay;
    }
}

export class RetryExecutor {
    constructor(
        private strategy: RetryStrategy,
        private maxRetries: number,
        private hooks?: RetryHooks
    ) {
    }

    async execute(execFunction: () => Promise<Response>): Promise<Response> {
        let lastError: unknown;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            const isLastAttempt = attempt === this.maxRetries;

            try {
                const response: Response = await execFunction();

                if (response.ok) return response;

                if (this.hooks?.onHttpError?.(response, attempt, isLastAttempt) === false) {
                    return response;
                }

                const decision: RetryDecision = await this.strategy({
                    attempt,
                    isLastAttempt,
                    response
                });

                if (!decision.retry || isLastAttempt) {
                    return response;
                }

                await sleep(decision.delay);
            } catch (error) {
                lastError = error;

                if (this.hooks?.onNetworkError?.(error, attempt, isLastAttempt) === false) {
                    throw error;
                }

                const decision: RetryDecision = await this.strategy({
                    attempt,
                    isLastAttempt,
                    error
                });

                if (!decision.retry || isLastAttempt) {
                    throw error;
                }

                await sleep(decision.delay);
            }
        }

        throw lastError;
    }
}
