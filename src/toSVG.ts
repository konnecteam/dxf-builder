import { Box2 } from 'vecks';

import denormalise from './denormalise';
import entityToPolyline from './entityToPolyline';
import getRGBForEntity from './getRGBForEntity';
import hatchToSVG from './hatchToSVG';
import parsedCustomAttribut from './parsedCustomAttribut';
import logger from './util/logger';
import rgbToColorAttribute from './util/rgbToColorAttribute';
import rotate from './util/rotate';
import { multiplicity, toPiecewiseBezier } from './util/toPiecewiseBezier';
import transformBoundingBoxAndElement from './util/transformBoundingBoxAndElement';

const fillNone = 'fill="none"';

export const addFlipXIfApplicable = (entity, { bbox, element }) => {
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
 * Fonction qui convertit une liste de vertices en valeur utilisable dans un attribut d d'un element html <path>
 * @param vertices liste de vertices à convertir
 */
export function convertVerticesToPath(vertices : number[][]) : string {
  return vertices.reduce((acc, point, i) => {
    acc += (i === 0) ? 'M' : 'L';
    acc += point[0] + ',' + -point[1]; // on inverse Y ici
    return acc;
  }, '');
}

/**
 * Create a <path /> element. Interpolates curved entities.
 */
export const polyline = (entity, needFill = false) => {
  const vertices = entityToPolyline(entity);
  const bbox0 = vertices.reduce((acc, [x, y]) => acc.expandByPoint({ x, y }), new Box2());
  const d = convertVerticesToPath(vertices);
  // Empirically it appears that flipping horzontally does not apply to polyline
  // => si
  const id = parseInt(entity.id, 16);
  // const { bbox, element } = addFlipXIfApplicable(entity, { bbox: bbox0, element: `<path ${entity.layer.toUpperCase() === 'LOCALISATION' ? 'id=' + '"' + id + '"' : ''} d="${d}" />` });
  const { bbox, element } = addFlipXIfApplicable(entity, { bbox: bbox0, element: `<path id="${id}" ${!needFill ? fillNone : ''} ${entity.sortValue ? 'sort=' + '"' + entity.sortValue + '"' : '' } d="${d}" />` });
  return transformBoundingBoxAndElement(bbox, element, entity.transforms);
};

/**
 * Create a <circle /> element for the CIRCLE entity.
 */
export const circle = (entity, needFill = false) => {
  const bbox0 = new Box2()
    .expandByPoint({
      x: entity.x + entity.r,
      y: entity.y + entity.r
    })
    .expandByPoint({
      x: entity.x - entity.r,
      y: entity.y - entity.r
    });
  const id = parseInt(entity.id, 16);
  const element0 = `<circle id="${id}" ${!needFill ? fillNone : ''} cx="${entity.x}" cy="${-entity.y}" r="${entity.r}"/>`; // on inverse 'y' ici
  const { bbox, element } = addFlipXIfApplicable(entity, { bbox: bbox0, element: element0 });
  return transformBoundingBoxAndElement(bbox, element, entity.transforms);
};

/**
 * Create a a <path d="A..." /> or <ellipse /> element for the ARC or ELLIPSE
 * DXF entity (<ellipse /> if start and end point are the same).
 */
export const ellipseOrArc = (cx, cy, rx, ry, startAngle, endAngle, rotationAngle, entityId, entityType, flipX = null, needFill = false ) => {
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
  const id = parseInt(entityId, 16);
  if (entityType === 'ELLIPSE' && (Math.round((startAngle * 180 / Math.PI)) % 360 === Math.round((endAngle * 180 / Math.PI)) % 360)) { // si l'angle de départ et l'angle de fin ne sont pas les mêmes, c'est arc elliptique
    //ellipse
    const element = `<g id="${id}" ${!needFill ? fillNone : ''} transform="scale(1 -1) rotate(${rotationAngle / Math.PI * 180} ${cx} ${cy})">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" />
    </g>`;
    return { bbox, element };
  } else {
    const isEllipse = entityType === 'ELLIPSE';
    // arc ou arc elliptique
    const startOffset = rotate({
      x: Math.cos(startAngle) * rx,
      y: isEllipse ? flipX ? -Math.sin(startAngle) * ry : Math.sin(startAngle) * ry : Math.sin(startAngle) * -ry // on inverse le Y ici
    }, rotationAngle);
    const startPoint = {
      x: cx + startOffset.x,
      y: isEllipse ? cy + startOffset.y : cy - startOffset.y // on inverse le Y ici
    };
    const endOffset = rotate({
      x: Math.cos(endAngle) * rx,
      y: isEllipse ? flipX ? -Math.sin(endAngle) * ry : Math.sin(endAngle) * ry : Math.sin(endAngle) * -ry // on inverse les Y ici
    }, rotationAngle);
    const endPoint = {
      x: cx + endOffset.x,
      y: isEllipse ? cy + endOffset.y : cy - endOffset.y // on inverse les Y ici
    };
    const adjustedEndAngle = endAngle < startAngle
      ? endAngle + Math.PI * 2
      : endAngle;
    const largeArcFlag = adjustedEndAngle - startAngle < Math.PI ? 0 : 1;
    const sweepFlag = flipX ? 1 : 0;
    const d = `M ${isEllipse ? endPoint.x : startPoint.x} ${isEllipse ? endPoint.y : -startPoint.y} A ${rx} ${ry} ${rotationAngle / Math.PI * 180} ${largeArcFlag} ${sweepFlag} ${isEllipse ? startPoint.x : endPoint.x} ${isEllipse ? startPoint.y : -endPoint.y}`;
    // on inverse les Y ici
    const element = `<path ${isEllipse ? `transform="scale(1 -1)"` : ''} id="${id}" d="${d}" ${!needFill ? fillNone : ''}/>`;
    return { bbox, element };
  }
};

/**
 * An ELLIPSE is defined by the major axis, convert to X and Y radius with
 * a rotation angle
 */
export const ellipse = (entity, needFill = false) => {
  const rx = Math.sqrt(entity.majorX * entity.majorX + entity.majorY * entity.majorY);
  const ry = entity.axisRatio * rx;
  const majorAxisRotation = -Math.atan2(-entity.majorY, entity.majorX);
  const { bbox: bbox0, element: element0 } = ellipseOrArc(entity.x, entity.y, rx, ry, entity.startAngle, entity.endAngle, majorAxisRotation, entity.id, entity.type, entity.extrusionZ === -1, needFill);
  return transformBoundingBoxAndElement(bbox0, element0, entity.transforms);
};

/**
 * An ARC is an ellipse with equal radii
 */
export const arc = (entity, needFill = false) => {
  const { bbox: bbox0, element: element0 } = ellipseOrArc(
    entity.x, entity.y,
    entity.r, entity.r,
    entity.startAngle, entity.endAngle,
    0,
    entity.id,
    entity.type,
    entity.extrusionZ === -1,
    needFill);
  return transformBoundingBoxAndElement(bbox0, element0, entity.transforms);
};

export const text = (entity, rgb, styles) => {
  const rotationValue = entity.rotation ? -entity.rotation : 0; // on recupre la rotation
  const styleName = getStyle(entity.styleName, styles);
  const matrices = computeMatrices(entity.transforms);

  let element = '';
  matrices.reverse();
  matrices.forEach(([a, b, c, d, e, f]) => {
    element += `<g transform="matrix(${a} ${b} ${c} ${d} ${e} ${f})">`;
  });
  element += `<g transform="rotate(${rotationValue}, ${entity.x}, ${-entity.y})" >`;
  element += `<text x="${entity.x}" y="${-entity.y}" font-size="${entity.height}" font-family="${styleName}" fill="rgb(${rgb[0]},${rgb[1]},${rgb[2]})">${entity.textValue}</text>`;
  element += `</g>`;
  matrices.forEach(transform => {
    element += '</g>';
  });
  return { bbox : new Box2(), element};
};

export const mtext = (entity, rgb, styles) => {
  const angleRadian = (entity.xAxisY > 0) ? Math.acos(entity.xAxisX) : -Math.acos(entity.xAxisX);
  const angleDegrees = angleRadian * 180 / Math.PI;
  const angleValue = isNaN(angleDegrees) ? 0 : -angleDegrees; // on recupere l'angle de rotation
  const lines = entity.string.split('\\P'); // on split le text en ligne
  const matrices = computeMatrices(entity.transforms);

  let element = '';
  const styleName = getStyle(entity.styleName, styles); // on recupere la police
  matrices.reverse();
  matrices.forEach(([a, b, c, d, e, f]) => {
    element += `<g transform="matrix(${a} ${b} ${c} ${d} ${e} ${f})">`;
  });

  element += `<g transform="rotate(${angleValue}, ${entity.x}, ${-entity.y})">`;
  element += `<text x="${entity.x}" y="${-entity.y}" font-size="${entity.nominalTextHeight}" font-family="${styleName}" fill="rgb(${rgb[0]},${rgb[1]},${rgb[2]})">`; // font-family="${entity.styleName}"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    element += `<tspan x="${entity.x}" dy="${entity.nominalTextHeight * entity.lineSpacingFactor}">${line}</tspan>`;
  }
  element += `</text></g>`;
  matrices.forEach(transform => {
    element += '</g>';
  });
  return { bbox : new Box2(), element};
};

export function computeMatrices(transforms : any[]) {
  return transforms.map(transform => {
    // Create the transformation matrix
    const tx = transform.x || 0;
    const ty = transform.y || 0;
    const sx = transform.scaleX || 1;
    const sy = transform.scaleY || 1;
    const angle = (transform.rotation || 0) / 180 * Math.PI;
    const { cos, sin } = Math;
    let a;
    let b;
    let c;
    let d;
    let e;
    let f;
    if (transform.extrusionZ === -1) {
      a = -sx * cos(angle);
      b = sx * sin(angle);
      c = sy * sin(angle);
      d = sy * cos(angle);
      e = -tx;
      f = ty;
    } else {
      a = sx * cos(angle);
      b = -sx * sin(angle);
      c = sy * sin(angle);
      d = sy * cos(angle);
      e = tx;
      f = -ty;
    }
    return [a, b, c, d, e, f];
  });
}

function getStyle(styleName, styles) : string {
  return styles[styleName] ? styles[styleName].fontFamily : 'ARIAL';
}

export const piecewiseToPaths = (k, knots, controlPoints) => {
  const paths = [];
  let controlPointIndex = 0;
  let knotIndex = k;
  while (knotIndex < knots.length - k + 1) {
    const m = multiplicity(knots, knotIndex);
    const cp = controlPoints.slice(controlPointIndex, controlPointIndex + k);
    if (k === 4) {
      paths.push(`<path d="M ${cp[0].x} ${-cp[0].y} C ${cp[1].x} ${-cp[1].y} ${cp[2].x} ${-cp[2].y} ${cp[3].x} ${-cp[3].y}" />`); // on inverse les Y ici
    } else if (k === 3) {
      paths.push(`<path d="M ${cp[0].x} ${-cp[0].y} Q ${cp[1].x} ${-cp[1].y} ${cp[2].x} ${-cp[2].y}" />`); // on inverse les Y ici
    }
    controlPointIndex += m;
    knotIndex += m;
  }
  return paths;
};

const bezier = (entity, needFill = false) => {
  let bbox = new Box2();
  entity.controlPoints.forEach(p => {
    bbox = bbox.expandByPoint(p);
  });
  const k = entity.degree + 1;
  const piecewise = toPiecewiseBezier(k, entity.controlPoints, entity.knots);
  const paths = piecewiseToPaths(k, piecewise.knots, piecewise.controlPoints);
  const element = `<g ${!needFill ? fillNone : ''}>${paths.join('')}</g>`;
  return transformBoundingBoxAndElement(bbox, element, entity.transforms);
};

/**
 * Dessine l'entité dimension
 * @param entity l'entié dimension
 * @param dimTextHeight taille du texte
 */
function dimension(entity, dimTextHeight : string, dimArrowSize : string, drawingUnit : string, dimAngleUnit : string) {
  let vertices = [];
  let bbox = new Box2();
  let path = '';
  let displayValue : string = null;
  if (entity.dimensionType === 0) { // => 0 = Rotated, horizontal, or vertical;
    const translationVector = {
      x : entity.textMidpoint.x - entity.start.x,
      y : entity.textMidpoint.y - entity.start.y
    };
    const point1 = {x : entity.start.x , y : -entity.start.y};
    const point2 = {x : entity.textMidpoint.x + translationVector.x, y : -(entity.textMidpoint.y + translationVector.y)};
    const extrem1 = dimensionDelimiterPoints(point1, point2, dimArrowSize);
    const extrem2 = dimensionDelimiterPoints(point2, point1, dimArrowSize);
    vertices = [
      [extrem1.intersect1.x, extrem1.intersect1.y], [extrem1.intersect2.x, extrem1.intersect2.y],
      [entity.start.x, entity.start.y],
      [entity.textMidpoint.x + translationVector.x, entity.textMidpoint.y + translationVector.y],
      [extrem2.intersect1.x, extrem2.intersect1.y], [extrem2.intersect2.x, extrem2.intersect2.y],
    ];
    displayValue = `${Math.round(entity.actualMeasurement * 100) / 100}${drawingUnit}`;
    path = `<path d="${convertVerticesToPath(vertices)}"></path>`;
    bbox = vertices.reduce((acc, [x, y]) => acc.expandByPoint({ x, y }), new Box2());
  } else if (entity.dimensionType === 1) { // => 1 = Aligned
    const midPoint = {
      x : (entity.measureStart.x + entity.measureEnd.x) / 2,
      y : (entity.measureStart.y + entity.measureEnd.y) / 2,
    };
    const translationVector = {
      x : entity.textMidpoint.x - midPoint.x,
      y : entity.textMidpoint.y - midPoint.y
    };
    const point1 = {x : entity.measureStart.x + translationVector.x, y : -(entity.measureStart.y + translationVector.y)};
    const point2 = {x : entity.measureEnd.x + translationVector.x, y : -(entity.measureEnd.y + translationVector.y)};

    const extrem1 = dimensionDelimiterPoints(point1, point2, dimArrowSize);
    const extrem2 = dimensionDelimiterPoints(point2, point1, dimArrowSize);

    // on applique la translation sur les points
    vertices = [
      [extrem1.intersect1.x, extrem1.intersect1.y], [extrem1.intersect2.x, extrem1.intersect2.y],
      [entity.measureStart.x + translationVector.x, entity.measureStart.y + translationVector.y],
      [entity.measureEnd.x + translationVector.x, entity.measureEnd.y + translationVector.y],
      [extrem2.intersect1.x, extrem2.intersect1.y], [extrem2.intersect2.x, extrem2.intersect2.y],
    ];

    displayValue = `${Math.round(entity.actualMeasurement * 100) / 100}${drawingUnit}`;
    path = `<path d="${convertVerticesToPath(vertices)}"></path>`;
    bbox = vertices.reduce((acc, [x, y]) => acc.expandByPoint({ x, y }), new Box2());
  } else if (entity.dimensionType === 2) { // 2 = Angular
    // on affiche l'angle en degrés
    displayValue = computeDimAngleValue(parseFloat(entity.actualMeasurement), parseInt(dimAngleUnit, 10));

    const radius = Math.hypot(entity.dimensionArc.x - entity.start.x, entity.dimensionArc.y - entity.start.y);

    // on trouve les points d'intersection entre les segments et l'arc
    const firstIntersectionPoint = segmentAndCircleIntersection(entity.measureStart, entity.measureEnd, entity.measureStart, radius);
    const secondIntersectionPoint = segmentAndCircleIntersection(entity.start, entity.firstPointOnArc, entity.start, radius);

    // on trouve dans quel sens dessiner l'arc
    let sweepFlag = 0;
    if ((entity.measureEnd.x <= entity.start.x && entity.firstPointOnArc.x <= entity.start.x) ||
      (entity.measureEnd.y <= entity.start.y && entity.firstPointOnArc.y <= entity.start.y)) {
      sweepFlag = 0;
    } else {
      sweepFlag = 1;
    }
    path = `<path d="M ${secondIntersectionPoint.intersect2.x} ${secondIntersectionPoint.intersect2.y} A ${radius}, ${radius}, ${entity.actualMeasurement} 0 ${sweepFlag} ${firstIntersectionPoint.intersect2.x} ${firstIntersectionPoint.intersect2.y}"/>`;

  } else if (entity.dimensionType === 3 || entity.dimensionType === 4) { // 3 = Diameter Ø, 4 = Radius R
    const indicator = entity.dimensionType === 3 ? 'Ø' : 'R';
    displayValue = `${indicator}${Math.round(entity.actualMeasurement * 100) / 100}${drawingUnit}`;
    vertices = [
      [entity.start.x, entity.start.y],
      [entity.firstPointOnArc.x, entity.firstPointOnArc.y],
    ];
    path = `<path d="${convertVerticesToPath(vertices)}"></path>`;
    bbox = vertices.reduce((acc, [x, y]) => acc.expandByPoint({ x, y }), new Box2());
  } else {
    return {element : '', bbox : new Box2()};
  }

  const id = parseInt(entity.id, 16);

  let element = `<g id=${id} type="dimension" ${fillNone}>`;
  element += `<text x="${entity.textMidpoint.x}" y="${-entity.textMidpoint.y + (parseFloat(dimTextHeight) / 2)}" font-size="${dimTextHeight}">${displayValue}</text>`;
  element += path;
  element += `</g>`;
  return {element, bbox};
}

/**
 * Définit les délimiteurs des segments de dimensions
 * @param point1 1ere extremité du segment
 * @param point2 2nd extrémité du segment
 * @param dimArrowSize taille des délimiteurs
 */
function dimensionDelimiterPoints(point1 : {x : number, y : number}, point2 : {x : number, y : number}, dimArrowSize : string) {
  //coordonnées de la droite d'origine [point1, point2] => y = slope * x + gap
  const slope = (point2.y - point1.y) / (point2.x - point1.x);
  const gap = -(slope * point1.x) + point1.y;
  //coordonnées de la droite perpendiculaire => y = -1/slope + gapOrth
  const slopeOrth = -1 / slope;
  const gapOrthPoint1 = -(slopeOrth * point1.x) + point1.y;
  // on trouve un point random sur la droite perpendiculaire
  let rdmPoint1 : {x : number, y : number} = null;
  if (slopeOrth !== Infinity && slopeOrth !== -Infinity) {
    rdmPoint1 = {x : 0, y : gapOrthPoint1};
  } else {
    rdmPoint1 = {x : point1.x, y : 0 };
  }
  // on retourne les intersections entre la droite perpendiculaire et le cercle de centre point1 et de rayon dimArrowSize
  return segmentAndCircleIntersection(point1, rdmPoint1, point1, parseFloat(dimArrowSize));
}

/**
 * retourne les points d'intersection entre le cercle défini par son rayon radius etson centre cneterPoint et le segment [pointA, pointB]
 * @param pointA 1er point du segment
 * @param pointB 2nd point du segment
 * @param centerPoint le centre du cercle
 * @param radius le rayon du cercle
 */
function segmentAndCircleIntersection(pointA : {x : number, y : number},
  pointB : {x : number, y : number},
  centerPoint : {x : number, y : number},
  radius : number)
  : {intersect1 : {x : number, y : number}, intersect2 : {x : number, y : number}} {
  const ax = pointA.x;
  const ay = -pointA.y;
  const bx = pointB.x;
  const by = -pointB.y;
  const cx = centerPoint.x;
  const cy = -centerPoint.y;
  // compute the euclidean distance between A and B
  const distAB = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));

  // compute the direction vector D from A to B
  const dx = (bx - ax) / distAB;
  const dy = (by - ay) / distAB;

  // Now the line equation is x = Dx*t + Ax, y = Dy*t + Ay with 0 <= t <= 1.

  // compute the value t of the closest point to the circle center (Cx, Cy)
  const t = dx * (cx - ax) + dy * (cy - ay);

  // This is the projection of C on the line from A to B.

  // compute the coordinates of the point E on line and closest to C
  const ex = t * dx + ax;
  const ey = t * dy + ay;

  // compute the euclidean distance from E to C
  const distEC = Math.sqrt((ex - cx) * (ex - cx) + (ey - cy) * (ey - cy));

  // test if the line intersects the circle
  if ( distEC < radius ) {
      // compute distance from t to circle intersection point
    const dt = Math.sqrt((radius * radius) - distEC * distEC);

    // compute first intersection point
    const intersect1 = {
      x : (t - dt ) * dx + ax,
      y : (t - dt) * dy + ay,
    };

    // compute second intersection point
    const intersect2 = {
      x : (t + dt) * dx + ax,
      y : (t + dt) * dy + ay
    };
    return {intersect1, intersect2};
  } else {
    return null;
  }
}

/**
 * Calcule l'angle dans la bonne unité
 * @param measurement mesure de l'angle
 * @param dimAngleUnit l'unité dans laquelle le transformer : 0 = Degrees; 1 = Degrees/minutes/seconds; 2 = Gradians; 3 = Radians
 */
function computeDimAngleValue(measurement : number, dimAngleUnit : number) : string {
  // 0 = Decimal degrees
  if (dimAngleUnit === 0) {
    return `${Math.round((measurement * 180 / Math.PI) * 100) / 100}°`;
  } else if (dimAngleUnit === 1) {
    // 1 = Degrees/minutes/seconds;
    const fullDegrees = measurement * 180 / Math.PI;
    const degrees = Math.floor(fullDegrees);
    const fullMinutes = (fullDegrees % 1) * 60;
    const minutes = Math.floor(fullMinutes);
    const seconds = Math.floor((fullMinutes % 1) * 60);
    return `${degrees}° ${minutes}' ${seconds}"`;
  } else if (dimAngleUnit === 2) {
    // 2 = Gradians, g = radian * 200/Pi
    return `${Math.round((measurement * 200 / Math.PI) * 100) / 100}g`;
  } else { // 3 = Radians; par default, measurement est en radian
    return `${Math.round(measurement * 100) / 100}rad`;
  }
}

/**
 * Switch the appropriate function on entity type. CIRCLE, ARC and ELLIPSE
 * produce native SVG elements, the rest produce interpolated polylines.
 */
const entityToBoundsAndElement = (entity, options : {needFill : boolean, rgb? : number[], styles? : any, dimTextHeight? : string, dimArrowSize? : string, drawingUnit? : string, dimAngleUnit? : string} = {needFill : false}) => {
  switch (entity.type) {
    case 'CIRCLE':
      return circle(entity, options.needFill);
    case 'ELLIPSE':
      return ellipse(entity, options.needFill);
    case 'ARC':
      return arc(entity, options.needFill);
    case 'SPLINE': {
      const hasWeights = entity.weights && entity.weights.some(w => w !== 1);
      if (((entity.degree === 2) || (entity.degree === 3)) && !hasWeights) {
        try {
          return bezier(entity, options.needFill);
        } catch (err) {
          return polyline(entity, options.needFill);
        }
      } else {
        return polyline(entity, options.needFill);
      }
    }
    case 'LINE':
    case 'LWPOLYLINE':
    case 'POLYLINE': {
      return polyline(entity, options.needFill);
    }
    case 'TEXT':
      return text(entity, options.rgb, options.styles);
    case 'MTEXT' : {
      return mtext(entity, options.rgb, options.styles);
    }
    case 'HATCH' : {
      return hatchToSVG(entity, options.rgb);
    }
    case 'DIMENSION' : {
      return dimension(entity, options.dimTextHeight, options.dimArrowSize, options.drawingUnit, options.dimAngleUnit);
    }
    default:
      logger.warn();
      return null;
  }
};

const shouldFillEntity = (entity, list) => {
  return list.includes(entity.id);
};

/**
 * On ajoute les layers autour des blocks
 */
const _displayLayers = (elements, ignoringLayers : string[] = []) => {
  let keys = Object.keys(elements);
  keys = keys.sort();
  let returnValue = '';
  keys.forEach(key => {
    // on ne traite pas les layers à ignorer
    if (!ignoringLayers.includes(key)) {
      returnValue += `<g id="${key}">${_displayBlocks(elements[key])}</g>`;
    }
  });
  return (returnValue);
};
/**
 * On ajoute les noms des blocks autour des entités
 */
const _displayBlocks = elements => {
  const keys = Object.keys(elements);
  let returnValue = '';
  keys.forEach(key => {
    if ( key !== 'noBlock') {
      returnValue += `<g id="${key}">${elements[key].join(' ')}</g>`;
    } else {
      returnValue += elements['noBlock'].join(' ');
    }
  });
  return (returnValue);
};

const _displayScript = (parsed, groups, ignoringLayers) => {
  const listOfLayers = [];
  for (const layer in groups) {
    if (layer && !ignoringLayers.includes(layer)) {
      let visible = 0;
      if (parsed.tables.layers[layer] && (!parsed.tables.layers[layer].visible || parsed.tables.layers[layer].visible === 0)) {
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

export default (parsed, groups, ignoringLayers : string[] = [], ignoreBaseLayer : boolean = true) => {

  const entities = denormalise(parsed);
  const localisations = parsedCustomAttribut(parsed.entities, entities).localisationEntities;
  const localisationsId = Object.keys(localisations);
  const listOfPolylines = [];
  for ( const i in localisations) {
    if (localisations[i]) {
      const localisation = localisations[i];
      if (localisation['HANDLES'] && localisation['HANDLES'] !== '') {
        listOfPolylines.push(localisation['HANDLES'].toUpperCase());
      } else if (localisation.polyline && localisation.polyline.id && localisation.polyline !== -1) {
        listOfPolylines.push(localisation.polyline.id);
      }
    }
  }

  const view = entities.reduce((acc, entity, i) => {
    const rgb = getRGBForEntity(parsed.tables.layers, entity);
    const fill = shouldFillEntity(entity, listOfPolylines);
    const isText = entity.type === 'MTEXT' || entity.type === 'TEXT';
    const options = {
      needFill : fill,
      rgb,
      styles : parsed.tables.styles,
      dimTextHeight : parsed.header.dimTextHeight,
      dimArrowSize : parsed.header.dimArrowSize,
      drawingUnit : parsed.header.drawingUnit,
      dimAngleUnit : parsed.header.dimAngleUnit,
    };
    // on check si ce n'est pas le text du bloc de localisation
    if (!isText || !localisationsId.includes(entity.blockId)) {
      // const boundsAndElement = entityToBoundsAndElement(entity, fill, rgb, parsed.tables.styles);
      const boundsAndElement = entityToBoundsAndElement(entity, options);
      if (boundsAndElement && boundsAndElement.bbox && boundsAndElement.bbox.min && boundsAndElement.bbox.max
        && (!isNaN(boundsAndElement.bbox.min.x)) && (!isNaN(boundsAndElement.bbox.min.y))
        && (!isNaN(boundsAndElement.bbox.max.x)) && (!isNaN(boundsAndElement.bbox.max.y))) {
        const { bbox, element } = boundsAndElement;
        if (!(Math.abs(bbox.min.x) === Infinity || Math.abs(bbox.min.y) === Infinity ||
        Math.abs(bbox.max.x) === Infinity || Math.abs(bbox.max.y) === Infinity)) {
          if ((entity.layer !== '0' || !ignoreBaseLayer) && (entity.type !== 'MTEXT' && entity.type !== 'TEXT' )) {
            // on ignore les texts car on ne peut pas savoir la taille réelle de leur bbox à ce moment là
            acc.bbox.expandByPoint(bbox.min);
            acc.bbox.expandByPoint(bbox.max);
          }
        }
        if (!acc.elements[entity.layer]) {
          acc.elements[entity.layer] = {};
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
    }
    return acc;
  }, {
    bbox: new Box2(),
    elements: []
  });

  const viewBox = (view.bbox.min.x === Infinity || view.bbox.min.y === Infinity)
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
  let svg = `<?xml version="1.0"?>
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
        ${_displayLayers(view.elements, ignoringLayers)}

      </g>
    </g>

    <script type="text/ecmascript"><![CDATA[var jsonInfoPlan = ${_displayScript(parsed, groups, ignoringLayers)};]]></script>
  </svg>`;
  // on rajoute dans les hatch le rectangle qui permet de voir les mask
  const regexMask = /maskReplacement/gm;
  const backgroundMask = `<rect x="${viewBox.x}" y="${viewBox.y}" width="${viewBox.width}" height="${viewBox.height}" fill="white"/>`;
  svg = svg.replace(regexMask, backgroundMask);
  return svg;
};
