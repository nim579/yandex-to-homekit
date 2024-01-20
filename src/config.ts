import { readFileSync, writeFileSync } from 'fs';
import homefolder from 'home-folder';

type YandexConfig = {
  client_id: string;
  client_secret: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};
type Device = {
  device: Yandex.ApiDevice;
  room: Yandex.ApiRoom | null;
};

homefolder.init('yandex-to-homekit');

export const paths = {
  yandex: homefolder.resolve('yandex.json'),
  homekit: homefolder.CONFIG_PATH,
  devices: homefolder.resolve('devices.json'),
};

export const configFabric = <T>(filePath: string, defaults: T) => {
  const conf = {
    get(): T | null {
      try {
        return JSON.parse(readFileSync(filePath).toString());
      } catch (e) {
        return null;
      }
    },
    set(config: T) {
      writeFileSync(filePath, JSON.stringify(config));
    },
  };

  if (!conf.get()) conf.set(defaults);

  return conf;
};

const yandexConf = () => {
  const def: YandexConfig = {
    client_id: process.env['YANDEX_CLIENT_ID'] || '',
    client_secret: process.env['YANDEX_CLIENT_SECRET'] || '',
  };
  if (!def.client_id || !def.client_secret) throw new Error('Yandex not configured');

  const conf = configFabric(paths.yandex, def);
  const current = conf.get() || def;

  if (current.client_id !== def.client_id || current.client_secret !== def.client_secret) {
    conf.set(def);
  }

  return conf;
};

export const yandex = yandexConf();
export const devices = configFabric(paths.devices, [] as Device[]);
