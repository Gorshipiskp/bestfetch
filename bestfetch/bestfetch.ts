import {DEFAULT_NUM_RETRIES, DEFAULT_RETRY_AFTER_CODES, MIDDLEWARE_COUNT_WARN} from "./consts";
import type {
    BestFetchConstructorInit,
    ConvertResult,
    ConvertType,
    MiddlewareFunc,
    onErrorFunction,
    onNetworkErrorFunction,
    RequestArgs,
    RequestArgsWithBody,
    RequestCallbacks,
    RetryAfterCallback,
    RetryOptions
} from "./types";
import {retryAfterCallbackDefault} from "./utils";
import {fetchWithRetry} from "./core";


// todo: Add caching

export class BestFetch {
    private readonly baseUrl: string | URL
    private readonly baseConfig: RequestInit = {}
    private readonly numRetries: number = DEFAULT_NUM_RETRIES
    private readonly timeout: number | undefined = undefined
    private readonly middlewares: Record<string, MiddlewareFunc> = {}
    private readonly retryAfterCodes: number[] = DEFAULT_RETRY_AFTER_CODES
    private readonly defaultCallbacks: {
        onSuccess?: (data: any) => any;
        onError?: onErrorFunction;
        onNetworkError?: onNetworkErrorFunction
    }
    private readonly defaultRetryOptions?: RetryOptions
    private middlewaresIDs: string[] = []

    constructor(
        {
            baseUrl,
            baseConfig = {},
            numRetries = DEFAULT_NUM_RETRIES,
            timeout = undefined,
            middlewares = {},
            retryAfterCodes = DEFAULT_RETRY_AFTER_CODES,
            defaultCallbacks = {
                onSuccess: (data: any) => data,
                onError: (_: Response, isLastAttempt?: boolean): boolean => true,
                onNetworkError: (_: Response, isLastAttempt?: boolean): boolean => true
            },
            defaultRetryOptions = undefined
        }: BestFetchConstructorInit) {
        this.baseUrl = new URL(baseUrl);
        this.baseConfig = baseConfig;
        this.numRetries = numRetries;
        this.timeout = timeout;
        this.middlewares = middlewares;
        this.retryAfterCodes = retryAfterCodes;
        this.defaultCallbacks = defaultCallbacks;
        this.defaultRetryOptions = defaultRetryOptions;
    }

    use(middlewareID: string, middleware: MiddlewareFunc): BestFetch {
        // This array needed to correct middleware order
        this.middlewaresIDs.push(middlewareID)
        this.middlewares[middlewareID] = middleware;

        if (this.middlewaresIDs.length > MIDDLEWARE_COUNT_WARN)
            console.warn("A lot of middlewares, it may cause stack overflow");

        return this;
    }

    unuse(middlewareID: string): BestFetch {
        if (!this.middlewares[middlewareID]) {
            console.warn(`Middleware ${middlewareID} not found`);
            return this
        }

        delete this.middlewares[middlewareID];
        this.middlewaresIDs = this.middlewaresIDs.filter((midID: string): boolean => midID !== middlewareID);

        return this;
    }

    private async request<
        HandleType extends ConvertType,
        JSONType = any,
        R = unknown
    >(
        endpoint: string,
        method: string,
        convertType: HandleType,
        callbacks: RequestCallbacks<HandleType, JSONType, R>,
        body?: any,
        headers: Headers = new Headers(),
        retryOptions?: RetryOptions,
        abortController?: AbortController,
        retryAfterCallback: RetryAfterCallback = retryAfterCallbackDefault
    ): Promise<R> {
        const config: RequestInit = {
            ...this.baseConfig,
            method,
            body: body ? JSON.stringify(body) : undefined,
            headers: {
                "Content-Type": "application/json",
                ...(this.baseConfig.headers || {}),
                ...headers
            }
        };

        let onSuccess: (data: ConvertResult<HandleType, JSONType>) => R | Promise<R> = callbacks.onSuccess! ?? this.defaultCallbacks.onSuccess!;
        let onError: onErrorFunction = callbacks.onError ?? this.defaultCallbacks.onError!;
        let onNetworkError: onNetworkErrorFunction = callbacks.onNetworkError ?? this.defaultCallbacks.onNetworkError!;

        return fetchWithRetry(
            {
                url: new URL(endpoint, this.baseUrl),
                config,
                convertType,
                middlewares: this.middlewaresIDs.map((midID: string): MiddlewareFunc => this.middlewares[midID]),
                numRetries: this.numRetries,
                onSuccess,
                onError,
                onNetworkError
            },
            {abortController, timeout: this.timeout},
            retryOptions,
            {retryAfterCodes: this.retryAfterCodes, retryAfterCallback}
        );
    }

    async get<HandleType extends ConvertType, JSONType = any, R = unknown>
    (getInfo: RequestArgs<HandleType, JSONType, R>): Promise<R> {
        return this.request<HandleType, JSONType, R>(getInfo.endpoint, "GET", getInfo.convertType,
            getInfo.callbacks, undefined, getInfo.headers, getInfo.retryOptions,
            getInfo.abortController, getInfo.retryAfterCallback);
    }

    async post<HandleType extends ConvertType, JSONType = any, R = unknown>
    (postInfo: RequestArgsWithBody<HandleType, JSONType, R>): Promise<R> {
        return this.request<HandleType, JSONType, R>(postInfo.endpoint, "POST", postInfo.convertType,
            postInfo.callbacks, postInfo.body, postInfo.headers, postInfo.retryOptions, postInfo.abortController,
            postInfo.retryAfterCallback);
    }

    async put<HandleType extends ConvertType, JSONType = any, R = unknown>
    (putInfo: RequestArgsWithBody<HandleType, JSONType, R>): Promise<R> {
        return this.request<HandleType, JSONType, R>(putInfo.endpoint, "PUT", putInfo.convertType,
            putInfo.callbacks, putInfo.body, putInfo.headers, putInfo.retryOptions, putInfo.abortController,
            putInfo.retryAfterCallback);
    }

    async patch<HandleType extends ConvertType, JSONType = any, R = unknown>
    (patchInfo: RequestArgsWithBody<HandleType, JSONType, R>): Promise<R> {
        return this.request<HandleType, JSONType, R>(patchInfo.endpoint, "PATCH", patchInfo.convertType,
            patchInfo.callbacks, patchInfo.body, patchInfo.headers, patchInfo.retryOptions, patchInfo.abortController,
            patchInfo.retryAfterCallback);
    }

    async delete<HandleType extends ConvertType, JSONType = any, R = unknown>
    (deleteInfo: RequestArgs<HandleType, JSONType, R>): Promise<R> {
        return this.request<HandleType, JSONType, R>(deleteInfo.endpoint, "DELETE", deleteInfo.convertType,
            deleteInfo.callbacks, undefined, deleteInfo.headers, deleteInfo.retryOptions,
            deleteInfo.abortController, deleteInfo.retryAfterCallback);
    }
}
