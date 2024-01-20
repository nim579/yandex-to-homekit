import { Characteristic, Service, WithUUID } from 'hap-nodejs';
import { type Device } from './Device.js';
import { YandexProperty } from '../types/enums.js';
import { Adapter, AdapterAirQuality, AdapterLowBattery, AdapterMotion, AdapterNumber, AdapterSwitchEvent, AdapterTemperature } from './Adapters.js';

type GetProperty<T extends YandexProperty, U = Yandex.Property> = U extends { type: T } ? U : never;

type GetParams<I extends Yandex.Instances> =
  I extends keyof Yandex.FloatInstances
    ? { instance: I, unit: Yandex.FloatInstances[I] }
    : I extends keyof Yandex.EventInstances
      ? { instance: I, unit: Yandex.EventInstances[I] }
      : never;

export abstract class Property<T extends YandexProperty, I extends Yandex.Instances, Params = GetParams<I>> {
  protected _device: Device;
  protected _service: Service;
  protected _capablility: GetProperty<T>;
  protected _adapter: Adapter;

  abstract get _defaultService(): new (...args: any[])=> Service;

  get _services(): { [D in Yandex.DeviceType]?: new (...args: any[])=> Service } {
    return {};
  }

  abstract get _defaultAdapter(): new (params: any)=> Adapter;

  get _adapters(): { [D in Yandex.DeviceType]?: typeof AdapterNumber } {
    return {};
  }

  constructor(capablility: GetProperty<T>, device: Device) {
    this._device = device;
    this._capablility = capablility;
    this._init();
    this.initialize();
  }

  get service() {
    return this._service;
  }
  get state() {
    return this._capablility.state;
  }
  get params() {
    return this._capablility.parameters as Params;
  }
  get capablility() {
    return this._capablility;
  }

  private _init() {
    const service = this._services[this._device.type] || this._defaultService;
    this._service = this._device.setService(service);

    const adapter = this._adapters[this._device.type] || this._defaultAdapter;
    this._adapter = new adapter(this._capablility.parameters);
  }

  abstract initialize(): void
  abstract update(state: this['state'], updatedAt: number): void
  abstract destroy(): void
}

export abstract class PropertyFloat<I extends Yandex.Instances> extends Property<YandexProperty.Float, I> {
  declare characteristic: Characteristic;
  abstract get _characteristicConstructor(): WithUUID<new ()=> Characteristic>;

  initialize() {
    this.characteristic = this.service.getCharacteristic(this._characteristicConstructor);

    if (this._capablility.state) {
      this.characteristic
        .setValue(
          this._adapter.homekit(this._capablility.state?.value)
        )
        .onGet(() => {
          return this._adapter.homekit(this._capablility.state.value);
        });
    }
  }

  update(state: this['state']) {
    if (state) {
      const value = this._adapter.homekit(state.value);
      if (value != this.characteristic.value) this.characteristic.updateValue(value);
    }
  }

  destroy() {
    this.characteristic
      .removeOnGet()
      .removeAllListeners();
  }
}

export abstract class PropertyEvent<I extends Yandex.Instances> extends Property<YandexProperty.Event, I> {
  declare characteristic: Characteristic;
  declare lastEvent: number;
  abstract get _characteristicConstructor(): WithUUID<new ()=> Characteristic>;

  initialize() {
    this.characteristic = this.service.getCharacteristic(this._characteristicConstructor);

    if (this._capablility.state) {
      this.lastEvent = this._capablility.state_changed_at
        ? Math.floor(this._capablility.state_changed_at * 1000)
        : 0;

      this.characteristic
        .setValue(
          this._adapter.homekit(this._capablility.state?.value, true)
        )
        .onGet(() => {
          return this._adapter.homekit(this._capablility.state.value, true);
        });
    }
  }

  update(state: this['state'], updatedAt: number | null) {
    const time = Math.floor((updatedAt || 0) * 1000);

    if (state) {
      const value = this._adapter.homekit(
        state.value,
        state.value !== this._capablility.state?.value || time > this.lastEvent
      );
      this.characteristic.updateValue(value);
    }

    this.lastEvent = time;
  }

  destroy() {
    this.characteristic
      .removeOnGet()
      .removeAllListeners();
  }
}

export class PropertyTemperature extends PropertyFloat<'temperature'> {
  get _characteristicConstructor() { return Characteristic.CurrentTemperature; }

  get _defaultService() { return Service.TemperatureSensor; }
  get _services(): Property<any, any>['_services'] {
    return {
      'devices.types.sensor.climate': Service.TemperatureSensor,
      'devices.types.thermostat': Service.Thermostat,
      'devices.types.thermostat.ac': Service.HeaterCooler,
    };
  }

  get _defaultAdapter() { return AdapterTemperature; }
}

export class PropertyHumidity extends PropertyFloat<'humidity'> {
  get _characteristicConstructor() { return Characteristic.CurrentRelativeHumidity; }

  get _defaultService() { return Service.HumiditySensor; }
  get _services(): Property<any, any>['_services'] {
    return {
      'devices.types.sensor.climate': Service.HumiditySensor,
      'devices.types.thermostat': Service.Thermostat,
      'devices.types.thermostat.ac': Service.HeaterCooler,
      'devices.types.humidifier': Service.HumidifierDehumidifier,
    };
  }

  get _defaultAdapter() { return AdapterNumber; }
}

export class PropertyIllumination extends PropertyFloat<'illumination'> {
  get _characteristicConstructor() { return Characteristic.CurrentAmbientLightLevel; }

  get _defaultService() { return Service.LightSensor; }

  get _defaultAdapter() { return AdapterNumber; }
}

export class PropertyPM25 extends PropertyFloat<'pm2.5_density'> {
  get _characteristicConstructor() { return Characteristic.PM2_5Density; }

  get _defaultService() { return Service.AirQualitySensor; }

  get _defaultAdapter() { return AdapterNumber; }
}

export class PropertyPM10 extends PropertyFloat<'pm10_density'> {
  get _characteristicConstructor() { return Characteristic.PM10Density; }

  get _defaultService() { return Service.AirQualitySensor; }

  get _defaultAdapter() { return AdapterNumber; }
}

export class PropertyTVOC extends PropertyFloat<'tvoc'> {
  get _characteristicConstructor() { return Characteristic.VOCDensity; }

  get _defaultService() { return Service.AirQualitySensor; }

  get _defaultAdapter() { return AdapterNumber; }
}

export class PropertyAirQuality extends PropertyFloat<'air_quality'> {
  get _characteristicConstructor() { return Characteristic.AirQuality; }

  get _defaultService() { return Service.AirQualitySensor; }

  get _defaultAdapter() { return AdapterAirQuality; }
}

export class PropertyBatteryLevel extends PropertyFloat<'battery_level'> {
  get _characteristicConstructor() { return Characteristic.BatteryLevel; }

  get _defaultService() { return Service.Battery; }

  get _defaultAdapter() { return AdapterNumber; }
}

export class PropertyButton extends PropertyEvent<'button'> {
  get _characteristicConstructor() { return Characteristic.ProgrammableSwitchEvent; }

  get _defaultService() { return Service.StatelessProgrammableSwitch; }

  get _defaultAdapter() { return AdapterSwitchEvent; }
}

export class PropertyMotion extends PropertyEvent<'motion'> {
  get _characteristicConstructor() { return Characteristic.MotionDetected; }

  get _defaultService() { return Service.MotionSensor; }

  get _defaultAdapter() { return AdapterMotion; }
}

export class PropertyLowBattery extends PropertyEvent<'battery_level'> {
  get _characteristicConstructor() { return Characteristic.StatusLowBattery; }

  get _defaultService() { return Service.MotionSensor; }
  get _services(): Property<any, any>['_services'] {
    return {
      'devices.types.sensor.smoke': Service.SmokeSensor,
      'devices.types.sensor.motion': Service.MotionSensor,
      'devices.types.sensor.illumination': Service.LightSensor,
      'devices.types.sensor.water_leak': Service.LeakSensor,
    };
  }

  get _defaultAdapter() { return AdapterLowBattery; }
}

type FloatProps = {
  [I in keyof Yandex.FloatInstances]?: typeof Property<YandexProperty.Float, I>
};
type EventProps = {
  [I in keyof Yandex.EventInstances]?: typeof Property<YandexProperty.Event, I>
};

export const properties: {
  [YandexProperty.Float]: FloatProps;
  [YandexProperty.Event]: EventProps;
} = {
  [YandexProperty.Float]: {
    ['temperature']: PropertyTemperature,
    ['humidity']: PropertyHumidity,
    ['illumination']: PropertyIllumination,
    ['pm2.5_density']: PropertyPM25,
    ['pm10_density']: PropertyPM10,
    ['tvoc']: PropertyTVOC,
    ['air_quality']: PropertyAirQuality,
    ['battery_level']: PropertyBatteryLevel,
  },
  [YandexProperty.Event]: {
    ['button']: PropertyButton,
    ['motion']: PropertyMotion,
    ['battery_level']: PropertyLowBattery,
  }
};
