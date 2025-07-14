import axios from 'axios'
export const baseURL = "https://mychat-aaxu.onrender.com";
export const  httpClient = axios.create({
    baseURL : baseURL
});
