const drawingUnitEnum = {
  0: '/',
  1: 'in',
  2: 'ft',
  3: 'mi',
  4: 'mm',
  5: 'cm',
  6: 'm',
  7: 'km',
  8: 'µin',
  9: 'Mils',
  10: 'yd',
  11: 'Å',
  12: 'nm',
  13: 'Microns',
  14: 'dm',
  15: 'dam',
  16: 'hm',
  17: 'gm',
  18: 'AU',
  19: 'ly',
  20: 'pc'
};

export default tuples => {
  let state;
  const header : {extMin : any, extMax : any, name : string, comments : string, author : string, lastSaveBy : string, title : string, creationDate : string, updateDate : string,
    drawingUnit : string, latitude : string, longitude : string, tracewid : string, textSize : string, dimArrowSize : string, dimTextHeight : string} = {
      extMin : {}, extMax : {}, name : '', comments : '', author : '', lastSaveBy : '', title : '', creationDate : '', updateDate : '', drawingUnit : '', latitude : '', longitude : '', tracewid : '', textSize : '', dimArrowSize : '', dimTextHeight : ''
    };

  tuples.forEach(tuple => {
    const type = tuple[0];
    const value = tuple[1];
    switch (value) {
      case '$EXTMIN':
        header.extMin = {};
        state = 'extMin';
        return;
      case '$EXTMAX':
        header.extMax = {};
        state = 'extMax';
        return;
      case '$PROJECTNAME':
        header.name = '';
        state = 'projectName';
        return;
      case '$COMMENTS':
        header.comments = '';
        state = 'comments';
        return;
      case '$AUTHOR':
        header.author = '';
        state = 'author';
        return;
      case '$LASTSAVEDBY':
        header.lastSaveBy = '';
        state = 'lastSaveName';
        return;
      case '$TITLE':
        header.title = '';
        state = 'title';
        return;
      case '$TDUCREATE':
        header.creationDate = '';
        state = 'createDate';
        return;
      case '$TDUUPDATE':
        header.updateDate = '';
        state = 'updateDate';
        return;
      case '$TEXTSIZE':
        header.textSize = '';
        state = 'textSize';
        return;
      case '$DIMASZ':
        header.dimArrowSize = '';
        state = 'dimArrowSize';
        break;
      case '$DIMTXT':
        header.dimTextHeight = '';
        state = 'dimTextHeight';
        break;
      case '$INSUNITS':
        header.drawingUnit = '';
        state = 'drawingUnit';
        return;
      case '$LATITUDE':
        header.latitude = '';
        state = 'latitude';
        return;
      case '$LONGITUDE':
        header.longitude = '';
        state = 'longitude';
        return;
      case '$TRACEWID':
        header.tracewid = '';
        state = 'tracewid';
        return;
      default: {
        if (state === 'extMin') {
          if (type === 10) {
            header.extMin.x = value;
          } else if (type === 20) {
            header.extMin.y = value;
          } else if (type === 30) {
            header.extMin.z = value;
            state = undefined;
          }
        } else if (state === 'extMax') {
          if (type === 10) {
            header.extMax.x = value;
          } else if (type === 20) {
            header.extMax.y = value;
          } else if (type === 30) {
            header.extMax.z = value;
            state = undefined;
          }
        } else {
          if (state === 'projectName') {
            header.name = value;
            state = undefined;
          } else if (state === 'comments') {
            header.comments = value;
            state = undefined;
          } else if (state === 'tracewid') {
            header.tracewid = value;
            state = undefined;
          } else if (state === 'author') {
            header.author = value;
            state = undefined;
          } else if (state === 'lastSaveName') {
            header.lastSaveBy = value;
            state = undefined;
          } else if (state === 'title') {
            header.title = value;
            state = undefined;
          } else if (state === 'latitude') {
            header.latitude = value;
            state = undefined;
          } else if (state === 'longitude') {
            header.longitude = value;
            state = undefined;
          } else if (state === 'createDate') {
            header.creationDate = value;
            state = undefined;
          } else if (state === 'updateDate') {
            header.updateDate = value;
            state = undefined;
          } else if (state === 'drawingUnit') {
            header.drawingUnit = drawingUnitEnum[value];
            state = undefined;
          } else if (state === 'measurement') {
            if (type === 70) {
              header[state] = value;
            }
            state = undefined;
          } else if (state === 'textSize' || state === 'dimArrowSize' || state === 'dimTextHeight') {
            if (type === 40) {
              header[state] = value;
            }
            state = undefined;
          } else {
            state = undefined;
          }
        }
      }
    }
  });

  return header;
};
