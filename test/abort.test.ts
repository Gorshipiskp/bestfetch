import {describe, expect, it} from "vitest";
import {mergeAbortSignals} from "../bestfetch/abort";

describe("mergeAbortSignals", () => {
    it("returns undefined for no signals", () => {
        expect(mergeAbortSignals()).toBeUndefined();
    });

    it("aborts when source aborts", () => {
        const a = new AbortController();
        const merged = mergeAbortSignals(a.signal)!;
        a.abort();
        expect(merged.aborted).toBe(true);
    });
});
