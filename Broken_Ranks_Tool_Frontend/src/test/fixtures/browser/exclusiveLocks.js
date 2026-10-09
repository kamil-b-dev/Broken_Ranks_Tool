/** Minimal exclusive Web Locks scheduling for jsdom; browser tests use the native API. */
export const createExclusiveLocks = () => {
    const queues = new Map();
    return {
        request(name, _options, callback) {
            const result = (queues.get(name) || Promise.resolve())
                .catch(() => {})
                .then(() => callback({ name, mode: "exclusive" }));
            queues.set(name, result);
            return result;
        },
    };
};
