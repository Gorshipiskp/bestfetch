import {FetchTransport} from "./transport";
import type {RetryOptions} from "./retry";
import {defaultRetryStrategy, RetryExecutor} from "./retry";
import {withTimeoutSignal} from "./timeout";
import type {FetchPlugin} from "./plugins";
import {FetchPluginManager} from "./plugins";

export interface ClientOptions {
    baseURL: string;
    timeout?: number;
    retry?: RetryOptions;
}

export class HTTPClient {
    private transport: FetchTransport = new FetchTransport();
    private retryExecutor: RetryExecutor;
    private plugins: FetchPluginManager = new FetchPluginManager();

    constructor(private options: ClientOptions) {

        const retryOpts: RetryOptions = options.retry ?? {
            retries: 3,
            baseDelay: 300
        };
        console.log(retryOpts)
        this.retryExecutor = new RetryExecutor(
            defaultRetryStrategy(retryOpts),
            retryOpts.retries
        );
    }

    use(plugin: FetchPlugin): void {
        this.plugins.use(plugin);
    }

    async request(input: {
        method: string;
        url: string;
        headers?: HeadersInit;
        body?: any;
        signal?: AbortSignal;
    }): Promise<Response> {
        let request: Request = this.buildRequest(input);

        try {
            request = await this.plugins.runRequest(request);

            const response: Response = await this.retryExecutor.execute((): Promise<Response> => {
                const signal: AbortSignal | undefined = withTimeoutSignal(
                    input.signal,
                    this.options.timeout
                );

                return this.transport.send(
                    new Request(request, {signal})
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
        body?: any;
    }): Request {
        const url: URL = new URL(input.url, this.options.baseURL);

        return new Request(url, {
            method: input.method,
            headers: {
                "Content-Type": "application/json",
                ...input.headers
            },
            body: input.body ? JSON.stringify(input.body) : undefined
        });
    }
}
