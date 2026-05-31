import {describe, expect, it} from "vitest";
import {buildURL} from "../bestfetch/misc";

describe("buildURL", () => {
    it("appends query params", () => {
        expect(buildURL("/users", {limit: 10, q: "a b"})).toBe("/users?limit=10&q=a+b");
    });

    it("merges with existing query", () => {
        expect(buildURL("/users?foo=1", {bar: 2})).toBe("/users?foo=1&bar=2");
    });

    it("repeats array values", () => {
        expect(buildURL("/tags", {tag: ["a", "b"]})).toBe("/tags?tag=a&tag=b");
    });

    it("skips null and undefined", () => {
        expect(buildURL("/x", {a: null, b: undefined, c: 1})).toBe("/x?c=1");
    });
});
