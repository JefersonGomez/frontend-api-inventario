// src/api/assistant.js
import { api }from "./client";

export const sendChatMessage = (message) =>
  api.post("/assistant/chat", { message }).then((res) => res.data);