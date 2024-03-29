import { cloneDeep } from 'lodash';

import logger from './util/logger';

/**
 * Fonction qui trie les entités données en fonction de leur table de tri
 * @param entities les entités à trier
 * @param sortTable les tables de tri
 */
export function sortEntities(entities : any[], sortTable : any) : any[] {
  if (entities && entities.length > 0 && entities[0].blockId) {
    // Toutes les entités ont le même blockId, on le récupere pour pouvoir trouver la table qui correspond
    const sortIndex = entities[0].blockId;
    const currentSortTableHM = sortTable[sortIndex];
    // si on a pas de table de tri poour ces entités, elles sont dans le bon ordre
    if (currentSortTableHM) {
      const allEntities = [];
      // on récupère les entités à trier de la liste
      const entitiesToSort = entities.filter(e => e.id in currentSortTableHM);
      // on les trie par ordre croissant en fct de leur valuer de tri
      const sortedEntities = entitiesToSort.sort((a, b) => parseFloat(currentSortTableHM[a.id].sortValue) - parseFloat(currentSortTableHM[b.id].sortValue));
      // on les replace correctement dans le tableau de base
      // => A partir de la premiere entité qui doit etre triée
      const insertIndex = entities.findIndex(e => currentSortTableHM[e.id]);
      entities = entities.filter(e => !(e.id in currentSortTableHM));
      entities.splice(insertIndex, 0, ...sortedEntities);

      return allEntities.concat(entities);
    }
  }

  // Cas par défaut (si pas de tri)
  return entities;
}

export default parseResult => {

  // const sortTableHM = initSortTable(parseResult.sortTable);
  const blocksByName = parseResult.blocks.reduce((acc, b) => {
    acc[b.name] = b;
    return acc;
  }, {});

  const gatherEntities = (entities, transforms) => {
    let current = [];
    entities.forEach(e => {
      if (e.type === 'INSERT') {
        const insert = e;
        const block = blocksByName[insert.block];
        if (!block) {
          logger.error();
          return;
        }
        const rowCount = insert.rowCount || 1;
        const columnCount = insert.columnCount || 1;
        const rowSpacing = insert.rowSpacing || 0;
        const columnSpacing = insert.columnSpacing || 0;
        const rotation = insert.rotation || 0;

        // It appears that the rectangular array is affected by rotation, but NOT by scale.
        let rowVec;
        let colVec;
        if (rowCount > 1 || columnCount > 1) {
          const cos = Math.cos(rotation * Math.PI / 180);
          const sin = Math.sin(rotation * Math.PI / 180);
          rowVec = { x: -sin * rowSpacing, y: cos * rowSpacing };
          colVec = { x: cos * columnSpacing, y: sin * columnSpacing };
        } else {
          rowVec = { x: 0, y: 0 };
          colVec = { x: 0, y: 0 };
        }

        // For rectangular arrays, add the block entities for each location in the array
        for (let r = 0; r < rowCount; r++) {
          for (let c = 0; c < columnCount; c++) {
            // Adjust insert transform by row and column for rectangular arrays
            const t = {
              x: insert.x + rowVec.x * r + colVec.x * c,
              y: insert.y + rowVec.y * r + colVec.y * c,
              scaleX: insert.scaleX,
              scaleY: insert.scaleY,
              scaleZ: insert.scaleZ,
              extrusionX: insert.extrusionX,
              extrusionY: insert.extrusionY,
              extrusionZ: insert.extrusionZ,
              rotation: insert.rotation
            };
            // Add the insert transform and recursively add entities
            const transforms2 = transforms.slice(0);
            transforms2.push(t);

            // Use the insert layer
            const blockEntities = block.entities.map(be => {
              const be2 = cloneDeep(be);
              be2.layer = insert.layer;
              be2.blockId = insert.blockId;
              // https://github.com/bjnortier/dxf/issues/52
              // See Issue 52. If we don't modify the
              // entity coordinates here it creates an issue with the
              // transformation matrices (which are only applied AFTER
              // block insertion modifications has been applied).
              switch (be2.type) {
                case 'LINE': {
                  be2.start.x -= block.x;
                  be2.start.y -= block.y;
                  be2.end.x -= block.x;
                  be2.end.y -= block.y;
                  break;
                }
                case 'LWPOLYLINE':
                case 'POLYLINE': {
                  be2.vertices.forEach(v => {
                    v.x -= block.x;
                    v.y -= block.y;
                  });
                  break;
                }
                case 'CIRCLE':
                case 'ELLIPSE':
                case 'ARC': {
                  be2.x -= block.x;
                  be2.y -= block.y;
                  break;
                }
                case 'SPLINE': {
                  be2.controlPoints.forEach(cp => {
                    cp.x -= block.x;
                    cp.y -= block.y;
                  });
                  break;
                }
              }
              return be2;
            });
            current = current.concat(gatherEntities(blockEntities, transforms2));
          }
        }
      } else {
        // Top-level entity. Clone and add the transforms
        // The transforms are reversed so they occur in
        // order of application - i.e. the transform of the
        // top-level insert is applied last
        const e2 = cloneDeep(e);
        e2.transforms = transforms.slice().reverse();
        current.push(e2);
      }
    });
    return current;
  };

  return gatherEntities(parseResult.entities, []);
};
