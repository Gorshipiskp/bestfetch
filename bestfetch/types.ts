export type RequestCallbacks<HandleType extends ConvertType, JSONType, R> = {
    onSuccess?: (data: ConvertResult<HandleType, JSONType>) => R | Promise<R>;
    onError?: onErrorFunction;
    onNetworkError?: onNetworkErrorFunction;
};

export interface BestFetchConstructorInit {
    baseUrl: string | URL;
    baseConfig?: RequestInit;
    numRetries?: number;
    timeout?: number | undefined;
    middlewares?: Record<string, MiddlewareFunc>;
    retryAfterCodes?: number[];
    defaultCallbacks?: {
        onSuccess?: (data: any) => any;
        onError?: onErrorFunction;
        onNetworkError?: onNetworkErrorFunction
    };
    onSuccess?: (data: any) => any;
    onError?: onErrorFunction;
    onNetworkError?: onNetworkErrorFunction;
    defaultRetryOptions?: RetryOptions;
}

export interface RequestArgs<HandleType extends ConvertType, JSONType, R> {
    endpoint: string,
    convertType: HandleType,
    callbacks: RequestCallbacks<HandleType, JSONType, R>,
    headers?: Headers,
    retryOptions?: RetryOptions,
    abortController?: AbortController,
    retryAfterCallback?: RetryAfterCallback,
}

export interface RequestArgsWithBody<HandleType extends ConvertType, JSONType, R> extends RequestArgs<HandleType, JSONType, R> {
    body: any
}

export interface MiddlewareContext {
    attempt: number;
    maxAttempts: number;
    signal?: AbortSignal;
}

export interface MiddlewareFuncReturn {
    stopPropagation: boolean;
    request: Request;
}

export type MiddlewareFunc = (
    request: Request,
    context: MiddlewareContext
) => Promise<MiddlewareFuncReturn> | MiddlewareFuncReturn;

export type RetryAfterCallbackReturn =
    | { shouldRetry: true; delayAuto: false; delay: number; }
    | { shouldRetry: true; delayAuto: true; }
    | { shouldRetry: false; }

export type RetryAfterCallback = (response: Response, retryAfter: string | null) => RetryAfterCallbackReturn;


export interface RetryAfterInfo {
    retryAfterCallback: RetryAfterCallback;
    retryAfterCodes: number[]
}

export const CONVERT_TYPES = {
    ARRAYBUFFER: "ARRAYBUFFER",
    BLOB: "BLOB",
    BYTES: "BYTES",
    FORMDATA: "FORMDATA",
    JSON: "JSON",
    RESPONSE: "RESPONSE",
    TEXT: "TEXT"
} as const;

export type ConvertType = typeof CONVERT_TYPES[keyof typeof CONVERT_TYPES];
export type ConvertResult<HandleType extends ConvertType, JSONType = any> =
    HandleType extends "ARRAYBUFFER" ? ArrayBuffer :
        HandleType extends "BLOB" ? Blob :
            HandleType extends "BYTES" ? Uint8Array :
                HandleType extends "FORMDATA" ? FormData :
                    HandleType extends "JSON" ? JSONType :
                        HandleType extends "TEXT" ? string :
                            HandleType extends "RESPONSE" ? Response :
                                unknown;

export type ConvertHandler<T extends ConvertType> = (response: Response) => Promise<ConvertResult<T>> | ConvertResult<T>;

export const convertHandlers: { [K in ConvertType]: ConvertHandler<K> } = {
    ARRAYBUFFER: r => r.arrayBuffer(),
    BLOB: r => r.blob(),
    BYTES: async r => new Uint8Array(await r.arrayBuffer()),
    FORMDATA: r => r.formData(),
    JSON: r => r.json(),
    RESPONSE: r => r,
    TEXT: r => r.text()
} as const;

export type onSuccessFunction<TData, TResult> = (data: TData) => Promise<TResult> | TResult;
export type onErrorFunction = (response: Response, isLastAttempt?: boolean) => boolean | Promise<boolean>;
export type onNetworkErrorFunction = (err: any) => boolean;
export type DelayType = "LINEAR" | "EXPONENTIAL";


export interface FetchFunctionsCallbacks<TData, TResult> {
    onError: onErrorFunction,
    onNetworkError: onNetworkErrorFunction,
    onSuccess: onSuccessFunction<TData, TResult>
}

export interface FetchOptions<T, K extends ConvertType, R> extends FetchFunctionsCallbacks<T, R> {
    config: RequestInit;
    convertType: K;
    numRetries?: number;
    url: string | URL;
    middlewares?: MiddlewareFunc[];
}

export interface RetryOptions {
    attempt?: number;
    doJitter?: boolean;
    maxAttempts: number;
    maxDelay?: number;
    minDelay?: number;
    type?: DelayType;
}

export interface RequestOptions {
    abortController?: AbortController;
    timeout?: number;
}

export type BaseFetchReturn =
    | { ok: true; response: Response }
    | { ok: false; shouldRetry: boolean, response: Response };
