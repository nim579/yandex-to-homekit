import { Accessory, Categories, Characteristic, Service, uuid } from 'hap-nodejs';
import { textToPin, uuidToMac } from '../utils.js';
import { categoriesMap } from '../types/maps.js';
import { Capability, capabilities } from './Capability.js';
import { type Controller } from './Controller.js';
import { YandexCapability, YandexProperty } from '../types/enums.js';
import _ from 'lodash';
import { Property, properties } from './Property.js';

export class Device {
  private _device: Yandex.ApiDevice;
  private _room: Yandex.ApiRoom | null;
  private _accessory: Accessory;
  private _controller: Controller;
  capabilities: { [C in YandexCapability]?: Capability<any> };
  properties: {
    type: YandexProperty,
    instance: Yandex.Instances,
    property: Property<any, any>,
  }[];

  constructor(device: Yandex.ApiDevice, room: Yandex.ApiRoom | null = null, controller: Controller) {
    this._device = device;
    this._room = room;
    this._controller = controller;

    this.capabilities = {};
    this.properties = [];

    this._accessory = new Accessory(this.name, this.uuid);

    // @ts-expect-error: Core/BridgeCore API
    this.accessory.username = this.mac;
    // @ts-expect-error: Core/BridgeCore API
    this.accessory.pincode = this.pin;
    this.accessory.category = this.category;

    this._setAccessoryInfo();
    this._addCapabilities();
    this._addProperties();
  }

  get id() {
    return this._device.id;
  }
  get uuid() {
    return uuid.generate(`yhk.accessory.${this.id}`);
  }
  get mac() {
    return uuidToMac(this.id);
  }
  get type() {
    return this._device.type;
  }
  get category() {
    return categoriesMap[this.type] || this.type.startsWith('devices.types.hub')
      ? Categories.BRIDGE
      : Categories.OTHER;
  }
  get pin() {
    return textToPin(this.id);
  }
  get name() {
    const parts = [this._device.name];
    if (this._room) parts.push(this._room.name);
    return parts.join(' — ');
  }
  get accessory() {
    return this._accessory;
  }
  get deviceProperties() {
    const properties = this._device.properties;
    let lastUpdated = 0;
    let hasRealQuality = false;

    const airQuality = properties.reduce((mem, prop) => {
      if (['co2_level', 'pm1_density', 'pm2.5_density', 'pm10_density', 'tvoc'].includes(prop.parameters.instance)) {
        mem.push(prop.state.value as number / 1000);
      }
      if (lastUpdated < prop.last_updated) {
        lastUpdated = prop.last_updated;
      }
      if (prop.parameters.instance === 'air_quality') {
        hasRealQuality = true;
      }
      return mem;
    }, [] as number[]);

    if (airQuality.length > 0 && !hasRealQuality) {
      const avg = airQuality.reduce((mem, q) => mem + q, 0) / airQuality.length;

      return [
        ...properties,
        {
          type: YandexProperty.Float,
          reportable: true,
          retrievable: false,
          last_updated: lastUpdated,
          parameters: {
            instance: 'air_quality',
            unit: 'unit.percent',
          },
          state: {
            instance: 'air_quality',
            value: avg
          },
        } as Yandex.Property,
      ];
    }

    return properties;
  }

  update(device: Yandex.ApiDevice, room: Yandex.ApiRoom | null = null) {
    this._device = device;
    this._room = room;

    this._setAccessoryInfo();
    this._updateCapabilities();
    this._updateProperties();
  }

  setService(service: Service | typeof Service) {
    const current = this.accessory.getService(service as any);
    if (current) return current;

    return this.accessory.addService(service as Service);
  }

  async setState(actions: { type: Yandex.Capability['type']; state: Yandex.Capability['state'] }[]) {
    await this._controller.setState([{
      id: this.id,
      actions,
    }]);

    return true;
  }

  toJSON(): { device: Yandex.ApiDevice; room: Yandex.ApiRoom | null } {
    return {
      device: this._device,
      room: this._room,
    };
  }

  private _setAccessoryInfo() {
    const service = this.accessory.getService(Service.AccessoryInformation);
    service?.getCharacteristic(Characteristic.Name).setValue(this.name);
    service?.getCharacteristic(Characteristic.SerialNumber).setValue(this._device.external_id);
    service?.getCharacteristic(Characteristic.Manufacturer).setValue(this._device.skill_id || 'Yandex');
    service?.getCharacteristic(Characteristic.Model).setValue('Device');
    service?.getCharacteristic(Characteristic.FirmwareRevision).setValue('1.0');
  }

  private _addCapabilities() {
    this.capabilities = {};

    for (const item of this._device.capabilities) {
      const CapClass = capabilities[item.type];

      if (CapClass) {
        this.capabilities[item.type] = new CapClass(item, this);
      }
    }
  }

  private _updateCapabilities() {
    const used: YandexCapability[] = [];

    for (const item of this._device.capabilities) {
      if (this.capabilities[item.type]) {
        this.capabilities[item.type]?.update(item.state, item.last_updated);
      } else {
        const CapClass = capabilities[item.type];

        if (CapClass) {
          this.capabilities[item.type] = new CapClass(item, this);
        }
      }

      used.push(item.type);
    }

    const current = Object.keys(this.capabilities) as YandexCapability[];
    const removed = _.difference(current, used);

    for (const name of removed) {
      this.capabilities[name]?.destroy();
      delete this.capabilities[name];
    }
  }

  private _addProperties() {
    this.properties = [];

    for (const item of this.deviceProperties) {
      const instances = properties[item.type];
      const PropClass = instances[item.parameters.instance];

      if (PropClass) {
        this.properties.push({
          type: item.type,
          instance: item.parameters.instance,
          property: new PropClass(item, this)
        });
      }
    }
  }

  private _updateProperties() {
    const used: string[] = [];

    const props = _.keyBy(this.properties, item => `${item.type}:${item.instance}`);

    for (const item of this.deviceProperties) {
      const key = `${item.type}:${item.parameters.instance}`;

      if (props[key]) {
        const time = item.last_updated > item.state_changed_at ? item.last_updated : item.state_changed_at;
        props[key].property.update(item.state, time);
      } else {
        const instances = properties[item.type];
        const PropClass = instances[item.parameters.instance];

        if (PropClass) {
          this.properties.push({
            type: item.type,
            instance: item.parameters.instance,
            property: new PropClass(item, this)
          });
        }
      }
      used.push(key);
    }

    this.properties.reduce((mem, item) => {
      const key = `${item.type}:${item.instance}`;
      if (used.includes(key)) {
        mem.push(item);
      } else {
        item.property.destroy();
      }
      return mem;
    }, [] as typeof this.properties);
  }
}
