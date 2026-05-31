export interface FetchPlugin {
    onRequest?: (request: Request) => Promise<Request> | Request;
    onResponse?: (response: Response) => Promise<Response> | Response;
    onError?: (error: unknown) => Promise<unknown> | unknown;
}

export class FetchPluginManager {
    private plugins: FetchPlugin[] = [];

    use(plugin: FetchPlugin): void {
        this.plugins.push(plugin);
    }

    eject(plugin: FetchPlugin): boolean {
        const index = this.plugins.indexOf(plugin);
        if (index === -1) return false;
        this.plugins.splice(index, 1);
        return true;
    }

    async runRequest(request: Request): Promise<Request> {
        let r: Request = request;
        for (const plugin of this.plugins) {
            if (plugin.onRequest) {
                r = await plugin.onRequest(r);
            }
        }
        return r;
    }

    async runResponse(response: Response): Promise<Response> {
        let r: Response = response;
        for (const plugin of this.plugins) {
            if (plugin.onResponse) {
                r = await plugin.onResponse(r);
            }
        }
        return r;
    }

    async runError(error: unknown): Promise<unknown> {
        let e: unknown = error;
        for (const plugin of this.plugins) {
            if (plugin.onError) {
                e = await plugin.onError(e);
            }
        }
        return e;
    }
}
