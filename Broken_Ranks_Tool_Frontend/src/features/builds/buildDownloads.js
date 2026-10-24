export const downloadBuildPayload = (payload, date = new Date()) => {
    downloadBuildText(
        JSON.stringify(payload, null, 2),
        `broken-ranks-build-${date.toISOString().slice(0, 10)}.json`
    );
};

export const downloadBuildText = (text, filename, type = "application/json") => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
