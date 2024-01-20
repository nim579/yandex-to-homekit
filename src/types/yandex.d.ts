import { YandexCapability, YandexProperty } from './enums.ts';

declare global {
  type Range = {
    min: number;
    max: number;
    precision?: number;
  }

  namespace Yandex {
    type DeviceType = 'devices.types.camera' |
      'devices.types.cooking' |
      'devices.types.cooking.coffee_maker' |
      'devices.types.cooking.kettle' |
      'devices.types.cooking.multicooker' |
      'devices.types.dishwasher' |
      'devices.types.humidifier' |
      'devices.types.iron' |
      'devices.types.light' |
      'devices.types.media_device' |
      'devices.types.media_device.receiver' |
      'devices.types.media_device.tv' |
      'devices.types.media_device.tv_box' |
      'devices.types.openable' |
      'devices.types.openable.curtain' |
      'devices.types.other' |
      'devices.types.pet_drinking_fountain' |
      'devices.types.pet_feeder' |
      'devices.types.purifier' |
      'devices.types.sensor' |
      'devices.types.sensor.button' |
      'devices.types.sensor.climate' |
      'devices.types.sensor.gas' |
      'devices.types.sensor.illumination' |
      'devices.types.sensor.motion' |
      'devices.types.sensor.open' |
      'devices.types.sensor.smoke' |
      'devices.types.sensor.vibration' |
      'devices.types.sensor.water_leak' |
      'devices.types.smart_meter' |
      'devices.types.smart_meter.cold_water' |
      'devices.types.smart_meter.electricity' |
      'devices.types.smart_meter.gas' |
      'devices.types.smart_meter.heat' |
      'devices.types.smart_meter.hot_water' |
      'devices.types.socket' |
      'devices.types.switch' |
      'devices.types.thermostat' |
      'devices.types.thermostat.ac' |
      'devices.types.vacuum_cleaner' |
      'devices.types.washing_machine';

    type CapabilityParameters = {
      [YandexCapability.On_Off]: {
        split: boolean;
      }
      [YandexCapability.Color_setting]: {
        color_model?: 'hsv' | 'rgb';
        temperature_k?: Range;
        color_scene?: {
          id: string;
        };
      };
      [YandexCapability.Range]: {
        instance: 'brightness' | 'humidity' | 'open';
        unit: 'unit.percent';
        random_access: boolean;
        range: Range;
      } | {
        instance: 'volume';
        unit?: 'unit.percent';
        random_access: boolean;
        range: Range;
      } | {
        instance: 'channel';
        random_access: boolean;
        range: Range;
      } | {
        instance: 'temperature';
        unit: 'unit.temperature.celsius' | 'unit.temperature.kelvin';
        random_access: boolean;
        range: Range;
      };
      [YandexCapability.Toggle]: {
        instance: 'backlight' | 'controls_locked' | 'ionization' | 'keep_warm' | 'mute' | 'oscillation' | 'pause';
      };
      [YandexCapability.Mode]: any;
      [YandexCapability.Video_stream]: any;
    };
    type CapabilityState = {
      [YandexCapability.On_Off]: {
        instance: 'on';
        value: boolean;
      }
      [YandexCapability.Color_setting]: {
        instance: 'rgb';
        value: number;
      } | {
        instance: 'temperature_k';
        value: number;
      } | {
        instance: 'scene';
        value: string;
      } | {
        instance: 'hsv';
        value: Record<'h' | 's' | 'v', number>;
      };
      [YandexCapability.Range]: {
        instance: 'brightness' | 'humidity' | 'open' | 'volume' | 'channel' | 'temperature';
        value: number;
      };
      [YandexCapability.Toggle]: {
        instance: 'backlight' | 'controls_locked' | 'ionization' | 'keep_warm' | 'mute' | 'oscillation' | 'pause';
        value: boolean;
      };
      [YandexCapability.Mode]: any;
      [YandexCapability.Video_stream]: any;
    };

    type FloatInstances = {
      'amperage': 'unit.ampere';
      'battery_level': 'unit.percent';
      'co2_level': 'unit.ppm';
      'electricity_meter': 'unit.kilowatt_hour';
      'food_level': 'unit.percent';
      'gas_meter': 'unit.cubic_meter';
      'heat_meter': 'unit.gigacalorie';
      'humidity': 'unit.percent';
      'illumination': 'unit.illumination.lux';
      'pm1_density': 'unit.density.mcg_m3';
      'pm2.5_density': 'unit.density.mcg_m3';
      'pm10_density': 'unit.density.mcg_m3';
      'power': 'unit.watt';
      'pressure': 'unit.pressure.atm' | 'unit.pressure.pascal' | 'unit.pressure.bar' | 'unit.pressure.mmhg';
      'temperature': 'unit.temperature.celsius' | 'unit.temperature.kelvin';
      'tvoc': 'unit.density.mcg_m3';
      'voltage': 'unit.volt';
      'water_level': 'unit.percent';
      'water_meter': 'unit.cubic_meter';
      'air_quality': 'unit.percent';
      'meter': undefined;
    };
    type EventInstances = {
      'vibration': 'tilt' | 'fall' | 'vibration';
      'open': 'opened' | 'closed';
      'button': 'click' | 'double_click' | 'long_press';
      'motion': 'detected' | 'not_detected';
      'smoke': 'detected' | 'not_detected' | 'high';
      'gas': 'detected' | 'not_detected' | 'high';
      'battery_level': 'low' | 'normal';
      'food_level': 'low' | 'normal' | 'empty';
      'water_level': 'low' | 'normal' | 'empty';
      'water_leak': 'dry' | 'leak';
    }
    type Instances = keyof Yandex.FloatInstances | keyof Yandex.EventInstances;

    type PropertyParameters = {
      [YandexProperty.Float]: {
        [K in keyof FloatInstances]: {
          instance: K;
          unit: FloatInstances[K];
        }
      }[keyof FloatInstances];
      [YandexProperty.Event]: {
        [K in keyof EventInstances]: {
          instance: K;
          events: { event: EventInstances[K] }[];
        }
      }[keyof EventInstances];
    };

    type PropertyState = {
      [YandexProperty.Float]: {
        instance: keyof FloatInstances;
        value: number;
      };
      [YandexProperty.Event]: {
        [K in keyof EventInstances]: {
          instance: K;
          value: EventInstances[K];
        }
      }[keyof EventInstances];
    };

    type Capability = {
      [K in keyof typeof YandexCapability]: {
        type: typeof YandexCapability[K];
        reportable: boolean;
        retrievable: boolean;
        last_updated: number;
        parameters: CapabilityParameters[typeof YandexCapability[K]];
        state: CapabilityState[typeof YandexCapability[K]];
      }
    }[keyof typeof YandexCapability];

    type Property = {
      [K in keyof typeof YandexProperty]: {
        type: typeof YandexProperty[K];
        reportable: boolean;
        retrievable: boolean;
        last_updated: number;
        parameters: PropertyParameters[typeof YandexProperty[K]];
        state: PropertyState[typeof YandexProperty[K]];
        state_changed_at: number;
      }
    }[keyof typeof YandexProperty];

    type ApiHouse = {
      id: string;
      name: string;
      type: string;
    };
    type ApiRoom = {
      id: string;
      name: string;
      household_id: string;
      devices: string[];
    };
    type ApiDevice = {
      id: string;
      name: string;
      type: DeviceType;
      aliases: string[];
      external_id: string;
      skill_id: string;
      household_id: ApiHouse['id'];
      room: ApiRoom['id'];
      groups: string[];
      capabilities: Capability[];
      properties: Property[];
    };
    type ApiGroup = {
      id: string;
      name: string;
      aliases: string;
      household_id: ApiHouse['id'];
      type: string;
      devices: ApiDevice['id'];
      capabilities: Capability[];
    };
    type ApiScenario = {
      id: string;
      name: string;
      is_active: boolean;
    };

    type UserInfo = {
      households: ApiHouse[];
      rooms: ApiRoom[];
      devices: ApiDevice[];
      groups: ApiGroup[];
      scenarios: ApiScenario[];
    }
  }
}
