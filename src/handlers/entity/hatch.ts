import common from './common';

export const TYPE = 'HATCH';

enum EKeyField {

  'hatchName' = 2,
  'seedPointX' = 10,
  'seedPointY' = 20,
  'solidFillFlag' = 70, // solid fill = 1; pattern fill = 0
  'associativeFlag' = 71, // Associativity flag (associative = 1; non-associative = 0); for MPolygon, solid-fill flag (has solid fill = 1; lacks solid fill = 0)
  'annotationBoundary'= 73, // (boundary is an annotated boundary = 1; boundary is not an annotated boundary = 0
  'hatchStyle'= 75, // 0 = Hatch “odd parity” area (Normal style), 1 = Hatch outermost area only (Outer style), 2 = Hatch through entire area (Ignore style)
  'boundaryPathsNumber' = 91,
  'degenerateBoundaryPathsNumber' = 99,
  'extrusionX' = 210,
  'extrusionY' = 220,
  'extrusionZ' = 230,
  'boundaryPathType' = 92,
  'edgesNumber' = 93,
  'edgeType' = 72, // 1 = Line; 2 = Circular arc; 3 = Elliptic arc; 4 = Spline // 0 = polyline ???
  'sourceBoundaryObjectNumber' = 97,
}

enum EEdgeType {
  'POLYLINE' = 0,
  'LINE' = 1,
  'ARC' = 2,
  'ELLIPSE' = 3,
  'SPLINE' = 4
}

enum EPolylineCodes {
  'closed' = 73,
  'numberOfVertices' = 93,
  'x' = 10,
  'y' = 20,
  'bulge' = 42 // optional, default = 0
}

enum ELineEdgeCodes {
  'startX' = 10,
  'startY' = 20,
  'endX' = 11,
  'endY' = 21,
  'numberOfVertices' = 93,
  'bulge' = 42 // optional, default = 0
}

enum EArcEdgeCodes {
  'x' = 10,
  'y' = 20,
  'r' = 40,
  'startAngle' = 50,
  'endAngle' = 51,
  'isCounterclockwiseFlag' = 73
}

enum EEllipseEdgeCodes {
  'x' = 10,
  'y' = 20,
  'z' = 30,
  'majorX' = 11,
  'majorY' = 21,
  'axisRatio' = 40,
  'startAngle' = 50,
  'endAngle' = 51,
  'isCounterclockwiseFlag' = 73
}

enum ESplineEdgeCodes {
  'degree' = 94,
  'rational' = 73,
  'periodic' = 74,
  'numberOfKnots' = 95,
  'numberOfControlPoints' = 96,
  'knotValues' = 40,
  'valueX' = 10,
  'valueY' = 20,
  'weights' = 42, // optional; default = 1
  'numberOfFitData' = 97,
  'fitDatumXValue' = 11,
  'fitDatumYValue' = 21,
  'startTangentXValue' = 12,
  'startTangentYValue' = 22,
  'endTangentXValue' = 13,
  'endTangentYValue' = 23
}

/**
 * Construit une polyline avec les informations du hatch
 * @param type le type d'information
 * @param value la valeur de l'information
 * @param vertices tableau des veertices de la ligne
 */
function buildPolyline(type : number, value : any, vertices : Array<{x : number, y : number, bulge? : number}>) {
  if (type === 10) {
    const point = {
      x : value,
      y : 0
    };
    vertices.push(point);
  } else if (type === 20) {
    vertices[vertices.length - 1].y = value;
  } else if (type === 42) {
    vertices[vertices.length - 1].bulge = value;
    return {hasBulge : true};
  } else if (EPolylineCodes.hasOwnProperty(type)) {
    const polyline = {};
    polyline[EPolylineCodes[type]] = value;
    return polyline;
  }
}

/**
 * Construit une line avec les informations du hatch
 * @param type le type d'information
 * @param value la valeur de l'information
 * @param vertices tableau des veertices de la ligne
 */
function buildLine(type : number, value : any, vertices : Array<{x : number, y : number, bulge? : number}>) {
  if (type === 10 || type === 11) {
    const point = {
      x : value,
      y : 0
    };
    vertices.push(point);
  } else if (type === 20 || type === 21) {
    vertices[vertices.length - 1].y = value;
  } else if (type === 42) {
    vertices[vertices.length - 1].bulge = value;
    return {hasBulge : true};
  } else if (ELineEdgeCodes.hasOwnProperty(type)) {
    const polyline = {};
    polyline[ELineEdgeCodes[type]] = value;
    return polyline;
  }
}

/**
 * Construit un arc avec les informations du hatch
 * @param type le type d'information
 * @param value la valeur de l'information
 */
function buildArc(type : number, value : any) {
  if (EArcEdgeCodes.hasOwnProperty(type)) {
    const polyline = {};
    polyline[EArcEdgeCodes[type]] = value;
    return polyline;
  }
}

/**
 * Construit une ellipse avec les informations du hatch
 * @param type le type d'information
 * @param value la valeur de l'information
 */
function buildEllipse(type : number, value : any) {
  if (EEllipseEdgeCodes.hasOwnProperty(type)) {
    const polyline = {};
    polyline[EEllipseEdgeCodes[type]] = value;
    return polyline;
  }
}

/**
 * Construit une spline avec les informations du hatch
 * @param type le type d'information
 * @param value la valeur de l'information
 * @param vertices tableau des veertices de la ligne
 * les spline ne sont pas ignorées par la suite, mais on récupere quand meme les informations
 */
function buildSpline(type : number, value : any, vertices : Array<{x : number, y : number, bulge? : number}>) {
  if (type === 10) {
    const point = {
      x : value,
      y : 0
    };
    vertices.push(point);
  } else if (type === 20) {
    vertices[vertices.length - 1].y = value;
  } else if (ESplineEdgeCodes.hasOwnProperty(type)) {
    const polyline = {};
    polyline[ESplineEdgeCodes[type]] = value;
    return polyline;
  }
}
/**
 * Triate les informations des tuples pour en faire des entités HATCH
 * @param tuples tableau des informations du HATCH
 */
export const process = (tuples : Array<[any, any]>) => {
  // split le tableau sur tous les 72
  // pour chaque stack de lignes
  // finir le dernier en splittant sur 75 => plus de forme apres ca
  let currentShape = null;
  const entity = {};
  let shapeInfo = {};
  let vertices = [];
  const shapesList = [];
  while (tuples.length) {
    // on découpe en morceaux les tuples pour traiter les différentes formes plus facilement
    const splitIndex = tuples.findIndex(tuple => tuple[0] === 72 || tuple[0] === 75);
    if (splitIndex !== -1) {
      const chunk = tuples.splice(0, splitIndex);
      for (let i = 0; i < chunk.length; i++) {
        const type = chunk[i][0];
        const value = chunk[i][1];
        if (currentShape === 0) {
          Object.assign(shapeInfo, buildPolyline(type, value, vertices));
        } else if (currentShape === 1) {
          Object.assign(shapeInfo, buildLine(type, value, vertices));
        } else if (currentShape === 2) {
          Object.assign(shapeInfo, buildArc(type, value));
        } else if (currentShape === 3) {
          Object.assign(shapeInfo, buildEllipse(type, value));
        } else if (currentShape === 4) {
          Object.assign(shapeInfo, buildSpline(type, value, vertices));
        } else if (EKeyField.hasOwnProperty(type)) {
          entity[EKeyField[type]] = value;
        } else {
          Object.assign(entity, common(type, value));
        }
      }
      // ajout des vertices / shapes
      shapeInfo['vertices'] = vertices;
      shapesList.push(shapeInfo);

      //reinit
      shapeInfo = {};
      vertices = [];
      //prepare the next one
      if (tuples[0][0] === 72) {
        currentShape = tuples[0][1];
        shapeInfo['type'] = EEdgeType[currentShape];
      }
      tuples.splice(0, 1);
    } else {
      tuples = [];
    }
  }
  shapesList.shift();
  entity['shapes'] = shapesList;
  entity['type'] = TYPE;
  return entity;
};

export default { TYPE, process };
