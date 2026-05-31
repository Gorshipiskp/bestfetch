import {ParseError} from "./error";

export async function parseJsonBody(response: Response): Promise<unknown> {
    if (response.status === 204 || response.status === 205) {
        return undefined;
    }

    const text = await response.text();
    if (!text) {
        return undefined;
    }

    try {
        return JSON.parse(text);
    } catch (cause) {
        throw new ParseError(response, cause);
    }
}

export async function readResponseSnippet(response: Response): Promise<unknown> {
    const clone = response.clone();
    const contentType = clone.headers.get("content-type") ?? "";

    try {
        if (contentType.includes("application/json")) {
            const text = await clone.text();
            return text ? JSON.parse(text) : undefined;
        }
        return await clone.text();
    } catch {
        return undefined;
    }
}
