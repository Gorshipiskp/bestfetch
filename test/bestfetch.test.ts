import {describe, expect, it, vi} from "vitest";
import {BestFetch, HttpError, ParseError} from "../bestfetch";
import {MockTransport, jsonResponse} from "./mock-transport";

function api(transport: MockTransport, retries = 0) {
    return new BestFetch({
        baseURL: "https://api.test",
        transport,
        retry: {retries, baseDelay: 1}
    });
}

describe("BestFetch", () => {
    it("parses json responses", async () => {
        const client = api(new MockTransport(() => jsonResponse({id: 1})));
        const data = await client.get<{id: number}>("/item");
        expect(data).toEqual({id: 1});
    });

    it("returns undefined for 204", async () => {
        const client = api(new MockTransport(() => new Response(null, {status: 204})));
        const data = await client.get("/empty");
        expect(data).toBeUndefined();
    });

    it("throws HttpError with parsed body", async () => {
        const client = api(new MockTransport(() => jsonResponse({message: "nope"}, {status: 404})));

        try {
            await client.get("/missing");
            expect.unreachable("should throw");
        } catch (error) {
            expect(error).toBeInstanceOf(HttpError);
            expect((error as HttpError).status).toBe(404);
            expect((error as HttpError).body).toEqual({message: "nope"});
        }
    });

    it("throws ParseError on invalid json", async () => {
        const client = api(new MockTransport(() => new Response("not-json", {
            status: 200,
            headers: {"content-type": "application/json"}
        })));

        await expect(client.get("/bad")).rejects.toBeInstanceOf(ParseError);
    });

    it("honors onError retry hook", async () => {
        let calls = 0;
        const transport = new MockTransport(() => {
            calls++;
            return new Response(null, {status: 500});
        });

        const client = api(transport, 5);
        await expect(client.get("/x", {
            callbacks: {
                onError: (response) => response.status !== 404
            }
        })).rejects.toBeInstanceOf(HttpError);

        expect(calls).toBeGreaterThan(1);
    });

    it("stops retry when onError returns false", async () => {
        let calls = 0;
        const transport = new MockTransport(() => {
            calls++;
            return new Response(null, {status: 500});
        });

        const client = api(transport, 5);
        await expect(client.get("/x", {
            callbacks: {
                onError: () => false
            }
        })).rejects.toBeInstanceOf(HttpError);

        expect(calls).toBe(1);
    });

    it("ejects plugins", async () => {
        const onRequest = vi.fn((req: Request) => req);
        const transport = new MockTransport(() => jsonResponse({}));
        const client = api(transport);

        const plugin = {onRequest};
        client.use(plugin);
        client.eject(plugin);
        await client.get("/x");

        expect(onRequest).not.toHaveBeenCalled();
    });

    it("supports array query params", async () => {
        const transport = new MockTransport(() => jsonResponse({}));
        const client = api(transport);
        await client.get("/search", {query: {tag: ["js", "ts"]}});

        expect(transport.requests[0].url).toContain("tag=js");
        expect(transport.requests[0].url).toContain("tag=ts");
    });
});
