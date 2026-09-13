import axios from "axios";

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
    timeout: 30000, // optymalizacja może analizować kilka wariantów buildu
    headers: {
        "Content-Type": "application/json",
    },
});

export default instance;
