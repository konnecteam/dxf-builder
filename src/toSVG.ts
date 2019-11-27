import { pd } from 'pretty-data';
import { Box2 } from 'vecks';

import denormalise from './denormalise';
import entityToPolyline from './entityToPolyline';
import getRGBForEntity from './getRGBForEntity';
import transformBoundingBoxAndElement from './transformBoundingBoxAndElement';
import logger from './util/logger';
import rgbToColorAttribute from './util/rgbToColorAttribute';
import rotate from './util/rotate';
import toPiecewiseBezier from './util/toPiecewiseBezier';

const addFlipXIfApplicable = (entity, { bbox, element }) => {
  if (entity.extrusionZ === -1) {
    return {
      bbox: new Box2()
        .expandByPoint({ x: -bbox.min.x, y: bbox.min.y })
        .expandByPoint({ x: -bbox.max.x, y: bbox.max.y }),
      element: `<g transform="matrix(-1 0 0 1 0 0)">
        ${element}
      </g>`
    };
  } else {
    return { bbox, element };
  }
};

/**
 * Create a <path /> element. Interpolates curved entities.
 */
const polyline = entity => {
  const vertices = entityToPolyline(entity);
  const bbox0 = vertices.reduce((acc, [x, y]) => acc.expandByPoint({ x, y }), new Box2());
  const d = vertices.reduce((acc, point, i) => {
    acc += (i === 0) ? 'M' : 'L';
    acc += point[0] + ',' + -point[1]; // on inverse Y ici
    return acc;
  }, '');
  // Empirically it appears that flipping horzontally does not apply to polyline
  // => si
  const id = parseInt(entity.id, 16);
  const { bbox, element } = addFlipXIfApplicable(entity, { bbox: bbox0, element: `<path ${entity.layer.toUpperCase() === 'LOCALISATION' ? 'id=' + '"' + id + '"' : ''} d="${d}" />` });
  return transformBoundingBoxAndElement(bbox, element, entity.transforms);
};

/**
 * Create a <circle /> element for the CIRCLE entity.
 */
const circle = entity => {
  const bbox0 = new Box2()
    .expandByPoint({
      x: entity.x + entity.r,
      y: entity.y + entity.r
    })
    .expandByPoint({
      x: entity.x - entity.r,
      y: entity.y - entity.r
    });
  const element0 = `<circle cx="${entity.x}" cy="${-entity.y}" r="${entity.r}" />`; // on inverse 'y' ici
  const { bbox, element } = addFlipXIfApplicable(entity, { bbox: bbox0, element: element0 });
  return transformBoundingBoxAndElement(bbox, element, entity.transforms);
};

/**
 * Create a a <path d="A..." /> or <ellipse /> element for the ARC or ELLIPSE
 * DXF entity (<ellipse /> if start and end point are the same).
 */
const ellipseOrArc = (cx, cy, rx, ry, startAngle, endAngle, rotationAngle, flipX = null) => {
  const bbox = [
    { x: rx, y: ry },
    { x: rx, y: ry },
    { x: -rx, y: -ry },
    { x: -rx, y: ry },
  ].reduce((acc, p) => {
    const rotated = rotate(p, rotationAngle);
    acc.expandByPoint({
      x: cx + rotated.x,
      y: cy + rotated.y
    });
    return acc;
  }, new Box2());
  if ((Math.abs(startAngle - endAngle) < 1e-9) || (Math.abs(startAngle - endAngle + Math.PI * 2) < 1e-9)) {
    // Use a native <ellipse> when start and end angles are the same, and
    // arc paths with same start and end points don't render (at least on Safari)
    const element = `<g transform="rotate(${rotationAngle / Math.PI * 180} ${cx}, ${-cy})">
      <ellipse cx="${cx}" cy="${-cy}" rx="${rx}" ry="${ry}" />
    </g>`; // on inverse le Y ici
    return { bbox, element };
  } else {
    const startOffset = rotate({
      x: Math.cos(startAngle) * rx,
      y: Math.sin(startAngle) * -ry // on inverse le Y ici
    }, rotationAngle);
    const startPoint = {
      x: cx + startOffset.x,
      y: cy - startOffset.y // on inverse le Y ici
    };
    const endOffset = rotate({
      x: Math.cos(endAngle) * rx,
      y: Math.sin(endAngle) * -ry // on inverse les Y ici
    }, rotationAngle);
    const endPoint = {
      x: cx + endOffset.x,
      y: cy - endOffset.y // on inverse les Y ici
    };
    const adjustedEndAngle = endAngle < startAngle
      ? endAngle + Math.PI * 2
      : endAngle;
    const largeArcFlag = adjustedEndAngle - startAngle < Math.PI ? 0 : 1;
    const d = `M ${startPoint.x} ${-startPoint.y} A ${rx} ${ry} ${rotationAngle / Math.PI * 180} ${largeArcFlag} 0 ${endPoint.x} ${-endPoint.y}`; // on inverse les Y ici
    const element = `<path d="${d}" />`;
    return { bbox, element };
  }
};

/**
 * An ELLIPSE is defined by the major axis, convert to X and Y radius with
 * a rotation angle
 */
const ellipse = entity => {
  const rx = Math.sqrt(entity.majorX * entity.majorX + entity.majorY * entity.majorY);
  const ry = entity.axisRatio * rx;
  const majorAxisRotation = -Math.atan2(-entity.majorY, entity.majorX);
  const { bbox: bbox0, element: element0 } = ellipseOrArc(entity.x, entity.y, rx, ry, entity.startAngle, entity.endAngle, majorAxisRotation);
  const { bbox, element } = addFlipXIfApplicable(entity, { bbox: bbox0, element: element0 });
  return transformBoundingBoxAndElement(bbox, element, entity.transforms);
};

/**
 * An ARC is an ellipse with equal radii
 */
const arc = entity => {
  const { bbox: bbox0, element: element0 } = ellipseOrArc(
    entity.x, entity.y,
    entity.r, entity.r,
    entity.startAngle, entity.endAngle,
    0,
    entity.extrusionZ === -1);
  const { bbox, element } = addFlipXIfApplicable(entity, { bbox: bbox0, element: element0 });
  return transformBoundingBoxAndElement(bbox, element, entity.transforms);
};

export const piecewiseToPaths = (k, controlPoints) => {
  const nSegments = (controlPoints.length - 1) / (k - 1);
  const paths = [];
  for (let i = 0; i < nSegments; ++i) {
    const cp = controlPoints.slice(i * (k - 1));
    if (k === 4) {
      paths.push(`<path d="M ${cp[0].x} ${-cp[0].y} C ${cp[1].x} ${-cp[1].y} ${cp[2].x} ${-cp[2].y} ${cp[3].x} ${-cp[3].y}" />`); // on inverse les Y ici
    } else if (k === 3) {
      paths.push(`<path d="M ${cp[0].x} ${-cp[0].y} Q ${cp[1].x} ${-cp[1].y} ${cp[2].x} ${-cp[2].y}" />`); // on inverse les Y ici
    }
  }
  return paths;
};

const bezier = entity => {
  let bbox = new Box2();
  entity.controlPoints.forEach(p => {
    bbox = bbox.expandByPoint(p);
  });
  const k = entity.degree + 1;
  const piecewise = toPiecewiseBezier(k, entity.controlPoints, entity.knots);
  const paths = piecewiseToPaths(k, piecewise.controlPoints);
  const element = `<g>${paths.join('')}</g>`;
  return transformBoundingBoxAndElement(bbox, element, entity.transforms);
};

/**
 * Switch the appropriate function on entity type. CIRCLE, ARC and ELLIPSE
 * produce native SVG elements, the rest produce interpolated polylines.
 */
const entityToBoundsAndElement = entity => {
  switch (entity.type) {
    case 'CIRCLE':
      return circle(entity);
    case 'ELLIPSE':
      return ellipse(entity);
    case 'ARC':
      return arc(entity);
    case 'SPLINE': {
      if ((entity.degree === 2) || (entity.degree === 3)) {
        try {
          return bezier(entity);
        } catch (err) {
          return polyline(entity);
        }
      } else {
        return polyline(entity);
      }
    }
    case 'LINE':
    case 'LWPOLYLINE':
    case 'POLYLINE': {
      return polyline(entity);
    }
    // case 'MTEXT' : {
    //   return mtext(entity)
    // }
    // case 'ATTRIB' : {
    //   return attrib(entity)
    // }
    default:
      logger.warn();
      return null;
  }
};

/**
 * On ajoute les layers autour des blocks
 */
const _displayLayers = elements => {
  let keys = Object.keys(elements);
  keys = keys.sort();
  // on met loca en premier pour pouvoir voir les autres layers sur le plan
  const locaIndex = keys.findIndex( k => {
    return k.toUpperCase() === 'LOCALISATION';
  });
  if (locaIndex > -1) {
    const locaLayer = keys.splice( locaIndex, 1);
    keys = locaLayer.concat(keys);
  }
  let returnValue = '';
  keys.forEach(key => {
    returnValue += `<g id="${key}" ${key.toUpperCase() === 'LOCALISATION' ? '' : 'fill="none"'}>
    ${_displayBlocks(elements[key])}
</g>\n`;
  });
  return pd.xml(returnValue);
};
/**
 * On ajoute les noms des blocks autour des entités
 */
const _displayBlocks = elements => {
  const keys = Object.keys(elements);
  let returnValue = '';
  keys.forEach(key => { //class="draggable" fill="transparent"
    if ( key !== 'noBlock') {
      returnValue += `<g id="${key}" pv-block="_draggable">
      <!--Autodesk.AutoCAD.DatabaseServices.BlockReference-->
      ${elements[key].join('\n')}
      </g>\n`;
    } else {
      returnValue += elements['noBlock'].join('\n');
    }
  });
  return pd.xml(returnValue);
};

const _displayScript = parsed => {
  const listOfLayers = [];
  for (const layer in parsed.tables.layers) {
    if (layer) {
      let visible = 0;
      if (!parsed.tables.layers[layer].visible || parsed.tables.layers[layer].visible === 0) {
        visible = 1;
      }
      listOfLayers.push(
        {
          name : parsed.tables.layers[layer].name,
          description : parsed.tables.layers[layer].description ? parsed.tables.layers[layer].description : parsed.tables.layers[layer].name,
          visible
        }
      );
    }
  }
  const svgInfos = {
    name : parsed.header.name,
    author : parsed.header.author,
    comments : parsed.header.comments,
    lastSavedBy : parsed.header.lastSavedBy,
    revisionNumber : parsed.header.revisionNumber,
    subject : parsed.header.subject,
    title : parsed.header.title,
    creationDate : parsed.header.creationDate,
    updateDate : parsed.header.updateDate,
    validationDate : parsed.header.validationDate,
    lastOperator : parsed.header.lastOperator,
    longitude : parsed.header.longitude,
    latitude : parsed.header.latitude,
    drawingUnit : parsed.header.drawingUnit,
  };
  //'insertListOfCtc'
  //'insertListOfDos'
  const info = Object.assign({}, {info : Object.assign({}, svgInfos, {listOfLayers})}, {listOfCtc : []}, {listOfDos : []}, {listOfLoc : 'insertListOfLoc'});
  parsed.jsonInfo = info;
  return JSON.stringify(info);
};

export default parsed => {

  const entities = denormalise(parsed);
  const view = entities.reduce((acc, entity, i) => {
    const rgb = getRGBForEntity(parsed.tables.layers, entity);
    const boundsAndElement = entityToBoundsAndElement(entity);
    if (boundsAndElement) {
      const { bbox, element } = boundsAndElement;
      if ( entity.layer !== '0') {
        acc.bbox.expandByPoint(bbox.min);
        acc.bbox.expandByPoint(bbox.max);
      }
      if (!acc.elements[entity.layer]) {
        acc.elements[entity.layer] = [];
        acc.elements[entity.layer]['noBlock'] = [];
      }
      if (entity.blockId) {
        if (!acc.elements[entity.layer][entity.blockId]) {
          acc.elements[entity.layer][entity.blockId] = [];
        }
        acc.elements[entity.layer][entity.blockId].push(`<g stroke="${rgbToColorAttribute(rgb)}">${element}</g>`);
      } else {
        acc.elements[entity.layer]['noBlock'].push(`<g stroke="${rgbToColorAttribute(rgb)}">${element}</g>`);
      }
    }
    return acc;
  }, {
    bbox: new Box2(),
    elements: []
  });

  const viewBox = view.bbox.min.x === Infinity
    ? {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    }
    : {
      x: view.bbox.min.x,
      y: -view.bbox.max.y,
      width: view.bbox.max.x - view.bbox.min.x,
      height: view.bbox.max.y - view.bbox.min.y
    };
  return `<?xml version="1.0"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1"
  viewBox="${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}"
  width="100%" height="100%"
>
  <defs>
    <style id="svgcss" />
  </defs>
  <g id="_kimplan_plan_">
    <g stroke="#000000" stroke-width="0.1%">
      ${_displayLayers(view.elements)}

    </g>
  </g>

  <script type="text/ecmascript"><![CDATA[var jsonInfoPlan = ${_displayScript(parsed)};]]></script>
</svg>`;
};
