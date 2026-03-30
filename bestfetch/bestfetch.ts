import type {ClientOptions,} from "./client";
import {HTTPClient} from "./client";
import type {FetchPlugin} from "./plugins";
import {withTimeoutSignal} from "./timeout";
import {buildURL} from "./misc";

interface BestFetchCallbacks<R> {
    onSuccess?: (data: any) => R;
    onError?: (response: Response, isLastAttempt?: boolean) => boolean;
    onNetworkError?: (error: any, isLastAttempt?: boolean) => boolean;
}

interface BestFetchRequestOptions<R> {
    headers?: HeadersInit;
    body?: any;
    query?: Record<string, any>;
    timeout?: number;
    retry?: { retries?: number; baseDelay?: number };
    callbacks?: BestFetchCallbacks<R>;
    signal?: AbortSignal;
}

export class BestFetch {
    private client: HTTPClient;
    private readonly defaultTimeout: number | undefined;

    constructor(options: ClientOptions) {
        this.client = new HTTPClient(options);

        this.defaultTimeout = options.timeout;
    }

    use(plugin: FetchPlugin): this {
        this.client.use(plugin);
        return this;
    }

    async request<R>(
        method: string,
        url: string,
        options: BestFetchRequestOptions<R> = {}
    ): Promise<R> {
        const signal: AbortSignal | undefined = withTimeoutSignal(options.signal, options.timeout ?? this.defaultTimeout);

        const finalURL: string = buildURL(url, options.query);

        try {
            const response: Response = await this.client.request({
                method,
                url: finalURL,
                headers: options.headers,
                body: options.body,
                signal
            });

            if (!response.ok) {
                const isLastAttempt = false;
                if (options.callbacks?.onError) {
                    options.callbacks.onError(response, isLastAttempt);
                }
                throw response;
            }

            const data: any = await response.json().catch((): undefined => undefined);

            return options.callbacks?.onSuccess
                ? options.callbacks.onSuccess(data)
                : (data as R);

        } catch (error) {
            const isLastAttempt = true;
            if (options.callbacks?.onNetworkError) {
                options.callbacks.onNetworkError(error, isLastAttempt);
            }
            throw error;
        }
    }

    get<R>(url: string, options?: BestFetchRequestOptions<R>): Promise<R> {
        return this.request<R>("GET", url, options);
    }

    post<R>(url: string, body?: any, options?: BestFetchRequestOptions<R>): Promise<R> {
        return this.request<R>("POST", url, {...options, body});
    }

    put<R>(url: string, body?: any, options?: BestFetchRequestOptions<R>): Promise<R> {
        return this.request<R>("PUT", url, {...options, body});
    }

    patch<R>(url: string, body?: any, options?: BestFetchRequestOptions<R>): Promise<R> {
        return this.request<R>("PATCH", url, {...options, body});
    }

    delete<R>(url: string, options?: BestFetchRequestOptions<R>): Promise<R> {
        return this.request<R>("DELETE", url, options);
    }
}
