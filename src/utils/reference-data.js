import { get, set } from 'object-path-immutable';
import { isObject, objectHasKey, replaceMustache } from '@/utils/helper';

const objectPath = { get, set };

function parseKey(key) {
  const [dataKey, path] = key.split('@');

  if (['prevBlockData', 'loopData', 'globalData'].includes(dataKey))
    return { dataKey, path: path || '' };

  const pathArr = path?.split('.') ?? '';
  let dataPath = '';

  if (pathArr.length === 1) {
    dataPath = `${pathArr[0]}.0`;
  } else if (typeof +pathArr[0] !== 'number') {
    const firstPath = pathArr.shift();

    dataPath = `${firstPath}.0.${pathArr.join('.')}`;
  } else {
    const index = pathArr.shift();
    const firstPath = pathArr.shift();

    dataPath = `${firstPath}.${index}.${pathArr.join('.')}`;
  }

  if (dataPath.endsWith('.')) dataPath = dataPath.slice(0, -1);

  return { dataKey: 'data', path: dataPath };
}

export default function (block, data) {
  const replaceKeys = ['url', 'fileName', 'name', 'value', 'body', 'selector'];
  let replacedBlock = block;

  replaceKeys.forEach((blockDataKey) => {
    if (!objectHasKey(block.data, blockDataKey)) return;

    const newDataValue = replaceMustache(
      replacedBlock.data[blockDataKey],
      (match) => {
        const key = match.slice(2, -2).replace(/\s/g, '');

        if (!key) return '';

        const { dataKey, path } = parseKey(key);

        if (
          dataKey === 'prevBlockData' &&
          (!isObject(data.prevBlockData) || !Array.isArray(data.prevBlockData))
        ) {
          return data.prevBlockData;
        }

        const result = objectPath.get(data[dataKey], path) ?? match;

        return isObject(result) ? JSON.stringify(result) : result;
      }
    );

    replacedBlock = objectPath.set(
      replacedBlock,
      `data.${blockDataKey}`,
      newDataValue
    );
  });

  return replacedBlock;
}
