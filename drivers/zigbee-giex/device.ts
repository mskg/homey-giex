// import Homey from 'homey';
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster } = require('zigbee-clusters');

import moment from 'moment';
import { TuyaCommand, TuyaDataTypes, TuyaSpecificCluster } from './TuyaSpecificCluster';
import { GixDataPoints } from './GixDataPoints';
import { getDataValue } from './getDataValue';

Cluster.addCluster(TuyaSpecificCluster);

class MyDevice extends ZigBeeDevice {
  _transactionID = 0;
  set transactionID(val) {
    this._transactionID = val % 256;
  }

  get transactionID() {
    return this._transactionID;
  }

  // Boolean
  async writeBool(dp: number, value: boolean) {
    const data = Buffer.alloc(1);
    data.writeUInt8(value ? 0x01 : 0x00, 0);
    return this.zclNode.endpoints[1].clusters.tuya.datapoint({
      status: 0,
      transid: this.transactionID++,
      dp,
      datatype: TuyaDataTypes.BOOL,
      length: 1, // 1 bit
      data
    } as TuyaCommand);
  }

  // int type value
  async writeData32(dp: number, value: number) {
    const data = Buffer.alloc(4);
    data.writeUInt32BE(value, 0);
    return this.zclNode.endpoints[1].clusters.tuya.datapoint({
      status: 0,
      transid: this.transactionID++,
      dp,
      datatype: TuyaDataTypes.VALUE,
      length: 4, // 4 bits
      data
    } as TuyaCommand);
  }

  async onResponse(data: TuyaCommand) {
    this.log('onResponse', data);

    const dp = data.dp;
    const value = getDataValue(data);

    switch (dp) {
      case GixDataPoints.ValveState:
        this.log("State", value);
        this.setCapabilityValue('onoff', Boolean(value))
        break;

      case GixDataPoints.ValveMode:
        this.log("Mode", value);
        this.setCapabilityValue("giex_irrigation_mode", value ? "1" : "0");
        break;

      case GixDataPoints.IrrigationTarget:
        this.log("IrrigationTarget", value);
        this.setCapabilityValue("giex_irrigation_target", value);
        break;

      // case dataPoints.CycleIrrigationNumTimes:
      //   this.log("dataPoints.CycleIrrigationNumTimes", value);
      //   this.setCapabilityValue("giex_irrigation_target", value);
      //   break;

      // case dataPoints.CycleIrrigationInterval:
      //   this.log("CycleIrrigationInterval", value);
      //   this.setCapabilityValue("giex_irrigation_target", value);
      //   break;

      case GixDataPoints.WaterConsumed:
        this.log("WaterConsumed", value);
        this.setCapabilityValue("giex_irrigation_water_consumed", value);
        break;

      case GixDataPoints.IrrigationStartTime:
        this.log("IrrigationStartTime", value);

        if ((value as string).match(/\-/)) {
          // we don't choose it
          this.setCapabilityValue("giex_irrigation_start", value);
        } else {
          this.setCapabilityValue("giex_irrigation_start", moment().format("LTS"));
        }
        break;

      case GixDataPoints.IrrigationEndTime:
        this.log("IrrigationEndTime", value);

        if ((value as string).match(/\-/)) {
          this.setCapabilityValue("giex_irrigation_end", value);
        } else {
          // we don't choose it
          this.setCapabilityValue("giex_irrigation_end", moment().format("LTS"));
        }        
        break;

      case GixDataPoints.LastIrrigationDuration:
        this.log("LastIrrigationDuration", value);

        const duration = moment.duration(value as string);

        let seconds = duration.asSeconds();
        this.setCapabilityValue("giex_irrigation_duration", Math.ceil(seconds / 60));
        break;

      case GixDataPoints.Battery:
        this.log("Battery", value);
        this.setCapabilityValue("measure_battery", value);
        break;

      default:
        this.log("was not used.");
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    if (changedKeys.includes('target')) {
      this.writeData32(GixDataPoints.IrrigationTarget, newSettings['target'] as number);
    }
  }

  async onNodeInit({ zclNode }: any) {
    this.enableDebug();
    this.printNode();

    this.registerCapabilityListener(
      "onoff",
      (value: boolean) => {
        this.writeBool(GixDataPoints.ValveState, value);
      }
    )

    this.registerCapabilityListener(
      "giex_irrigation_mode",
      (value: string) => {
        this.writeBool(GixDataPoints.ValveMode, value == "1");
      }
    )

    this.registerCapabilityListener(
      "giex_irrigation_target",
      (value: number) => {
        this.writeData32(GixDataPoints.IrrigationTarget, value);
      }
    )

    zclNode.endpoints[1].clusters.tuya.on("response", (value: TuyaCommand) => this.onResponse(value));
    zclNode.endpoints[1].clusters.tuya.on("report", (value: TuyaCommand) => this.onResponse(value));

    try {
      await zclNode.endpoints[1].clusters.basic.readAttributes(
        ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'hwVersion', 'stackVersion']
      );

      this.writeBool(GixDataPoints.ValveMode, (this.getCapabilityValue("giex_irrigation_mode") || "1") == "1");
      this.writeData32(GixDataPoints.IrrigationTarget, this.getSetting('target') || 600);
    }
    catch (e) {
      this.error('Error when reading device attributes ', e);
    }
  }
}

module.exports = MyDevice;