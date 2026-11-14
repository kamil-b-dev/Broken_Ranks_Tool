const MAX_SHARE_LENGTH = 120_000;
const fail = () => {
    throw new Error("Link buildu jest uszkodzony lub zbyt długi.");
};

/** Keep the document in the fragment: it is not sent to the server or stored remotely. */
export const createBuildShareLink = (record, origin = window.location.origin) => {
    const payload = structuredClone(record.payload);
    if (payload.build.backpack) payload.build.backpack = [];
    payload.build.lockedSlots = [];
    payload.build.lockedDrifs = {};
    const bytes = new TextEncoder().encode(
        JSON.stringify({
            name: record.name,
            payload,
            stats: record.stats ? structuredClone(record.stats) : null,
        })
    );
    const encoded = btoa(Array.from(bytes, (value) => String.fromCharCode(value)).join(""))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "");
    if (encoded.length > MAX_SHARE_LENGTH) fail();
    return `${origin}/builds#build=${encoded}`;
};

export const readBuildShareLink = (hash) => {
    if (!hash.startsWith("#build=")) return null;
    const encoded = hash.slice(7);
    if (!encoded.length || encoded.length > MAX_SHARE_LENGTH || !/^[a-zA-Z0-9_-]+$/.test(encoded))
        fail();
    try {
        const bytes = Uint8Array.from(
            atob(encoded.replaceAll("-", "+").replaceAll("_", "/")),
            (value) => value.charCodeAt(0)
        );
        const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        if (
            typeof value.name !== "string" ||
            value.name.length > 48 ||
            !value.payload?.build?.requestData
        )
            fail();
        if (
            value.stats != null &&
            (typeof value.stats !== "object" ||
                Array.isArray(value.stats) ||
                Object.keys(value.stats).length > 128 ||
                Object.entries(value.stats).some(
                    ([key, value]) =>
                        key.length > 128 ||
                        !(
                            (typeof value === "string" && value.length <= 512) ||
                            (typeof value === "number" && Number.isFinite(value))
                        )
                ))
        )
            fail();
        return value;
    } catch {
        return fail();
    }
};
