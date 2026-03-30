export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


export function buildURL(url: string, query?: Record<string, any>): string {
    if (!query) return url;

    const params: URLSearchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
            params.append(key, String(value));
        }
    }

    return `${url}?${params.toString()}`;
}
