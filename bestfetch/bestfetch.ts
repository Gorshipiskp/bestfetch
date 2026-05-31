import type { ClientOptions } from "./client";
import { HTTPClient } from "./client";
import type { FetchPlugin } from "./plugins";
import type { RetryOptions } from "./retry";
import { withTimeoutSignal } from "./timeout";
import { buildURL, type QueryParams } from "./misc";
import { HttpError } from "./error";
import { parseJsonBody } from "./parse";

export type ConvertTypeMap = {
    ARRAYBUFFER: ArrayBuffer;
    BLOB: Blob;
    BYTES: Uint8Array;
    FORMDATA: FormData;
    JSON: unknown;
    RESPONSE: Response;
    TEXT: string;
};

export type ResponseConvertType = keyof ConvertTypeMap;

type RetryOverride = Partial<Pick<RetryOptions, "retries" | "baseDelay" | "maxDelay" | "factor" | "jitter" | "retryOn">>;

type CommonCallbacks = {
    onError?: (response: Response, isLastAttempt: boolean) => boolean | void;
    onNetworkError?: (error: unknown, isLastAttempt: boolean) => boolean | void;
};

type BestFetchCallbacksWithSuccess<TSuccess, TData> = CommonCallbacks & {
    onSuccess: (data: TData, response: Response) => TSuccess;
};

type BestFetchCallbacksWithoutSuccess = CommonCallbacks;

export type BestFetchRequestOptions<TConvert extends ResponseConvertType = "JSON"> = {
    headers?: HeadersInit;
    body?: unknown;
    convertType?: TConvert;
    query?: QueryParams;
    timeout?: number;
    retry?: RetryOverride;
    signal?: AbortSignal;
};

type BestFetchRequestOptionsWithSuccess<
    TConvert extends ResponseConvertType,
    TSuccess
> = BestFetchRequestOptions<TConvert> & {
    callbacks: BestFetchCallbacksWithSuccess<TSuccess, ConvertTypeMap[TConvert]>;
};

type BestFetchRequestOptionsWithoutSuccess<
    TConvert extends ResponseConvertType
> = BestFetchRequestOptions<TConvert> & {
    callbacks?: BestFetchCallbacksWithoutSuccess;
};

type InternalRequestOptions = BestFetchRequestOptions<ResponseConvertType> & {
    callbacks?: (BestFetchCallbacksWithoutSuccess & {
        onSuccess?: (data: unknown, response: Response) => unknown;
    });
};

const ConvertTypesHandlers: {
    [K in ResponseConvertType]: (resp: Response) => Promise<ConvertTypeMap[K]> | ConvertTypeMap[K];
} = {
    ARRAYBUFFER: async (resp) => await resp.arrayBuffer(),
    BLOB: async (resp) => await resp.blob(),
    BYTES: async (resp) => new Uint8Array(await resp.arrayBuffer()),
    FORMDATA: async (resp) => await resp.formData(),
    JSON: async (resp) => await parseJsonBody(resp),
    RESPONSE: (resp) => resp,
    TEXT: async (resp) => await resp.text(),
};

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

    eject(plugin: FetchPlugin): boolean {
        return this.client.eject(plugin);
    }

    async request<TSuccess>(
        method: string,
        url: string,
        options: BestFetchRequestOptionsWithSuccess<ResponseConvertType, TSuccess>
    ): Promise<TSuccess>;
    async request<T = unknown>(
        method: string,
        url: string,
        options?: BestFetchRequestOptionsWithoutSuccess<"JSON">
    ): Promise<T>;
    async request<TConvert extends Exclude<ResponseConvertType, "JSON">>(
        method: string,
        url: string,
        options: BestFetchRequestOptionsWithoutSuccess<TConvert> & { convertType: TConvert }
    ): Promise<ConvertTypeMap[TConvert]>;
    async request(method: string, url: string, options?: InternalRequestOptions): Promise<unknown> {
        return this.run(method, url, options);
    }

    private async run(
        method: string,
        url: string,
        options: InternalRequestOptions = {}
    ): Promise<unknown> {
        const signal: AbortSignal | undefined = withTimeoutSignal(
            options.signal,
            options.timeout ?? this.defaultTimeout
        );

        const finalURL: string = buildURL(url, options.query);
        const callbacks = options.callbacks;

        const response: Response = await this.client.request({
            method,
            url: finalURL,
            headers: options.headers,
            body: options.body,
            signal,
            retry: options.retry,
            retryHooks: callbacks ? {
                onHttpError: (resp, _attempt, isLast) => callbacks.onError?.(resp, isLast),
                onNetworkError: (err, _attempt, isLast) => callbacks.onNetworkError?.(err, isLast),
            } : undefined,
        });

        if (!response.ok) {
            throw await HttpError.from(response);
        }

        const convertType: ResponseConvertType = options.convertType ?? "JSON";
        const typeHandler = ConvertTypesHandlers[convertType];

        try {
            const data = await typeHandler(response);

            if (callbacks?.onSuccess) {
                return callbacks.onSuccess(data, response);
            }

            return data;
        } catch (error) {
            callbacks?.onNetworkError?.(error, true);
            throw error;
        }
    }

    async get<TSuccess>(
        url: string,
        options: BestFetchRequestOptionsWithSuccess<ResponseConvertType, TSuccess>
    ): Promise<TSuccess>;
    async get<T = unknown>(
        url: string,
        options?: BestFetchRequestOptionsWithoutSuccess<"JSON">
    ): Promise<T>;
    async get<TConvert extends Exclude<ResponseConvertType, "JSON">>(
        url: string,
        options: BestFetchRequestOptionsWithoutSuccess<TConvert> & { convertType: TConvert }
    ): Promise<ConvertTypeMap[TConvert]>;
    async get(url: string, options?: InternalRequestOptions): Promise<unknown> {
        return this.run("GET", url, options);
    }

    async post<TSuccess>(
        url: string,
        body: unknown,
        options: BestFetchRequestOptionsWithSuccess<ResponseConvertType, TSuccess>
    ): Promise<TSuccess>;
    async post<T = unknown>(
        url: string,
        body: unknown,
        options?: BestFetchRequestOptionsWithoutSuccess<"JSON">
    ): Promise<T>;
    async post<TConvert extends Exclude<ResponseConvertType, "JSON">>(
        url: string,
        body: unknown,
        options: BestFetchRequestOptionsWithoutSuccess<TConvert> & { convertType: TConvert }
    ): Promise<ConvertTypeMap[TConvert]>;
    async post(url: string, body?: unknown, options?: InternalRequestOptions): Promise<unknown> {
        return this.run("POST", url, { ...options, body });
    }

    async put<TSuccess>(
        url: string,
        body: unknown,
        options: BestFetchRequestOptionsWithSuccess<ResponseConvertType, TSuccess>
    ): Promise<TSuccess>;
    async put<T = unknown>(
        url: string,
        body: unknown,
        options?: BestFetchRequestOptionsWithoutSuccess<"JSON">
    ): Promise<T>;
    async put<TConvert extends Exclude<ResponseConvertType, "JSON">>(
        url: string,
        body: unknown,
        options: BestFetchRequestOptionsWithoutSuccess<TConvert> & { convertType: TConvert }
    ): Promise<ConvertTypeMap[TConvert]>;
    async put(url: string, body?: unknown, options?: InternalRequestOptions): Promise<unknown> {
        return this.run("PUT", url, { ...options, body });
    }

    async patch<TSuccess>(
        url: string,
        body: unknown,
        options: BestFetchRequestOptionsWithSuccess<ResponseConvertType, TSuccess>
    ): Promise<TSuccess>;
    async patch<T = unknown>(
        url: string,
        body: unknown,
        options?: BestFetchRequestOptionsWithoutSuccess<"JSON">
    ): Promise<T>;
    async patch<TConvert extends Exclude<ResponseConvertType, "JSON">>(
        url: string,
        body: unknown,
        options: BestFetchRequestOptionsWithoutSuccess<TConvert> & { convertType: TConvert }
    ): Promise<ConvertTypeMap[TConvert]>;
    async patch(url: string, body?: unknown, options?: InternalRequestOptions): Promise<unknown> {
        return this.run("PATCH", url, { ...options, body });
    }

    async delete<TSuccess>(
        url: string,
        options: BestFetchRequestOptionsWithSuccess<ResponseConvertType, TSuccess>
    ): Promise<TSuccess>;
    async delete<T = unknown>(
        url: string,
        options?: BestFetchRequestOptionsWithoutSuccess<"JSON">
    ): Promise<T>;
    async delete<TConvert extends Exclude<ResponseConvertType, "JSON">>(
        url: string,
        options: BestFetchRequestOptionsWithoutSuccess<TConvert> & { convertType: TConvert }
    ): Promise<ConvertTypeMap[TConvert]>;
    async delete(url: string, options?: InternalRequestOptions): Promise<unknown> {
        return this.run("DELETE", url, options);
    }
}
