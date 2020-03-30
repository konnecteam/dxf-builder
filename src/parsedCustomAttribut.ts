import entityToPolyline from './entityToPolyline';

export default (entities, denormalisedEntities) => {

  // on récupère et reconstruit les entités avec les attributs qui leur sont liés
  const entitiesWithAttributs = entities.reduce((acc, entity) => {
    if (entity.type) {
      const id = entity.type === 'INSERT' ? entity.blockId : entity.type === 'ATTRIB' ? entity.objvalId : null;
      if (id && !acc[id]) {
        acc[id] = {
          objvalId : id,
        };
      }
      if (entity.type === 'INSERT') {
        acc[id]['blockName'] = entity.block;
        acc[id]['layer'] = entity.layer;
        acc[id]['insertCoord'] = {x : entity.x, y : entity.y};
      } else if (entity.type === 'ATTRIB') {
        acc[id][entity.key] = entity.value;
      }
      return acc;
    }
  }, {});

  // on garde seulement les entités qui ont les attributs de localisation (LOCAL, $AREA, $PERIMETER)
  const localisationEntities = {};
  const blockEntities = {};
  for (const i in entitiesWithAttributs) {
    if (entitiesWithAttributs[i] && entitiesWithAttributs[i].hasOwnProperty('OBJIDENTVAL') && (entitiesWithAttributs[i].hasOwnProperty('LOCAL') || entitiesWithAttributs[i].hasOwnProperty('$AREA') ||
    entitiesWithAttributs[i].hasOwnProperty('$PERIMETER') || entitiesWithAttributs[i].hasOwnProperty('HANDLES'))) {
      localisationEntities[i] = entitiesWithAttributs[i];
    } else {
      // c'est les blocks déplaçables ? Qu'est ce qu'on en fait ?
      // Il faut les propriétés liées pour savoir si c'est un block Kimoce qu'on va pouvoir changer.
      blockEntities[i] = entitiesWithAttributs[i];
    }
  }

  const polylines = denormalisedEntities
  .filter( de => {
    return de.type === 'LWPOLYLINE' || de.type === 'POLYLINE' || de.type === 'CIRCLE' || de.type === 'ELLIPSE';
  })
  .map( de => {
    if ( de.type === 'LWPOLYLINE' || de.type === 'POLYLINE' ) {
      return de;
    } else if ( de.type === 'CIRCLE' || de.type === 'ELLIPSE') {
      // convertion en polyline des formes arrondies
      const arrayVertices = entityToPolyline(de);
      de.vertices = arrayVertices.map(vertice => {
        return {
          x : vertice[0],
          y : vertice[1],
        };
      });
      return de;
    }
  });

  for (const refactorEntity in localisationEntities) {
    if (refactorEntity) {
    // on regarde les polylines qui entoure l'entité courante dont le layer est le meme
      const polylinesInside = polylines.filter(polyline => {
        if (polyline.layer === localisationEntities[refactorEntity].layer) {
          return insidePolygon(localisationEntities[refactorEntity].insertCoord, polyline.vertices);
        } else {
          return false;
        }
      });
      if (polylinesInside && polylinesInside.length > 0) {
        // on calcule le perimeter de chacune
        polylinesInside.forEach( p => {
          p.perimeter = perimeterPolygon(p.vertices);
        });

        // celle qui a le plus petit perimeter est celle que nous voulons
        localisationEntities[refactorEntity].polyline = polylinesInside.reduce((prev, curr) => {
          return prev.perimeter < curr.perimeter ? prev : curr;
        });
      } else {
        // on est sur l'étage
        // on ne peut pas trouver la localisation de l'étage, on lui met un -1 par default
        localisationEntities[refactorEntity].polyline = {closed : true, layer : 'Localisation', id : '-1', vertices : [] }; // polylines[0];
      }
      // si on a une polyline qui entoure l'entité
      if (localisationEntities[refactorEntity].polyline) {
        // on ajoute la surface et le perimetre
        localisationEntities[refactorEntity].polyline.perimeter = perimeterPolygon(localisationEntities[refactorEntity].polyline.vertices);
        localisationEntities[refactorEntity].polyline.surface = surfacePolygon(localisationEntities[refactorEntity].polyline.vertices);
      }
    }
  }
  return {
    localisationEntities,
    blockEntities //
  };
};

/**
 * return si le point est dans la polyline
 * @param point : {x: number, y: number}
 * @param polyline : {x: number, y: number}[]
 */
function insidePolygon(point, polyline) {

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
function surfacePolygon(vertices) {
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
function perimeterPolygon(vertices) {
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
