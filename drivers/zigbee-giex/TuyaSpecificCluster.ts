'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

const ATTRIBUTES = {
};

// "dp" describes the action/message of a command frame.
// "dp" is composed by a type ("datatype") and an device dependant identifier ("dataidentifier").
// "transid" is a counter and a response will have the same transid as the command.
// "Status" and "fn" are always 0.
const DATA_STRUCTURE = {
    'status': ZCLDataTypes.uint8,
    'transid': ZCLDataTypes.uint8,
    'dp': ZCLDataTypes.uint8,
    'datatype': ZCLDataTypes.uint8,
    'length': ZCLDataTypes.data16,
    'data': ZCLDataTypes.buffer
};

// https://developer.tuya.com/en/docs/iot/tuya-zigbee-universal-docking-access-standard?id=K9ik6zvofpzql
const COMMANDS = {
    datapoint: {
        id: 0,
        args: { ... DATA_STRUCTURE }
    },

    reporting: {
        id: 0x01,
        args: { ... DATA_STRUCTURE }
    },

    response: {
        id: 0x02,
        args: { ... DATA_STRUCTURE }
    },
};

// 0x00 	RAW
// 0x01 	BOOL    1 byte
// 0x02 	VALUE   4 byte unsigned integer
// 0x03 	STRING  variable length string
// 0x04     ENUM    1 byte enum
// 0x05     FAULT   1 byte bitmap
export enum TuyaDataTypes {
    RAW = 0,    // [ bytes ]
    BOOL = 1,   // [0/1]
    VALUE = 2,  // [ 4 byte value ]
    STRING = 3, // [ N byte string ]
    ENUM = 4,   // [ 0-255 ]
    FAULT = 5,  // [ 1,2,4 bytes ] as bits
};

export type TuyaCommand = {
    status: number,
    transid: number,
    dp: number,
    datatype: TuyaDataTypes,
    length: number,
    data: Buffer,
}

export class TuyaSpecificCluster extends Cluster {

    static get ID() {
        return 61184;
    }

    static get NAME() {
        return 'tuya';
    }

    static get ATTRIBUTES() {
        return ATTRIBUTES;
    }

    static get COMMANDS() {
        return COMMANDS;
    }

    onReporting(response: TuyaCommand) {
        this.emit(`reporting`, response);
    }

    onResponse(response: TuyaCommand) {
        this.emit(`response`, response);
    }
}
