import colors from './util/colors';
import logger from './util/logger';

export default (layers, entity) => {
  const layerTable = layers[entity.layer];
  if (layerTable) {
    const colorNumber = ('colorNumber' in entity) ? entity.colorNumber : layerTable.colorNumber;
    const rgb = colors[colorNumber];
    if (rgb) {
      return rgb;
    } else {
      logger.warn();
      return [0, 0, 0];
    }
  } else {
    logger.warn();
    return [0, 0, 0];
  }
};
