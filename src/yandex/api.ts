import got from 'got';
import { yandex as conf } from "../config.js";

export type OAuthResult = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: 'bearer';
};
export type DeviceResult = {
  device_code: string;
  expires_in: number;
  interval: number;
  user_code: string;
  verification_url: string;
};

let config = conf.get();

export const api = got.extend({
  prefixUrl: 'https://api.iot.yandex.net/v1.0',
  responseType: 'json',
  hooks: {
    beforeRequest: [
      options => {
        const bearer = config?.access_token;
        if (bearer) options.headers['Authorization'] = `Bearer ${bearer}`;
      }
    ],
    afterResponse: [
      async (response, retryWithMergedOptions) => {
        if (response.statusCode === 401) {
          const config = await refresh();

          const updatedOptions = {
            headers: {
              'Authorization': `Bearer ${config.access_token}`
            }
          };

          return retryWithMergedOptions(updatedOptions);
        }

        return response;
      }
    ]
  }
});

export const refresh = async () => {
  if (!config) throw new Error('Yandex not configured');

  const { body } = await got.post<OAuthResult>('https://oauth.yandex.ru/token', {
    form: {
      grant_type: 'refresh_token',
      refresh_token: config.refresh_token,
      client_id: config.client_id,
      client_secret: config.client_secret
    },
    responseType: 'json'
  });

  config = {
    ...config,
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + body.expires_in * 1000,
  };

  conf.set(config);

  return config;
};

export const authRequest = async () => {
  if (!config) throw new Error('Yandex not configured');

  const { body } = await got.post<DeviceResult>('https://oauth.yandex.ru/device/code', {
    form: {
      client_id: config.client_id,
    },
    responseType: 'json'
  });

  return body;
};

export const authComplete = async (code: string) => {
  if (!config) throw new Error('Yandex not configured');

  const { body } = await got.post<OAuthResult>('https://oauth.yandex.ru/token', {
    form: {
      client_id: config.client_id,
      client_secret: config.client_secret,
      grant_type: 'device_code',
      code,
    },
    responseType: 'json'
  });

  config = {
    ...config,
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + body.expires_in * 1000,
  };

  conf.set(config);

  return config;
};
