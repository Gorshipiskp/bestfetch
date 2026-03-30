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
    response?: Response;
    error?: any;
}

export type RetryDecision =
    | { retry: true; delay: number }
    | { retry: false };

export type RetryStrategy = (context: RetryContext) => Promise<RetryDecision> | RetryDecision;

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
        private maxRetries: number
    ) {
    }

    async execute(execFunction: () => Promise<Response>): Promise<Response> {
        let lastError: any;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                const response: Response = await execFunction();

                if (response.ok) return response;

                const decision: RetryDecision = await this.strategy({
                    attempt,
                    response
                });

                if (!decision.retry || attempt === this.maxRetries) {
                    return response;
                }

                await sleep(decision.delay);
            } catch (error) {
                lastError = error;

                const decision: RetryDecision = await this.strategy({
                    attempt,
                    error
                });

                if (!decision.retry || attempt === this.maxRetries) {
                    throw error;
                }

                await sleep(decision.delay);
            }
        }

        throw lastError;
    }
}
