export interface Transport {
    send(request: Request): Promise<Response>;
}

export class FetchTransport implements Transport {
    async send(request: Request): Promise<Response> {
        return fetch(request);
    }
}
