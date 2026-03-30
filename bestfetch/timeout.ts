import {mergeAbortSignals} from "./abort";

export function withTimeoutSignal(
    externalSignal: AbortSignal | undefined,
    timeoutMs?: number
): AbortSignal | undefined {
    if (!timeoutMs) return externalSignal;

    const controller: AbortController = new AbortController();

    const timeoutID = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    controller.signal.addEventListener("abort", () => {
        clearTimeout(timeoutID);
    });

    return mergeAbortSignals(externalSignal, controller.signal);
}
