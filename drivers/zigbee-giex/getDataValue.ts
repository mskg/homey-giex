import { TuyaCommand, TuyaDataTypes } from './TuyaSpecificCluster';

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks: Buffer) => {
  let value = 0;

  for (let i = 0; i < chunks.length; i++) {
    value = value << 8;
    value += chunks[i];
  }

  return value;
};

type ReturnType = string | boolean | Buffer | number;

export function getDataValue(dpValue: TuyaCommand): ReturnType {
  switch (dpValue.datatype) {
    case TuyaDataTypes.RAW:
      return dpValue.data;

    case TuyaDataTypes.BOOL:
      return dpValue.data[0] === 1;

    case TuyaDataTypes.VALUE:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);

    case TuyaDataTypes.STRING:
      let dataString = '';
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;

    case TuyaDataTypes.ENUM:
      return dpValue.data[0];

    case TuyaDataTypes.FAULT:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
  }
}
