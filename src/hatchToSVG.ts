import { Box2 } from 'vecks';
import entityToPolyline from './entityToPolyline';
import * as toSVG from './toSVG';
import transformBoundingBoxAndElement from './util/transformBoundingBoxAndElement';

const fillNone = 'fill="none"';

/**
 * Fonction qui transforme une entité en objet plus simple à utiliser
 * @param entity l'entité à traiter
 */
export function polylineFiller(entity : any) : {vertices : number[][], matrices : any [][], bbox : any, element : string} {
  const vertices = entityToPolyline(entity);
  const bbox0 = vertices.reduce((acc, [x, y]) => acc.expandByPoint({ x, y }), new Box2());
  const d = toSVG.convertVerticesToPath(vertices);
  const matrices = toSVG.computeMatrices(entity.transforms);
  const { bbox, element } = toSVG.addFlipXIfApplicable(entity, { bbox: bbox0, element: `<path ${fillNone} d="${d}" />` });
  const transformedBoxAndElement = transformBoundingBoxAndElement(bbox, element, entity.transforms);
  return Object.assign({vertices, matrices }, transformedBoxAndElement);
}

/**
 * Fonction qui permet de transformer une liste de segments en liste de formes formées par ces segments
 * @param segmentsList la liste des segments à transformer
 * @param transforms les transformations à apporter aux coordonnées
 */
export function transformSegmentsToShapes(segmentsList : any[], transforms : any) : any[] {
  const returnValue = [];
  let shape = [];
  for (let i = 0; i < segmentsList.length; i++) {
    if (segmentsList[i].type !== 'SPLINE') { // on ne traite pas les spline
      segmentsList[i].transforms = transforms; // on ajoute les transformations à apporter
      // certaines lines sont des lines, d'autres des polylines, d'autres des arcs, dont ask me why
      if (segmentsList[i].type === 'LINE') {
        if (segmentsList[i].vertices.length === 2 && !segmentsList[i].hasBulge ) {
          segmentsList[i].start = {x : segmentsList[i].vertices[0].x, y : segmentsList[i].vertices[0].y };
          segmentsList[i].end = {x : segmentsList[i].vertices[segmentsList[i].vertices.length - 1].x, y : segmentsList[i].vertices[segmentsList[i].vertices.length - 1].y };
        } else {
          // les LINE qui n'ont pas de bulges sont en fait des polylines, mais sont remontées comme etant des LINE
          // on lui change son type pour poouvoir la traiter correctement plus tard
          segmentsList[i].vertices[segmentsList[i].vertices.length - 1].bulge ? segmentsList[i].closed = true : segmentsList[i].closed = false;
          segmentsList[i].type = 'POLYLINE';
        }
      }
      const segment = polylineFiller(segmentsList[i]);
      // on recalcule les valeurs des vertices par rapport aux transformations, car l'attribut transform dans les mask n'est pas pris en compte
      const transformedVertices = calculateCoordFromMatrix(segment.vertices, segment.matrices);
      if (segmentsList[i].type === 'POLYLINE') {
        // polyline === une forme
        returnValue.push(transformedVertices);
      } else if (segmentsList[i].type === 'LINE' || segmentsList[i].type === 'ARC' || segmentsList[i].type === 'ELLIPSE') {
        // line, arc, ellipse === segment d'une forme, pas forcément la forme entière
        shape = shape.concat(transformedVertices);
        if (shape[0] === shape[shape.length - 1]) {
          returnValue.push(shape);
          shape = [];
        }
      }
    }
  }
  if ( shape.length > 0) {
    returnValue.push(shape);
  }
  return returnValue;
}

/**
 * Fonction qui calcule la bbox d'une liste d'éléments
 * @param elements la liste des éléments dont on veut la bbox
 */
export function getBBox(elements : string[]) : Box2 {
  const arrayX = [];
  const arrayY = [];
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const xy = element.split(',');
    arrayX.push(xy[0]);
    arrayY.push(xy[1]);
  }
  const maxX = Math.max.apply(Math, arrayX);
  const maxY = Math.max.apply(Math, arrayY);
  const minX = Math.min.apply(Math, arrayX);
  const minY = Math.min.apply(Math, arrayY);
  return new Box2({x : minX, y : minY}, {x : maxX, y : maxY});
}

/**
 * Restitution de l'entité HATCH du dxf, permettant de remplir complétement des formes d'une couleur donnée
 * Les hachures et autres formes de remplissages ne sont pas gérés et sont restituées en remplissage plein
 * @param entity l'entité à traiter
 * @param rgb la couleur à utiliser [r, g, b]
 */
export default (entity : any, rgb : number[]) => {
  const listOfElements : Array<Array<{bbox : Box2, shape : string[], container? : boolean, inside? : number}>> = [];
  let currentShapeLevel = 0;
  if (!entity.transforms || entity.transforms.length === 0 ) {
    entity.transforms = [{scaleX : 1, scaleY : 1}];
  }
  const shapes = transformSegmentsToShapes(entity.shapes, entity.transforms);
  const shapesAndBBox = shapes.map( shape => {
    return {
      shape,
      bbox : getBBox(shape)
    };
  });
  if (shapesAndBBox && shapesAndBBox.length > 0) {
    const bbox0 = new Box2();
    for (let i = 0; i < shapesAndBBox.length; i++) {
      const shapeAndBBox = shapesAndBBox[i];
      const boxAndElement : {bbox : Box2, shape : string[], container? : boolean, inside? : number} = {bbox : shapeAndBBox.bbox, shape : shapeAndBBox.shape};

      bbox0.expandByPoint(boxAndElement.bbox.min);
      bbox0.expandByPoint(boxAndElement.bbox.max);

      // on ajoute les infos permettant de savoir si c'est un mask (= limite de la forme à dessiner) ou une forme à dessiner
      const currentCenterPoint = {x : (boxAndElement.bbox.min.x + boxAndElement.bbox.max.x) / 2, y : (boxAndElement.bbox.min.y + boxAndElement.bbox.max.y) / 2 };

      if (listOfElements.length === 0) {
        listOfElements[currentShapeLevel] = [];
        listOfElements[currentShapeLevel].push(boxAndElement);
        currentShapeLevel++;
      } else {
        // Si le centre est dans une des formes du niveau -1, on push
        if (!listOfElements[currentShapeLevel]) {
          listOfElements[currentShapeLevel] = [];
        }

        let watchLvl = currentShapeLevel - 1;
        let containerIndex = isIncludeInShapes(listOfElements[watchLvl], currentCenterPoint);
        while (containerIndex === -1 && watchLvl > -1) {
          watchLvl --;
          containerIndex = isIncludeInShapes(listOfElements[watchLvl], currentCenterPoint);
        }
        if (containerIndex !== -1) {
          listOfElements[watchLvl][containerIndex].container = true;
          boxAndElement.inside = containerIndex;
          listOfElements[watchLvl + 1].push(boxAndElement);
          if (currentShapeLevel === watchLvl + 1) {
            currentShapeLevel ++;
          }
        } else {
          listOfElements[0].push(boxAndElement);
        }
      }
    }
    let returnValue = `<g type="hatch" ${entity.sortValue ? 'sort=' + '"' + entity.sortValue + '"' : '' }>`;
    returnValue += buildMask(listOfElements, rgb);
    returnValue += '</g>';
    return {bbox : bbox0, element : returnValue};
  }
};

/**
 * Fonction qui permet de savoir si un point est compris dans une des formes ou non
 * retourne l'index de la forme dans lequel est le point
 * si le point n'est dans aucune forme, retourne -1
 * @param shapes listes des formes
 * @param point le point
 */
export function isIncludeInShapes(shapes : Array<{bbox : Box2, shape : string[] }>, point : {x : number, y : number}) : number {
  if (!shapes) {
    return -1;
  }
  for ( let i = 0; i < shapes.length; i++) {
    const shape = shapes[i];
    if (shape.bbox.isPointInside(point)) {
      return i;
    }
  }
  return -1;
}

/**
 * Fonction qui construit les mask permettant de faire des 'trous' dans les formes
 * retourne le html des formes avec leurs masks et leurs couleurs
 * @param listOflistOfElements la liste de la liste des elements
 * @param rgb la couleur à utiliser [r, g, b]
 */
export function buildMask(listOflistOfElements, rgb : number[]) : string {
  const returnValue = [];
  let maskList = [];
  for (let i = listOflistOfElements.length - 1; i >= 0; i--) {
    const listOfElements = listOflistOfElements[i];
    if ( i % 2 === 1) {
      //impair => on crée les masks
      for (let j = 0; j < listOfElements.length; j++ ) {
        const boxAndElement = listOfElements[j];
        const insideIndex = boxAndElement.inside;
        boxAndElement.element = createPathForMask(boxAndElement.shape);
        boxAndElement.element = boxAndElement.element.replace(fillNone, `fill="black"`);
        if (!maskList[insideIndex]) {
          maskList[insideIndex] = boxAndElement.element;
        } else {
          maskList[insideIndex] += boxAndElement.element;
        }
      }
    } else {
      // pair => on remplit et on ajoute les masks
      for (let j = 0; j < listOfElements.length; j++ ) {
        const boxAndElement = listOfElements[j];
        // on crée un id unique pour le mask
        const id = Date.now() + Math.random();
        let maskElement = '';
        //dans tous les cas il faut les remplir
        let replaceValue = `fill="rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})"`;
        if (boxAndElement.container) {
          maskElement += `<mask id="${id}">`;
          maskElement += 'maskReplacement';
          maskElement += maskList[j];
          maskElement += '</mask>';
          //si c'est un container, il faut lui mettre le mask
          replaceValue += ` mask="url(#${id})"`;
        }
        // on replace fill="none" avec replaceValue puisqu'on veut remplir
        boxAndElement.element = createPathForMask(boxAndElement.shape);
        boxAndElement.element = boxAndElement.element.replace(fillNone, replaceValue);
        if (!returnValue[i]) {
          returnValue[i] = '';
        }
        returnValue[i] += maskElement;
        returnValue[i] += boxAndElement.element;
      }
      // On réinit la liste des masks pour les prochains
      maskList = [];
    }
  }
  return returnValue.join(' ');
}

/**
 * Fonction qui retourne un <path> correspondant aux vertices donnés
 * @param vertices liste des vertices
 */
export function createPathForMask(vertices : string[]) : string {
  let returnValue = `<path fill="none" d="M`;
  returnValue += vertices.join('L');
  returnValue += '" />';
  return returnValue;
}

/**
 * Fonction qui permet de recalculer les valeurs des vertices avec les transformations des matrices
 * @param vertices liste des vertices à recalculer
 * @param matrices liste des matrices à appliquer aux valeurs
 */
export function calculateCoordFromMatrix(vertices : number[][], matrices : string[][]) {
  let newVertices = [];
  for (let i = 0; i < matrices.length; i++) {
    const matrix = matrices[i];
    const a = parseFloat(matrix[0]);
    const b = parseFloat(matrix[1]);
    const c = parseFloat(matrix[2]);
    const d = parseFloat(matrix[3]);
    const e = parseFloat(matrix[4]);
    const f = parseFloat(matrix[5]);

    for (let j = 0; j < vertices.length; j++) {
      const vertice = vertices[j];
      let valueY = vertice[1];
      if (i === 0) {
        // on inverse seulement la premier instance des coordonnées
        valueY = -vertice[1];
      }
      const newX = (a * vertice[0]) + (c * valueY) + e;
      const newY = (b * vertice[0]) + (d * valueY) + f;
      newVertices.push([newX, newY]);
    }
    vertices = newVertices;
    newVertices = [];
  }
  const re = vertices.map((v : number[]) =>  {
    return `${v[0]},${v[1]}`;
  });
  return re;
}
