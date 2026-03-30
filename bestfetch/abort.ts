export function mergeAbortSignals(
    ...signals: (AbortSignal | undefined)[]
): AbortSignal | undefined {
    const validSignals: AbortSignal[] = signals.filter(Boolean) as AbortSignal[];

    if (validSignals.length === 0) return undefined;
    if (validSignals.length === 1) return validSignals[0];

    const controller = new AbortController();

    const onAbort: () => void = (): void => {
        controller.abort();
        cleanup();
    };

    const cleanup: () => void = (): void => {
        validSignals.forEach((signal: AbortSignal): void =>
            signal.removeEventListener("abort", onAbort)
        );
    };

    validSignals.forEach((signal: AbortSignal): void => {
        if (signal.aborted) {
            controller.abort();
        } else {
            signal.addEventListener("abort", onAbort, { once: true });
        }
    });

    return controller.signal;
}
