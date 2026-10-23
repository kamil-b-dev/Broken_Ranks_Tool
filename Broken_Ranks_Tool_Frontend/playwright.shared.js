import process from "node:process";

export const productionServerCommand = (port) =>
    `${process.env.PLAYWRIGHT_USE_EXISTING_BUILD === "1" ? "" : "npm run build && "}npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`;
