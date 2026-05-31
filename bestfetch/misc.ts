export type QueryValue = string | number | boolean | null | undefined | QueryValue[];

export type QueryParams = Record<string, QueryValue>;

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildURL(url: string, query?: QueryParams): string {
    if (!query) return url;

    const qm = url.indexOf("?");
    const path = qm === -1 ? url : url.slice(0, qm);
    const params = new URLSearchParams(qm === -1 ? "" : url.slice(qm + 1));

    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;

        if (Array.isArray(value)) {
            for (const item of value) {
                if (item !== undefined && item !== null) {
                    params.append(key, String(item));
                }
            }
            continue;
        }

        params.set(key, String(value));
    }

    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
}

export function isJsonBody(body: unknown): boolean {
    if (body === null || typeof body !== "object") return false;
    if (body instanceof FormData) return false;
    if (body instanceof Blob) return false;
    if (body instanceof ArrayBuffer) return false;
    if (ArrayBuffer.isView(body)) return false;
    return true;
}
