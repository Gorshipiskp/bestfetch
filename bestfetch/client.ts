import {FetchTransport} from "./transport";
import type {Transport} from "./transport";
import type {RetryHooks, RetryOptions} from "./retry";
import {defaultRetryStrategy, RetryExecutor} from "./retry";
import type {FetchPlugin} from "./plugins";
import {FetchPluginManager} from "./plugins";
import {isJsonBody} from "./misc";

export interface ClientOptions {
    baseURL: string;
    timeout?: number;
    retry?: RetryOptions;
    transport?: Transport;
}

export interface ClientRequestInput {
    method: string;
    url: string;
    headers?: HeadersInit;
    body?: unknown;
    signal?: AbortSignal;
    retry?: Partial<RetryOptions>;
    retryHooks?: RetryHooks;
}

export class HTTPClient {
    private transport: Transport;
    private defaultRetry: RetryOptions;
    private plugins: FetchPluginManager = new FetchPluginManager();

    constructor(private options: ClientOptions) {
        this.transport = options.transport ?? new FetchTransport();
        this.defaultRetry = options.retry ?? {
            retries: 3,
            baseDelay: 300
        };
    }

    use(plugin: FetchPlugin): void {
        this.plugins.use(plugin);
    }

    eject(plugin: FetchPlugin): boolean {
        return this.plugins.eject(plugin);
    }

    async request(input: ClientRequestInput): Promise<Response> {
        let request: Request = this.buildRequest(input);

        const retryOpts: RetryOptions = {
            ...this.defaultRetry,
            ...input.retry
        };

        const retryExecutor = new RetryExecutor(
            defaultRetryStrategy(retryOpts),
            retryOpts.retries,
            input.retryHooks
        );

        try {
            request = await this.plugins.runRequest(request);

            const response: Response = await retryExecutor.execute((): Promise<Response> => {
                return this.transport.send(
                    new Request(request, {signal: input.signal})
                );
            });

            return await this.plugins.runResponse(response);

        } catch (err) {
            throw await this.plugins.runError(err);
        }
    }

    private buildRequest(input: {
        method: string;
        url: string;
        headers?: HeadersInit;
        body?: unknown;
    }): Request {
        const url: URL = new URL(input.url, this.options.baseURL);
        const headers = new Headers(input.headers);
        let body: BodyInit | undefined;

        if (input.body !== undefined && input.body !== null) {
            if (isJsonBody(input.body)) {
                if (!headers.has("Content-Type")) {
                    headers.set("Content-Type", "application/json");
                }
                body = JSON.stringify(input.body);
            } else {
                body = input.body as BodyInit;
            }
        }

        return new Request(url, {
            method: input.method,
            headers,
            body
        });
    }
}
