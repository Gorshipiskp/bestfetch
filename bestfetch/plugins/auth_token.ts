import type {FetchPlugin} from "../plugins";

export function createAuthPlugin(getToken: () => string | null | undefined): FetchPlugin {
    return {
        onRequest(request: Request): Request {
            const token = getToken();

            if (!token) return request;

            const headers = new Headers(request.headers);
            headers.set("Authorization", `Bearer ${token}`);

            return new Request(request, {headers});
        }
    };
}
