import _ from 'lodash';
import macaddress from 'macaddress';
import { Bridge, uuid, Categories, Service, Characteristic, HAPStorage, type PublishInfo } from 'hap-nodejs';
import { Device } from './Device.js';
import { api } from './api.js';
import { devices as config, paths } from '../config.js';
import { sleep, textToPin } from '../utils.js';

export class Controller {
  devices: Map<Yandex.ApiDevice['id'], Device>;
  bridge: Bridge;

  constructor() {
    HAPStorage.setCustomStoragePath(paths.homekit);

    this.devices = new Map();
    this.bridge = new Bridge('Yandex Bridge', uuid.generate('yth.bridge'));

    this.load();
  }

  async start() {
    const mac = (await macaddress.one()).toUpperCase();

    const accessory = this.bridge.getService(Service.AccessoryInformation);

    accessory
      ?.getCharacteristic(Characteristic.Manufacturer)
      .setValue('Yandex HomeKit Bridge');

    accessory
      ?.getCharacteristic(Characteristic.Model)
      .setValue('Nick Iv corp.');

    accessory
      ?.getCharacteristic(Characteristic.SerialNumber)
      .setValue(mac);

    accessory
      ?.getCharacteristic(Characteristic.FirmwareRevision)
      .setValue(process.env.npm_package_version ?? '0.0.0');

    const info = {
      username: mac,
      pincode: process.env['BRIDGE_PIN'] || textToPin(mac),
      port: process.env['PORT'] || 47129,
      category: Categories.BRIDGE,
    } as PublishInfo;

    await this.bridge.publish(info);

    return {
      ...info,
      uri: this.bridge.setupURI()
    };
  }

  private async _fetch() {
    const { body: response } = await api.get<Yandex.UserInfo>('user/info');

    const rooms = _.keyBy(response.rooms, 'id');
    const ids: Yandex.ApiDevice['id'][] = [];

    for (const device of response.devices) {
      ids.push(device.id);
      const room = rooms[device.room] || null;

      if (this.devices.has(device.id)) {
        this.update(device.id, device, room);
      } else {
        this.add(device, room);
      }
    }

    const currentIds = Array.from(this.devices.keys());

    const removed = _.difference(currentIds, ids);

    for (const id of removed) {
      this.remove(id);
    }
  }

  async fetch() {
    try {
      this._fetch();
    } catch(e) {}

    await sleep(1500);

    this.fetch();
  }

  add(data: Yandex.ApiDevice, room: Yandex.ApiRoom | null = null) {
    const device = new Device(data, room, this);

    this.devices.set(data.id, device);
    this.bridge.addBridgedAccessory(device.accessory);

    this.save();
  }

  update(id: Yandex.ApiDevice['id'], data: Yandex.ApiDevice, room: Yandex.ApiRoom | null = null) {
    this.devices.get(id)?.update(data, room);
    this.save();
  }

  remove(id: Yandex.ApiDevice['id']) {
    const device = this.devices.get(id);

    if (device) {
      this.bridge.removeBridgedAccessory(device.accessory);
      this.devices.delete(id);
    }

    this.save();
  }

  async setState(update: {
    id: Yandex.ApiDevice['id'];
    actions: {
      type: Yandex.Capability['type'];
      state: Yandex.Capability['state']
    }[];
  }[]) {
    this.save();

    await api.post('devices/actions', {
      json: {
        devices: update
      }
    });
  }

  load() {
    const devices = config.get() || [];
    this.devices.clear();

    for (const item of devices) {
      const device = new Device(item.device, item.room, this);
      this.devices.set(item.device.id, device);
      this.bridge.addBridgedAccessory(device.accessory);
    }
  }

  save() {
    const devices = Array.from(this.devices.values()).map(item => item.toJSON());
    config.set(devices);
  }
}
