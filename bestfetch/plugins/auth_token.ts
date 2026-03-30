import type {FetchPlugin} from "../plugins";

// Just example

export const authPlugin: FetchPlugin = {
    onRequest(request: Request): Request {
        const token: string | null = localStorage.getItem("access_token");

        if (token) {
            const headers = new Headers(request.headers);
            headers.set("Authorization", `Bearer ${token}`);

            return new Request(request, {headers});
        }

        return request;
    }
};
