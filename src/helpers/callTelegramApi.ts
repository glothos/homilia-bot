import axios, { AxiosResponse, Method } from 'axios';

const TELEGRAM_BOT_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_KEY}`;

export const callTelegramApi = async (path: string, method: Method, data?: any): Promise<AxiosResponse<any, any>> => {
  const payload = {
    method,
    url: `${TELEGRAM_BOT_URL}/${path}`,
    headers: {
      'Content-Type': 'application/json',
    },
    data,
  };

  if (!data) {
    delete payload.data;
  }

  const req = axios(payload);

  return req;
};

export const checkForTelegramWebhook = async (): Promise<AxiosResponse<any, any>> => {
  const req = await callTelegramApi('getWebhookInfo', 'GET');

  return req;
};
