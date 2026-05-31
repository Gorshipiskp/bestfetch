import {describe, expect, it, vi} from "vitest";
import {defaultRetryStrategy, RetryExecutor} from "../bestfetch/retry";

describe("RetryExecutor", () => {
    it("retries failed responses", async () => {
        const strategy = defaultRetryStrategy({retries: 2, baseDelay: 1});
        const executor = new RetryExecutor(strategy, 2);
        let calls = 0;

        const response = await executor.execute(async () => {
            calls++;
            if (calls < 3) {
                return new Response(null, {status: 503});
            }
            return new Response("ok", {status: 200});
        });

        expect(response.status).toBe(200);
        expect(calls).toBe(3);
    });

    it("stops when hook returns false", async () => {
        const strategy = defaultRetryStrategy({retries: 5, baseDelay: 1});
        const onHttpError = vi.fn(() => false);
        const executor = new RetryExecutor(strategy, 5, {onHttpError});
        let calls = 0;

        const response = await executor.execute(async () => {
            calls++;
            return new Response(null, {status: 500});
        });

        expect(response.status).toBe(500);
        expect(calls).toBe(1);
        expect(onHttpError).toHaveBeenCalledOnce();
    });
});
