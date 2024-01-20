/* eslint-disable no-console */

import qrcode from 'qrcode-terminal';
import { yandex as yandexConf } from './config.js';
import { authComplete, authRequest } from './yandex/api.js';
import { Controller } from './yandex/Controller.js';
import { sleep } from './utils.js';

function clearline() {
  if (process.stdout.isTTY && process.stdout.cursorTo) {
    process.stdout.cursorTo(0);
    process.stdout.clearLine(1);
  }
}

async function run() {
  const conf = yandexConf.get();

  if (!conf?.access_token) {
    const res = await authRequest();

    console.log(`Please go to ${res.verification_url} and type code: ${res.user_code}`);


    let i = 0;

    await new Promise((resolve) => {
      async function check() {
        clearline();
        process.stdout.write(`Awaiting authorization... ${++i}`);

        try {
          await authComplete(res.device_code);
          clearline();
          console.log('Successful authorized!');
          resolve(true);
        } catch (e) {
          await sleep(1000);
          check();
        }
      }
      check();
    });
  }

  const controller = new Controller();
  const info = await controller.start();

  console.log(`Bridge started at port: ${info.port}`);

  qrcode.generate(info.uri, { small: true }, qr => {
    console.log(qr);
    console.log(`Or use this code: ${info.pincode}`);
  });

  controller.fetch();
}

run();

