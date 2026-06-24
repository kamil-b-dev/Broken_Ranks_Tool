import axios from 'axios';

const instance = axios.create({
    baseURL: 'http://localhost:8080/api',
    timeout: 10000, // 10 sekund timeout
    headers: {
        'Content-Type': 'application/json',
    }
});

export default instance;
