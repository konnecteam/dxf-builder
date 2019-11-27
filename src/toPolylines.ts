import { Box2 } from 'vecks';

import applyTransforms from './applyTransforms';
import denormalise from './denormalise';
import entityToPolyline from './entityToPolyline';
import colors from './util/colors';
import logger from './util/logger';

export default parsed => {
  const entities = denormalise(parsed);
  const polylines = entities.map(entity => {
    const layerTable = parsed.tables.layers[entity.layer];
    let rgb;
    if (layerTable) {
      const colorNumber = ('colorNumber' in entity) ? entity.colorNumber : layerTable.colorNumber;
      rgb = colors[colorNumber];
      if (rgb === undefined) {
        logger.warn();
        rgb = [0, 0, 0];
      }
    } else {
      logger.warn();
      rgb = [0, 0, 0];
    }

    return { rgb, id : entity.objvalId, vertices: applyTransforms(entityToPolyline(entity), entity.transforms) };
  });

  const bbox = new Box2();
  polylines.forEach(polyline => {
    polyline.vertices.forEach(vertex => {
      bbox.expandByPoint({ x: vertex[0], y: vertex[1] });
    });
  });

  return { bbox, polylines };
};
