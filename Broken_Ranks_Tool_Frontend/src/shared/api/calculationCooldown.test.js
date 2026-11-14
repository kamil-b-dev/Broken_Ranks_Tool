import { afterEach, beforeEach, expect, it, vi } from "vitest";
import apiClient from "./axiosConfig";
import {
    getCalculationCooldown,
    postCalculation,
    subscribeCalculationCooldown,
} from "./calculationCooldown";

vi.mock("./axiosConfig", () => ({ default: { post: vi.fn() } }));

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
});
afterEach(() => {
    const unsubscribe = subscribeCalculationCooldown(() => {});
    vi.advanceTimersByTime(120000);
    unsubscribe();
    vi.useRealTimers();
});

const rateLimit = (header, status = 429) => ({
    response: { status, headers: { "retry-after": header } },
});

it("shares the server cooldown across optimizer and planner requests without automatic retries", async () => {
    const failure = rateLimit("37");
    apiClient.post.mockRejectedValueOnce(failure);
    await expect(postCalculation("/optimizer/drifs", {})).rejects.toBe(failure);
    expect(getCalculationCooldown()).toBe(37);
    vi.advanceTimersByTime(1200);
    expect(getCalculationCooldown()).toBe(36);
    await expect(postCalculation("/progression-path/plan", {})).rejects.toThrow(
        "Przekroczono limit żądań."
    );
    expect(apiClient.post).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(35800);
    expect(getCalculationCooldown()).toBe(0);
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    apiClient.post.mockResolvedValueOnce({ data: { stages: [] } });
    const options = { signal: new AbortController().signal };
    await expect(postCalculation("/progression-path/plan", {}, options)).resolves.toEqual({
        data: { stages: [] },
    });
    expect(apiClient.post).toHaveBeenLastCalledWith("/progression-path/plan", {}, options);
});

it.each([undefined, "", "invalid", "-1", "0", "1.5", "Infinity", "99999999999999999999"])(
    "keeps the original error and allows retrying when Retry-After is %s",
    async (header) => {
        const failure = rateLimit(header);
        apiClient.post.mockRejectedValue(failure);
        await expect(postCalculation("/optimizer/drifs", {})).rejects.toBe(failure);
        expect(getCalculationCooldown()).toBe(0);
        await expect(postCalculation("/optimizer/drifs", {})).rejects.toBe(failure);
        expect(apiClient.post).toHaveBeenCalledTimes(2);
    }
);

it("does not create a rate cooldown for other failures with Retry-After", async () => {
    const failure = rateLimit("30", 503);
    apiClient.post.mockRejectedValueOnce(failure);
    await expect(postCalculation("/optimizer/drifs", {})).rejects.toBe(failure);
    expect(getCalculationCooldown()).toBe(0);
});

it("keeps the longest deadline if concurrent calculations receive different delays", async () => {
    let rejectFirst;
    let rejectSecond;
    apiClient.post
        .mockImplementationOnce(() => new Promise((_, reject) => (rejectFirst = reject)))
        .mockImplementationOnce(() => new Promise((_, reject) => (rejectSecond = reject)));
    const first = postCalculation("/optimizer/drifs", {}).catch(() => {});
    const second = postCalculation("/progression-path/plan", {}).catch(() => {});
    rejectFirst(rateLimit("40"));
    await first;
    rejectSecond(rateLimit("10"));
    await second;
    expect(getCalculationCooldown()).toBe(40);
});
