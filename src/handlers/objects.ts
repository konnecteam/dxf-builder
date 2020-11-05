/**
 * Parser de la partie OBJECT du dxf
 * On ne s'occupe que des récupérer les SORTENTSTABLE, les tables de tri nous donnant l'ordre de rendu des entités
 * @tuples les infos de la partie OBJECT
 * @records les BLOCK_RECORD pour ajouter les id des blocks aux tables de tri
 */
export default (tuples : any, records : any) => {
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
  // on ne garde que les SORTENTSTABLE
  const sortEntities = entityGroups.filter(entityGroup => entityGroup[0][1] === 'SORTENTSTABLE');

  const sortTable = {};
  for (let i = 0; i < sortEntities.length; i++) {
    const entityGroup = sortEntities[i];
    const contentTuples = entityGroup.slice(1);
    const sortTableEntry = {entityId : null, sortValue : null};
    let index;
    contentTuples.forEach(tuple => {
      if (tuple[0] === 330) {
        index = tuple[1];
      }
      if (tuple[0] === 331) {
        sortTableEntry.entityId = tuple[1];
      }
      if (tuple[0] === 5) {
        sortTableEntry.sortValue = parseInt(tuple[1], 16).toString();
        if (sortTableEntry.entityId) {
          if (!sortTable[index]) {
            sortTable[index] = {};
            sortTable[index].entityOrder = [];
            sortTable[index].refs = records[index].blockRef;
          }
          sortTable[index].entityOrder.push(Object.assign({}, sortTableEntry));
        }
      }
    });
  }

  // on veut pouvoir acceder aux tables grace aux id des blocks
  const trueSortTable = {};
  const keys = Object.keys(sortTable);
  for (let i = 0; i < keys.length; i++) {
    const current = sortTable[keys[i]];
    current.refs.forEach(ref => {
      trueSortTable[ref] = current.entityOrder;
    });
  }

  const sortTableHM = {};
  const sortTableKeys = Object.keys(trueSortTable);
  for (let i = 0; i < sortTableKeys.length; i++) {
    const currentSortTable = trueSortTable[sortTableKeys[i]];
    const currentSortTableHM = {};

    currentSortTable.forEach(e => {
      currentSortTableHM[e.entityId] = e;
    });
    sortTableHM[sortTableKeys[i]] = currentSortTableHM;
  }
  return sortTableHM;
};
