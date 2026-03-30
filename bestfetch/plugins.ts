export interface FetchPlugin {
    onRequest?: (request: Request) => Promise<Request> | Request;
    onResponse?: (response: Response) => Promise<Response> | Response;
    onError?: (error: any) => Promise<any> | any;
}

export class FetchPluginManager {
    private plugins: FetchPlugin[] = [];

    use(plugin: FetchPlugin) {
        this.plugins.push(plugin);
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

    async runError(error: any): Promise<any> {
        let e: any = error;
        for (const plugin of this.plugins) {
            if (plugin.onError) {
                e = await plugin.onError(e);
            }
        }
        return e;
    }
}
