import {DEFAULT_NUM_RETRIES, retryAfterInfoDefault} from "./consts";
import type {
    BaseFetchReturn,
    ConvertType,
    FetchOptions,
    MiddlewareContext,
    MiddlewareFunc,
    MiddlewareFuncReturn,
    onErrorFunction,
    RequestOptions,
    RetryAfterCallbackReturn,
    RetryAfterInfo,
    RetryOptions
} from "./types";
import {convertHandlers} from "./types";
import {getBackoffDelay, sleep} from "./utils";
import {FetchError, NetworkError, OnSuccessFunctionError} from "./errors";


export async function fetchWithRetry<T, K extends ConvertType, R, JSONType = any>({
                                                                                      url,
                                                                                      config = {},
                                                                                      onSuccess,
                                                                                      onError,
                                                                                      onNetworkError,
                                                                                      numRetries = DEFAULT_NUM_RETRIES,
                                                                                      convertType,
                                                                                      middlewares = []
                                                                                  }: FetchOptions<T, K, R>, {
                                                                                      abortController,
                                                                                      timeout
                                                                                  }: RequestOptions, retryOptions?: RetryOptions,
                                                                                  retryAfterInfo: RetryAfterInfo = retryAfterInfoDefault): Promise<R> {
    let finalResponse: Response | undefined;
    let abortControllerCur: AbortController | undefined = abortController;

    if (timeout && !abortController) {
        abortControllerCur = new AbortController();
    }

    const signal: AbortSignal | undefined = abortControllerCur?.signal;

    function getCurBackoff(): number {
        return getBackoffDelay({...retryOptions, attempt, maxAttempts: numRetries})
    }

    function clearTimeoutFunc(timeoutFuncID: number | undefined): void {
        if (timeoutFuncID) {
            clearTimeout(timeoutFuncID);
        }
    }

    let attempt: number = 0
    for (; attempt < numRetries; attempt++) {
        if (signal?.aborted) {
            throw new DOMException("Aborted", "AbortError");
        }

        let timeoutFuncID: number | undefined;

        try {
            if (timeout && abortControllerCur) {
                timeoutFuncID = setTimeout(() => abortControllerCur!.abort(), timeout);
            }

            const middlewaredRequest: Request = await applyMiddleware(url, config, attempt, numRetries, middlewares, signal);

            const baseFetchResult: BaseFetchReturn = await baseFetch(
                middlewaredRequest, onError, attempt === numRetries - 1
            );

            if (baseFetchResult.ok) {
                const data: T = await convertHandlers[convertType](baseFetchResult.response);

                try {
                    return onSuccess(data);
                } catch (err) {
                    throw new OnSuccessFunctionError(url, attempt, baseFetchResult.response, err);
                }
            } else {
                if (retryAfterInfo.retryAfterCodes.includes(baseFetchResult.response.status)) {
                    const retryAfterValue: string | null = baseFetchResult.response.headers.get("Retry-After");

                    const retryAfter: RetryAfterCallbackReturn = await retryAfterInfo.retryAfterCallback(baseFetchResult.response, retryAfterValue);

                    if (retryAfter.shouldRetry) {
                        clearTimeoutFunc(timeoutFuncID);

                        const delay: number = retryAfter.delayAuto ? getCurBackoff() : retryAfter.delay;

                        await sleep(delay, signal);
                        continue;
                    }
                } else {
                    if (!baseFetchResult.shouldRetry) break;
                    finalResponse = baseFetchResult.response;
                }
            }

            clearTimeoutFunc(timeoutFuncID)

            if (attempt < numRetries - 1 && retryOptions) {
                await sleep(getCurBackoff(), signal);
            }
        } catch (err: any) {
            if (err?.name === "AbortError") {
                throw err;
            }
            if (err?.name === "OnSuccessFunctionError") {
                throw err;
            }

            const shouldRetry: boolean = onNetworkError(err);
            if (!shouldRetry) break;

            clearTimeoutFunc(timeoutFuncID)

            if (attempt < numRetries - 1 && retryOptions) {
                await sleep(getBackoffDelay({...retryOptions, attempt, maxAttempts: numRetries}), signal);
            }
        } finally {
            clearTimeoutFunc(timeoutFuncID)
        }
    }

    if (finalResponse) {
        throw new FetchError(url, numRetries, finalResponse);
    } else {
        throw new NetworkError(url, numRetries);
    }
}

export async function applyMiddleware(url: string | URL, config: RequestInit, attempt: number, numRetries: number,
                                      middlewares: MiddlewareFunc[], signal?: AbortSignal): Promise<Request> {
    const initialRequest: Request = new Request(url, {...config, signal});

    const context: MiddlewareContext = {
        attempt,
        maxAttempts: numRetries,
        signal
    };

    return await executeMiddlewareChain(
        initialRequest,
        middlewares,
        context
    );
}


export async function baseFetch(
    request: Request,
    onError: onErrorFunction,
    isLastAttempt: boolean = false
): Promise<BaseFetchReturn> {
    try {
        const response: Response = await fetch(request);

        if (response.ok) {
            return {ok: true, response};
        } else {
            return {ok: false, shouldRetry: await onError(response, isLastAttempt), response};
        }
    } catch (error) {
        throw error;
    }
}

export async function executeMiddlewareChain(
    request: Request,
    middlewares: MiddlewareFunc[],
    context: MiddlewareContext
): Promise<Request> {
    let req: Request = request;

    for (const midFunc of middlewares) {
        let {stopPropagation, request}: MiddlewareFuncReturn = await midFunc(req, context);

        req = request;

        if (stopPropagation) break
    }

    return req;
}
