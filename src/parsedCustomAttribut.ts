export default (entities, denormalisedEntities) => {
  const reduceEntities = entities.reduce((acc, entity) => {
    if (entity.objvalId) {
      const customAttribut = entity.objvalId;
      if (!acc[customAttribut]) {
        acc[customAttribut] = {};
        acc[customAttribut]['objvalId'] = customAttribut;
        acc[customAttribut]['coordinate'] = [];
      }
      if (!acc[customAttribut]['blockName']) {
        acc[customAttribut]['blockName'] = entity.block;
      }
      const point = {x : entity.x, y : entity.y};
      acc[customAttribut]['coordinate'].push(point);
      acc[customAttribut][entity.key] = entity.value;
    }
    return acc;
  }, {});

  const insertEntities = entities.filter(e => e.type === 'INSERT');

  // trouve les blockName de chaque entité
  for (const reduceEntityIndex in reduceEntities) {
    if (reduceEntityIndex) {
      // le blockName est le block de l'entité INSERT qui a le blockId == au objvalId des entités attrib
      reduceEntities[reduceEntityIndex].blockName = insertEntities.find(ie => {
        return ie.blockId === reduceEntities[reduceEntityIndex].objvalId;
      }).block;
    }
  }

  // trouve les polylines autour de chaque entité
  const polylines = denormalisedEntities.filter(denormalisedEntity => {
    return ((denormalisedEntity.type === 'LWPOLYLINE' || denormalisedEntity.type === 'POLYLINE')
      && denormalisedEntity.id && denormalisedEntity.layer.toUpperCase() === 'LOCALISATION'
      && denormalisedEntity.closed);
  });

  for (const i in reduceEntities) {
    if (reduceEntities[i].blockName === 'INFO_LOCAL') {
      // on regarde les polylines qui entoure l'entité courante
      const polylinesInside = polylines.filter(polyline => {
        return inside(reduceEntities[i].coordinate[0], polyline.vertices);
      });

      if (polylinesInside && polylinesInside.length > 0) {
        // on cacule le perimeter de chacune
        polylinesInside.forEach( p => {
          p.perimeter = perimeter(p.vertices);
        });

        // celle qui a le plus petit perimeter est celle que nous voulons
        reduceEntities[i].polyline = polylinesInside.reduce((prev, curr) => {
          return prev.perimeter < curr.perimeter ? prev : curr;
        });
      } else {
        // on est sur l'étage ? On prend un truc random ?
        reduceEntities[i].polyline = polylines[0];
      }
      // si on a une polyline qui entoure l'entité
      if (reduceEntities[i].polyline) {
        // on ajoute la surface et le perimetre
        reduceEntities[i].polyline.perimeter = perimeter(reduceEntities[i].polyline.vertices);
        reduceEntities[i].polyline.surface = surface(reduceEntities[i].polyline.vertices);

        //pour debuggue
        reduceEntities[i].polyline.svg = arrayToSvgLine(reduceEntities[i].polyline.vertices);
      }
    }
  }
  return reduceEntities;
};


/**
 * return si le point est dans la polyline
 * @param point : {x: number, y: number}
 * @param polyline : {x: number, y: number}[]
 */
function inside(point, polyline) {

  const x = point.x;
  const y = point.y;

  let isInside = false;
  for (let i = 0, j = polyline.length - 1; i < polyline.length; j = i++) {
    const xi = polyline[i].x;
    const yi = polyline[i].y;
    const xj = polyline[j].x;
    const yj = polyline[j].y;

    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) {
      isInside = !isInside;
    }
  }
  return isInside;
}


function arrayToSvgLine(array) {
  return 'M' + array.map(e => {
    return `${e.x},${e.y}`;
  }).join('L');
}

/**
 * return la surface dans la polyline donnée : number
 * @param {x : number, y : number}[] vertices  : les coordonnées des sommets de la polylines
 */
function surface(vertices) {
  let sum1 = 0;
  let sum2 = 0;
  vertices.forEach((vertice, i) => {
    if ( i === vertices.length - 1) {
      sum1 += vertice.x * vertices[0].y;
      sum2 += vertice.y * vertices[0].x;
    } else {
      sum1 += vertice.x * vertices[i + 1].y;
      sum2 += vertice.y * vertices[i + 1].x;
    }
  });
  return  Math.abs((sum1 - sum2) / 2);
}

/**
 * return le périmètre dans la polyline donnée : number
 * @param {x : number, y : number}[] vertices  : les coordonnées des sommets de la polylines
 */
function perimeter(vertices) {
  let perim = 0;
  vertices.forEach((vertice, i) => {
    if (i === vertices.length - 1) {
      perim += distanceBetweenPoints(vertice, vertices[0]);
    } else {
      perim += distanceBetweenPoints(vertice, vertices[i + 1]);
    }
  });
  return perim;
}

/**
 * return la distance entre 2 points
 * @param {x : number, y : number} point1
 * @param {x : number, y : number} point2
 */
function distanceBetweenPoints(point1, point2) {
  return Math.hypot(point2.x - point1.x, point2.y - point1.y);
}
