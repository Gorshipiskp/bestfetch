import {describe, expect, it} from "vitest";
import {HTTPClient} from "../bestfetch/client";
import {MockTransport, jsonResponse} from "./mock-transport";

describe("HTTPClient", () => {
    it("uses injected transport", async () => {
        const transport = new MockTransport(() => jsonResponse({ok: true}));
        const client = new HTTPClient({
            baseURL: "https://api.test",
            transport,
            retry: {retries: 0, baseDelay: 1}
        });

        const response = await client.request({method: "GET", url: "/data"});
        expect(response.status).toBe(200);
        expect(transport.requests[0].url).toBe("https://api.test/data");
    });

    it("stringifies json body", async () => {
        const transport = new MockTransport((req) => {
            expect(req.headers.get("content-type")).toBe("application/json");
            return jsonResponse({});
        });

        const client = new HTTPClient({
            baseURL: "https://api.test",
            transport,
            retry: {retries: 0, baseDelay: 1}
        });

        await client.request({
            method: "POST",
            url: "/items",
            body: {name: "x"}
        });
    });
});
