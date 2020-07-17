import logger from '../util/logger';
import arc from './entity/arc';
import attrib from './entity/attrib';
import circle from './entity/circle';
import ellipse from './entity/ellipse';
import insert from './entity/insert';
import line from './entity/line';
import lwpolyline from './entity/lwpolyline';
import mtext from './entity/mtext';
import point from './entity/point';
import polyline from './entity/polyline';
import solid from './entity/solid';
import spline from './entity/spline';
import text from './entity/text';
import vertex from './entity/vertex';

const handlers = [
  point,
  line,
  lwpolyline,
  polyline,
  vertex,
  circle,
  arc,
  ellipse,
  spline,
  solid,
  mtext,
  insert,
  attrib,
  text,
].reduce((acc, mod) => {
  acc[mod.TYPE] = mod;
  return acc;
}, {});

export default tuples => {
  const entities = [];
  const entityGroups = [];
  let currentEntityTuples;

  // First group them together for easy processing
  tuples.forEach(tuple => {
    const type = tuple[0];
    if (type === 0) {
      currentEntityTuples = [];
      entityGroups.push(currentEntityTuples);
    }
    currentEntityTuples.push(tuple);
  });

  let currentPolyline;
  entityGroups.forEach(entityGroup => {
    const entityType = entityGroup[0][1];
    const contentTuples = entityGroup.slice(1);

    if (handlers.hasOwnProperty(entityType)) {
      const e = handlers[entityType].process(contentTuples);
      // "POLYLINE" cannot be parsed in isolation, it is followed by
      // N "VERTEX" entities and ended with a "SEQEND" entity.
      // Essentially we convert POLYLINE to LWPOLYLINE - the extra
      // vertex flags are not supported
      if (entityType === 'POLYLINE') {
        currentPolyline = e;
        entities.push(e);
      } else if (entityType === 'VERTEX') {
        if (currentPolyline) {
          currentPolyline.vertices.push(e);
        } else {
          logger.error();
        }
      } else if (entityType === 'SEQEND') {
        currentPolyline = undefined;
      } else {
        // All other entities
        entities.push(e);
      }
    } else {
      logger.warn();
    }
  });
  return entities;
};
