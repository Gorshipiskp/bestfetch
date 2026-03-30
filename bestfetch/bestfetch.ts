import type {ClientOptions,} from "./client";
import {HTTPClient} from "./client";
import type {FetchPlugin} from "./plugins";
import {withTimeoutSignal} from "./timeout";
import {buildURL} from "./misc";

interface BestFetchCallbacks<R> {
    onSuccess?: (data: unknown, response: Response) => R;
    onError?: (response: Response, isLastAttempt?: boolean) => any;
    onNetworkError?: (error: any, isLastAttempt?: boolean) => any;
}

export type ResponseConvertType = "ARRAYBUFFER" | "BLOB" | "BYTES" | "FORMDATA" | "JSON" | "RESPONSE" | "TEXT"

const ConvertTypesHandlers: Record<ResponseConvertType, Function> = {
    "ARRAYBUFFER": async (resp: Response): Promise<ArrayBuffer> => await resp.arrayBuffer(),
    "BLOB": async (resp: Response): Promise<Blob> => await resp.blob(),
    "BYTES": async (resp: Response): Promise<Uint8Array> => new Uint8Array(await resp.arrayBuffer()),
    "FORMDATA": async (resp: Response): Promise<FormData> => await resp.formData(),
    "JSON": async (resp: Response): Promise<any> => await resp.json(),
    "RESPONSE": (resp: Response): Response => resp,
    "TEXT": async (resp: Response): Promise<string> => await resp.text(),
} as const;

interface BestFetchRequestOptions<R> {
    headers?: HeadersInit;
    body?: any;
    convertType?: ResponseConvertType
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
                    options.callbacks?.onError?.(response, isLastAttempt);
                }

                throw response;
            }

            const typeHandler: Function = ConvertTypesHandlers[options.convertType ?? "JSON"]
            const data: any = await typeHandler(response).catch((): undefined => undefined);

            return options.callbacks?.onSuccess
                ? options.callbacks.onSuccess(data, response)
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
