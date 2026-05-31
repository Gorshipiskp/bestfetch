import type {Transport} from "../bestfetch/transport";

export class MockTransport implements Transport {
    calls = 0;
    readonly requests: Request[] = [];

    constructor(
        private readonly handler: (request: Request, attempt: number) => Response | Promise<Response>
    ) {}

    async send(request: Request): Promise<Response> {
        const attempt = this.calls++;
        this.requests.push(request);
        return this.handler(request, attempt);
    }
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
    return new Response(JSON.stringify(body), {
        status: init.status ?? 200,
        headers: {
            "content-type": "application/json",
            ...init.headers as Record<string, string>
        }
    });
}
