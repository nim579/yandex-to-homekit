import { Characteristic, Service } from 'hap-nodejs';
import { type Device } from './Device.js';
import { YandexCapability } from '../types/enums.js';
import { Adapter, AdapterActive, AdapterBoolean, AdapterBrightness, AdapterColorModel, AdapterColorTemperature } from './Adapters.js';
import _ from 'lodash';
import { hsToTemp, tempToHS } from '../utils.js';

type GetCapability<T extends YandexCapability, U = Yandex.Capability> = U extends { type: T } ? U : never;

export abstract class Capability<T extends YandexCapability> {
  protected _device: Device;
  protected _capablility: GetCapability<T>;

  constructor(capablility: GetCapability<T>, device: Device) {
    this._device = device;
    this._capablility = capablility;
    this.initialize();
  }

  get state(): GetCapability<T>['state'] {
    return this._capablility.state;
  }
  get capablility() {
    return this._capablility;
  }

  abstract initialize(): void
  abstract update(state: this['state'], updatedAt?: number): void
  abstract destroy(): void
}

export class CapabilityOnOff extends Capability<YandexCapability.On_Off> {
  declare characteristic: Characteristic;
  declare service: Service;
  declare adapter: Adapter;

  get _defaultService() { return Service.Switch; }
  get _services(): { [D in Yandex.DeviceType]?: new (...args: any[])=> Service } {
    return {
      'devices.types.thermostat.ac': Service.HeaterCooler,
      'devices.types.media_device.tv': Service.Television,
      'devices.types.socket': Service.Outlet,
      'devices.types.light': Service.Lightbulb,
      'devices.types.purifier': Service.AirPurifier,
    };
  }

  get _defaultAdapter() { return AdapterBoolean; }
  get _adapters(): { [D in Yandex.DeviceType]?: typeof Adapter<any, any> } {
    return {
      'devices.types.thermostat.ac': AdapterActive,
      'devices.types.media_device.tv': AdapterActive,
      'devices.types.purifier': AdapterActive,
    };
  }

  get _characteristics(): { [D in Yandex.DeviceType]?: new (...args: any[])=> Characteristic } {
    return {
      'devices.types.thermostat.ac': Characteristic.Active,
      'devices.types.media_device.tv': Characteristic.Active,
      'devices.types.purifier': Characteristic.Active,
    };
  }

  get _characteristic() {
    return this._characteristics[this._device.type] || Characteristic.On;
  }

  initialize() {
    const service = this._services[this._device.type] || this._defaultService;
    this.service = this._device.setService(service);

    const adapter = this._adapters[this._device.type] || this._defaultAdapter;
    this.adapter = new adapter(this._capablility.parameters);

    this.characteristic = this.service.getCharacteristic(this._characteristic);

    if (this._capablility.state) {
      this.characteristic
        .setValue(
          this.adapter.homekit(this._capablility.state.value)
        )
        .onGet(() => {
          return this.adapter.homekit(
            this._capablility.state.value
          );
        });
    }

    this.characteristic
      .onSet(async (rawValue: boolean) => {
        const value = this.adapter.yandex(rawValue);
        const state = this._capablility.state
          ? { ...this._capablility.state, value }
          : { instance: 'on', value };

        if (this._capablility.state) {
          this._capablility.state.value = value;
        }

        await this._device.setState([
          {
            type: this._capablility.type,
            state,
          }
        ]);
      });
  }

  update(state: this['state']) {
    if (state) {
      const value = this.adapter.homekit(state.value);

      if (value != this.characteristic.value) {
        this.characteristic.updateValue(value);
      }
    }
  }

  destroy() {
    this.characteristic
      .removeOnGet()
      .removeOnSet()
      .removeAllListeners();
  }
}

export class CapabilityRange extends Capability<YandexCapability.Range> {
  declare service: Service;
  declare adapter: Adapter;
  declare characteristic?: Characteristic;

  get _brightnessServices(): { [D in Yandex.DeviceType]?: new (...args: any[])=> Service } {
    return {
      'devices.types.media_device.tv': Service.Television,
      'devices.types.light': Service.Lightbulb,
    };
  }

  initialize() {
    if (this._capablility.parameters.instance === 'brightness') {
      this.service = this._device.setService(this._brightnessServices[this._device.type] || Service.Lightbulb);
      this.adapter = new AdapterBrightness(this._capablility.parameters);

      this.characteristic = this.service.getCharacteristic(Characteristic.Brightness);

      if (this._capablility.state)
        this.characteristic.setValue(
          this.adapter.homekit(this._capablility.state.value)
        );

      this.characteristic
        .onGet(() => {
          return this.adapter.homekit(this._capablility.state.value);
        })
        .onSet(async rawValue => {
          const value = this.adapter.yandex(rawValue);

          const state = this._capablility.state
            ? { ...this._capablility.state, value }
            : { instance: 'brightness', value };

          if (this._capablility.state) {
            this._capablility.state.value = value;
          }

          await this._device.setState([
            {
              type: this._capablility.type,
              state,
            }
          ]);
        });
    }
  }

  update(state: this['state']) {
    if (state && this.characteristic) {
      const value = this.adapter.homekit(state.value);

      if (value != this.characteristic.value) {
        this.characteristic.updateValue(value);
      }
    }
  }

  destroy() {
    if (!this.characteristic) return;

    this.characteristic
      .removeOnGet()
      .removeOnSet()
      .removeAllListeners();
  }
}

export class CapabilityColorSetting extends Capability<YandexCapability.Color_setting> {
  declare service: Service;
  declare adapters: {
    temperature_k: AdapterColorTemperature;
    color_model: AdapterColorModel;
  };
  declare characteristics: {
    hue: Characteristic;
    saturation: Characteristic;
    temp: Characteristic;
  };

  value = {
    temp: 0,
    hue: 0,
    saturation: 0,
    updated_at: 0,
  };

  getValue(state: Yandex.CapabilityState[YandexCapability.Color_setting]) {
    if (state?.instance === 'temperature_k') {
      const temp = this.adapters.temperature_k.homekit(state.value);
      const { hue, saturation } = tempToHS(temp);
      return { hue, saturation, temp };
    } else if (state?.instance === 'rgb' || state?.instance === 'hsv') {
      const { hue, saturation } = this.adapters.color_model.homekit(state);
      const temp = hsToTemp(hue, saturation);
      return { hue, saturation, temp };
    } else {
      return null;
    }
  }

  initialize() {
    this.service = this._device.setService(Service.Lightbulb);

    this.characteristics = {
      hue: this.service.getCharacteristic(Characteristic.Hue),
      saturation: this.service.getCharacteristic(Characteristic.Saturation),
      temp: this.service.getCharacteristic(Characteristic.ColorTemperature),
    };
    this.adapters = {
      temperature_k: new AdapterColorTemperature(this._capablility.parameters),
      color_model: new AdapterColorModel(this._capablility.parameters),
    };

    const value = this.getValue(this._capablility.state);

    if (value) {
      if (value.temp) this.characteristics.hue.setValue(value.hue);
      this.characteristics.hue.setValue(value.hue);
      this.characteristics.saturation.setValue(value.saturation);
      this.value = { ...this.value, ...value, updated_at: Date.now() };
    }

    const setState = _.debounce(() => this.setState(), 400, { maxWait: 700 });

    this.characteristics.temp
      .onGet(() => {
        return this.value.temp || 140;
      })
      .onSet(rawValue => {
        const temp = rawValue as number;

        const value = this.adapters.temperature_k.yandex(temp);

        this.value.updated_at = Date.now();
        this.value.temp = temp;
        this._capablility.state = {
          instance: 'temperature_k',
          value: value
        };

        setState();
      });

    this.characteristics.hue
      .onGet(() => {
        return this.value.hue;
      })
      .onSet(rawValue => {
        const hue = rawValue as number;
        const saturation = this.value.saturation as number;

        const state = this.adapters.color_model.yandex({ hue, saturation });
        const temp = hsToTemp(hue, saturation);

        this.value.updated_at = Date.now();
        this.value.hue = hue;
        this.value.temp = temp;
        this._capablility.state = state;

        setState();
      });

    this.characteristics.saturation
      .onGet(() => {
        return this.value.saturation;
      })
      .onSet(rawValue => {
        const hue = this.value.hue as number;
        const saturation = rawValue as number;

        const state = this.adapters.color_model.yandex({ hue, saturation });
        const temp = hsToTemp(hue, saturation);

        this.value.updated_at = Date.now();
        this.value.saturation = saturation;
        this.value.temp = temp;
        this._capablility.state = state;

        setState();
      });
  }

  update(state: this['state'], updatedAt: number) {
    if (state && updatedAt * 1000 > this.value.updated_at) {
      const value = this.getValue(state);

      if (value) {
        this.value = { ...value, updated_at: Date.now() };

        if (this.value.temp) {
          this.characteristics.temp.updateValue(value.temp);
        } else {
          this.characteristics.hue.updateValue(value.hue);
          this.characteristics.saturation.updateValue(value.saturation);
        }
      }
    }
  }

  async setState() {
    try {
      await this._device.setState([
        {
          type: YandexCapability.Color_setting,
          state: this.value.temp
            ? { instance: 'temperature_k', value: this.adapters.temperature_k.yandex(this.value.temp) }
            : this.adapters.color_model.yandex(this.value)
        }
      ]);
    } catch (e) {}
  }

  destroy() {
    for (const characteristic of Object.values(this.characteristics)) {
      characteristic
        .removeOnGet()
        .removeOnSet()
        .removeAllListeners();
    }
  }
}

export const capabilities: {
  [C in YandexCapability]?: (new (capablility: Yandex.Capability, device: Device)=> Capability<C>)
} = {
  [YandexCapability.On_Off]: CapabilityOnOff,
  [YandexCapability.Range]: CapabilityRange,
  [YandexCapability.Color_setting]: CapabilityColorSetting,
};
