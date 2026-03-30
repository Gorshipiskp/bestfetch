import type { ClientOptions } from "./client";
import { HTTPClient } from "./client";
import type { FetchPlugin } from "./plugins";
import { withTimeoutSignal } from "./timeout";
import { buildURL } from "./misc";

type ConvertTypeMap = {
    ARRAYBUFFER: ArrayBuffer;
    BLOB: Blob;
    BYTES: Uint8Array;
    FORMDATA: FormData;
    JSON: any;
    RESPONSE: Response;
    TEXT: string;
};

export type ResponseConvertType = keyof ConvertTypeMap;

type CommonCallbacks = {
    onError?: (response: Response, isLastAttempt?: boolean) => unknown;
    onNetworkError?: (error: unknown, isLastAttempt?: boolean) => unknown;
};

type BestFetchCallbacksWithSuccess<TSuccess, TData> = CommonCallbacks & {
    onSuccess: (data: TData, response: Response) => TSuccess;
};

type BestFetchCallbacksWithoutSuccess = CommonCallbacks;

type BestFetchRequestOptions<TConvert extends ResponseConvertType = "JSON"> = {
    headers?: HeadersInit;
    body?: unknown;
    convertType?: TConvert;
    query?: Record<string, unknown>;
    timeout?: number;
    retry?: { retries?: number; baseDelay?: number };
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

const ConvertTypesHandlers: {
    [K in ResponseConvertType]: (resp: Response) => Promise<ConvertTypeMap[K]> | ConvertTypeMap[K];
} = {
    ARRAYBUFFER: async (resp) => await resp.arrayBuffer(),
    BLOB: async (resp) => await resp.blob(),
    BYTES: async (resp) => new Uint8Array(await resp.arrayBuffer()),
    FORMDATA: async (resp) => await resp.formData(),
    JSON: async (resp) => await resp.json(),
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

    async request<
        TConvert extends ResponseConvertType = "JSON",
        TSuccess = never
    >(
        method: string,
        url: string,
        options: BestFetchRequestOptionsWithSuccess<TConvert, TSuccess>
    ): Promise<TSuccess>;
    async request<
        TConvert extends ResponseConvertType = "JSON"
    >(
        method: string,
        url: string,
        options?: BestFetchRequestOptionsWithoutSuccess<TConvert>
    ): Promise<ConvertTypeMap[TConvert]>;
    async request(
        method: string,
        url: string,
        options: BestFetchRequestOptionsWithoutSuccess<ResponseConvertType> | BestFetchRequestOptionsWithSuccess<ResponseConvertType, unknown> = {}
    ): Promise<unknown> {
        const signal: AbortSignal | undefined = withTimeoutSignal(
            options.signal,
            options.timeout ?? this.defaultTimeout
        );

        const finalURL: string = buildURL(url, options.query);

        const response: Response = await this.client.request({
            method,
            url: finalURL,
            headers: options.headers,
            body: options.body,
            signal,
        });

        if (!response.ok) {
            options.callbacks?.onError?.(response, true);
            throw response;
        }

        try {
            const convertType: ResponseConvertType = options.convertType ?? "JSON";
            const typeHandler = ConvertTypesHandlers[convertType];
            const data = await Promise.resolve(typeHandler(response)).catch(() => undefined);

            if (options.callbacks && "onSuccess" in options.callbacks && typeof options.callbacks.onSuccess === "function") {
                return options.callbacks.onSuccess(data, response);
            }

            return data;
        } catch (error) {
            options.callbacks?.onNetworkError?.(error, true);
            throw error;
        }
    }

    async get<
        TConvert extends ResponseConvertType = "JSON",
        TSuccess = never
    >(
        url: string,
        options: BestFetchRequestOptionsWithSuccess<TConvert, TSuccess>
    ): Promise<TSuccess>;
    async get<
        TConvert extends ResponseConvertType = "JSON"
    >(
        url: string,
        options?: BestFetchRequestOptionsWithoutSuccess<TConvert>
    ): Promise<ConvertTypeMap[TConvert]>;
    async get(url: string, options?: any): Promise<any> {
        return this.request("GET", url, options);
    }

    async post<
        TConvert extends ResponseConvertType = "JSON",
        TSuccess = never
    >(
        url: string,
        body: unknown,
        options: BestFetchRequestOptionsWithSuccess<TConvert, TSuccess>
    ): Promise<TSuccess>;
    async post<
        TConvert extends ResponseConvertType = "JSON"
    >(
        url: string,
        body: unknown,
        options?: BestFetchRequestOptionsWithoutSuccess<TConvert>
    ): Promise<ConvertTypeMap[TConvert]>;
    async post(url: string, body?: unknown, options?: any): Promise<any> {
        return this.request("POST", url, { ...options, body });
    }

    async put<
        TConvert extends ResponseConvertType = "JSON",
        TSuccess = never
    >(
        url: string,
        body: unknown,
        options: BestFetchRequestOptionsWithSuccess<TConvert, TSuccess>
    ): Promise<TSuccess>;
    async put<
        TConvert extends ResponseConvertType = "JSON"
    >(
        url: string,
        body: unknown,
        options?: BestFetchRequestOptionsWithoutSuccess<TConvert>
    ): Promise<ConvertTypeMap[TConvert]>;
    async put(url: string, body?: unknown, options?: any): Promise<any> {
        return this.request("PUT", url, { ...options, body });
    }

    async patch<
        TConvert extends ResponseConvertType = "JSON",
        TSuccess = never
    >(
        url: string,
        body: unknown,
        options: BestFetchRequestOptionsWithSuccess<TConvert, TSuccess>
    ): Promise<TSuccess>;
    async patch<
        TConvert extends ResponseConvertType = "JSON"
    >(
        url: string,
        body: unknown,
        options?: BestFetchRequestOptionsWithoutSuccess<TConvert>
    ): Promise<ConvertTypeMap[TConvert]>;
    async patch(url: string, body?: unknown, options?: any): Promise<any> {
        return this.request("PATCH", url, { ...options, body });
    }

    async delete<
        TConvert extends ResponseConvertType = "JSON",
        TSuccess = never
    >(
        url: string,
        options: BestFetchRequestOptionsWithSuccess<TConvert, TSuccess>
    ): Promise<TSuccess>;
    async delete<
        TConvert extends ResponseConvertType = "JSON"
    >(
        url: string,
        options?: BestFetchRequestOptionsWithoutSuccess<TConvert>
    ): Promise<ConvertTypeMap[TConvert]>;
    async delete(url: string, options?: any): Promise<any> {
        return this.request("DELETE", url, options);
    }
}