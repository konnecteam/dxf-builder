import logger from '../util/logger';

const layerHandler = tuples => {
  return tuples.reduce((layer, tuple) => {
    const type = tuple[0];
    const value = tuple[1];
    // https://www.autodesk.com/techpubs/autocad/acad2000/dxf/layer_dxf_04.htm
    switch (type) {
      case 2:
        layer.name = value;
        break;
      case 6:
        layer.lineTypeName = value;
        break;
      case 62:
        layer.colorNumber = value;
        break;
      case 70:
        layer.flags = value;
        break;
      case 290:
        layer.plot = parseInt(value, 10) !== 0;
        break;
      case 370:
        layer.lineWeightEnum = value;
        break;
      default:
    }
    return layer;
  }, { type: 'LAYER' });
};

const styleHandler = tuples => {
  return tuples.reduce((style, tuple) => {
    const type = tuple[0];
    const value = tuple[1];
    switch (type) {
      case 2:
        style.name = value;
        break;
      case 6:
        style.lineTypeName = value;
        break;
      case 40:
        style.fixedTextHeight = value;
        break;
      case 41:
        style.widthFactor = value;
        break;
      case 50:
        style.obliqueAngle = value;
        break;
      case 71:
        style.flags = value;
        break;
      case 42:
        style.lastHeightUsed = value;
        break;
      case 3:
        style.primaryFontFileName = value;
        break;
      case 4:
        style.bigFontFileName = value;
        break;
      case 1000:
        style.fontFamily = value;
        break;
      default:
    }
    return style;
  }, { type: 'STYLE' });
};

/**
 * handler permetttant des gérer l'entité BLOCK_RECORD
 * entité faisant le lien entre les tables de tri et les instances de blocks
 * @param tuples les tuples contenant les infos du BLOCK_RECORD
 */
const recordHandler = (tuples : any) => {
  return tuples.reduce((record, tuple) => {
    const type = tuple[0];
    const value = tuple[1];
    switch (type) {
      case 2:
        record.name = value;
        break;
      case 5:
        record.id = value;
        break;
      case 102:
        // le premier 102 fait référence au début de la liste des blocks
        // le deuxième dit que c'est la fin de la liste
        if (!record.blockRef) {
          record.blockRef = [];
        }
        break;
      case 331:
        // 331 indique l'id du block de la référence
        if (record.blockRef) {
          record.blockRef.push(value);
        }
        break;
      default:
    }
    return record;
  }, { type: 'RECORD' });
};

const tableHandler = (tuples, tableType, handler) => {
  const tableRowsTuples = [];

  let tableRowTuples;
  tuples.forEach(tuple => {
    const type = tuple[0];
    const value = tuple[1];
    if (((type === 0) || (type === 2)) && (value === tableType)) {
      tableRowTuples = [];
      tableRowsTuples.push(tableRowTuples);
    } else {
      tableRowTuples.push(tuple);
    }
  });

  return tableRowsTuples.reduce((acc, rowTuples) => {
    const tableRow = handler(rowTuples);
    if (tableRow.name && tableType !== 'BLOCK_RECORD') {
      acc[tableRow.name] = tableRow;
    } else if (tableType === 'BLOCK_RECORD') {
      // définir le block_record par son id est plus simple d'utilisation qu'avec son nom
      acc[tableRow.id] = tableRow;
    } else {
      logger.warn();
    }
    return acc;
  }, {});
};

export default tuples => {
  const tableGroups = [];
  let tableTuples;
  tuples.forEach(tuple => {
    // const type = tuple[0];
    const value = tuple[1];
    if (value === 'TABLE') {
      tableTuples = [];
      tableGroups.push(tableTuples);
    } else if (value === 'ENDTAB') {
      tableGroups.push(tableTuples);
    } else {
      tableTuples.push(tuple);
    }
  });

  let stylesTuples = [];
  let layersTuples = [];
  let recordsTuples = [];
  tableGroups.forEach(group => {
    if (group[0][1] === 'STYLE') {
      stylesTuples = group;
    } else if (group[0][1] === 'LTYPE') {
      logger.warn();
    } else if (group[0][1] === 'LAYER') {
      layersTuples = group;
    } else if (group[0][1] === 'BLOCK_RECORD') {
      recordsTuples = group;
    }
  });

  return {
    layers: tableHandler(layersTuples, 'LAYER', layerHandler),
    styles: tableHandler(stylesTuples, 'STYLE', styleHandler),
    records: tableHandler(recordsTuples, 'BLOCK_RECORD', recordHandler)
  };
};
