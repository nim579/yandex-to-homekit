import { Characteristic } from 'hap-nodejs';
import { YandexCapability, YandexProperty } from '../types/enums.js';
import { hsToHSV, hsToRGB, hsvToHs, rgbToHS, scaleRange } from '../utils.js';

type Props = keyof Yandex.CapabilityParameters | keyof Yandex.PropertyParameters;

export type GetParams<P> = P extends keyof Yandex.CapabilityParameters
  ? Yandex.CapabilityParameters[P]
  : P extends keyof Yandex.PropertyParameters
    ? Yandex.PropertyParameters[P]
    : undefined;

export abstract class Adapter<Y = any, H = any, P extends Props | undefined = any> {
  constructor(public params: GetParams<P>) {}
  abstract yandex(value: H, changed?: boolean): Y
  abstract homekit(value: Y, changed?: boolean): H
}

export class AdapterBoolean extends Adapter<
  boolean,
  boolean,
  undefined
> {
  yandex(value: boolean) {
    return value;
  }
  homekit(value: boolean) {
    return value;
  }
}

export class AdapterNumber extends Adapter<
  number,
  number,
  undefined
> {
  yandex(value: number) {
    return value;
  }
  homekit(value: number) {
    return value;
  }
}

export class AdapterActive extends Adapter<
  boolean,
  typeof Characteristic.Active.ACTIVE | typeof Characteristic.Active.INACTIVE,
  undefined
> {
  yandex(value: number) {
    return value === Characteristic.Active.ACTIVE;
  }
  homekit(value: boolean) {
    return value
      ? Characteristic.Active.ACTIVE
      : Characteristic.Active.INACTIVE;
  }
}

export class AdapterHomeKitCameraActive extends Adapter<
  boolean,
  typeof Characteristic.HomeKitCameraActive.ON | typeof Characteristic.HomeKitCameraActive.OFF,
  undefined
> {
  yandex(value: number) {
    return value === Characteristic.HomeKitCameraActive.ON;
  }
  homekit(value: boolean) {
    return value
      ? Characteristic.HomeKitCameraActive.ON
      : Characteristic.HomeKitCameraActive.OFF;
  }
}

export class AdapterTemperature extends Adapter<number, number, YandexProperty.Float> {
  yandex(value: number) {
    if (this.params?.unit === 'unit.temperature.kelvin')
      return value + 273.15;

    return value;
  }
  homekit(value: number) {
    if (this.params?.unit === 'unit.temperature.kelvin')
      return value - 273.15;

    return value;
  }
}

export class AdapterAirQuality extends Adapter<number, number, YandexProperty.Float> {
  yandex(value: number) {
    return value / 5;
  }
  homekit(value: number) {
    return Math.ceil(value * 5);
  }
}

export class AdapterBrightness extends Adapter<number, number, YandexCapability.Range> {
  yandex(value: number): number {
    if (this.params.range.max != null && this.params.range.min != null) {
      return scaleRange(value, { min: 0, max: 100 }, this.params.range);
    }
    return value;
  }
  homekit(value: number) {
    if (this.params.range.max != null && this.params.range.min != null) {
      return scaleRange(value, this.params.range, { min: 0, max: 100 });
    }
    return value;
  }
}

export type AdapterColorModelYandex = { instance: 'rgb', value: number } | { instance: 'hsv'; value: Record<'h' | 's' | 'v', number>; };
export type AdapterColorModelHomekit = { hue: number; saturation: number };

export class AdapterColorModel extends Adapter<
  AdapterColorModelYandex,
  AdapterColorModelHomekit,
  YandexCapability.Color_setting
> {
  yandex(value: AdapterColorModelHomekit): AdapterColorModelYandex {
    if (this.params.color_model === 'rgb') {
      return { instance: 'rgb', value: hsToRGB(value.hue, value.saturation) };
    } else {
      return { instance: 'hsv', value: hsToHSV(value.hue, value.saturation) };
    }
  }
  homekit(value: AdapterColorModelYandex): AdapterColorModelHomekit {
    if (value.instance === 'rgb') {
      return rgbToHS(value.value);
    } else {
      return hsvToHs(value.value.h, value.value.s, value.value.v);
    }
  }
}

export class AdapterColorTemperature extends Adapter<number, number, YandexCapability.Color_setting> {
  yandex(value: number): number {
    if (this.params.temperature_k?.max != null && this.params.temperature_k?.min != null) {
      return scaleRange(value, { min: 140, max: 500 }, this.params.temperature_k);
    }
    return value;
  }
  homekit(value: number): number {
    if (this.params.temperature_k?.max != null && this.params.temperature_k?.min != null) {
      return scaleRange(value, this.params.temperature_k, { min: 140, max: 500 });
    }
    return value;
  }
}

type AdapterSwitchEventYandex = Yandex.EventInstances['button'];
type AdapterSwitchEventHomekit = typeof Characteristic.ProgrammableSwitchEvent['SINGLE_PRESS' | 'LONG_PRESS' | 'DOUBLE_PRESS'];

export class AdapterSwitchEvent extends Adapter<
  AdapterSwitchEventYandex | null,
  AdapterSwitchEventHomekit | null,
  YandexProperty.Event
> {
  yandex(value: AdapterSwitchEventHomekit, changed: boolean): AdapterSwitchEventYandex | null {
    if (changed === false) return null;

    switch (value) {
    case Characteristic.ProgrammableSwitchEvent.LONG_PRESS:
      return 'long_press';
    case Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS:
      return 'double_click';
    case Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS:
      return 'click';
    default:
      return null;
    }
  }
  homekit(value: AdapterSwitchEventYandex, changed: boolean) {
    if (changed === false) return null;

    switch (value) {
    case 'long_press':
      return Characteristic.ProgrammableSwitchEvent.LONG_PRESS;
    case 'double_click':
      return Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS;
    case 'click':
      return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
    default:
      return null;
    }
  }
}

export class AdapterMotion extends Adapter<
  Yandex.EventInstances['motion'] | null,
  boolean | null,
  YandexProperty.Event
> {
  yandex(value: boolean, changed: boolean): Yandex.EventInstances['motion'] | null {
    return value && changed
      ? 'detected'
      : 'not_detected';
  }
  homekit(value: Yandex.EventInstances['motion'], changed: boolean): boolean | null {
    return value === 'detected' && changed;
  }
}

type AdapterLowBatteryYandex = Yandex.EventInstances['battery_level'];
type AdapterLowBatteryHomekit = typeof Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL | typeof Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;

export class AdapterLowBattery extends Adapter<
  AdapterLowBatteryYandex,
  AdapterLowBatteryHomekit,
  YandexProperty.Event
> {
  yandex(value: AdapterLowBatteryHomekit): AdapterLowBatteryYandex {
    return value === Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      ? 'low'
      : 'normal';
  }
  homekit(value: AdapterLowBatteryYandex): AdapterLowBatteryHomekit {
    return value === 'low'
      ? Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW
      : Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
  }
}
