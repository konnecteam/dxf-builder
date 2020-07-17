import common from './common';

export const TYPE = 'TEXT';

enum EKeyField {

  'textValue' = 1,
  'blockId' = 5,
  'styleName' = 7,
  'x' = 10,
  'y' = 20,
  'z'= 30,
  'thickness'= 39,
  'height'= 40,
  'scaleX'= 41,
  'rotation' = 50,
  'angle' = 51,
  'extrusionX' = 210,
  'extrusionY' = 220,
  'extrusionZ' = 230,
}

export const process = tuples => {
  return tuples.reduce((entity, tuple) => {
    const type = tuple[0];
    const value = tuple[1];
    if (EKeyField.hasOwnProperty(type)) {
      entity[EKeyField[type]] = value;
    } else {
      Object.assign(entity, common(type, value));
    }
    return entity;
  }, {
    type: TYPE,
    string: ''
  });
};

export default { TYPE, process };
