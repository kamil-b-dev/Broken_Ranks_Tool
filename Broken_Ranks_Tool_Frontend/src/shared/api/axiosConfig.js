import axios from "axios";

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
    timeout: 30000, // Optimization may evaluate several build variants.
    headers: {
        "Content-Type": "application/json",
    },
});

export default instance;
