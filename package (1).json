import axios from "axios";

const BASE = "https://permitiqfinal.onrender.com";

export const uploadPDF = (file) => {
  const form = new FormData();
  form.append("file", file);
  return axios.post(`${BASE}/upload`, form);
};

export const sendToClaude = (text) => {
  return axios.post(`${BASE}/claude`, { text });
};
