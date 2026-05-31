import {readResponseSnippet} from "./parse";

export class HttpError extends Error {
    readonly response: Response;
    readonly status: number;
    readonly body: unknown;

    private constructor(response: Response, body: unknown) {
        super(`Request failed with status ${response.status}`);
        this.name = "HttpError";
        this.response = response;
        this.status = response.status;
        this.body = body;
    }

    static async from(response: Response): Promise<HttpError> {
        const body = await readResponseSnippet(response);
        return new HttpError(response, body);
    }
}

export class ParseError extends Error {
    readonly response: Response;
    readonly cause: unknown;

    constructor(response: Response, cause: unknown) {
        super("Failed to parse response body");
        this.name = "ParseError";
        this.response = response;
        this.cause = cause;
    }
}
