import common from './common';

export const TYPE = 'TEXT';

export const process = tuples => {
  return tuples.reduce((entity, tuple) => {
    const type = tuple[0];
    const value = tuple[1];
    switch (type) {
      case 39:
        entity.thickness = value;
        break;
      case 5:
        entity.blockId = value;
        break;
      case 7:
        entity.styleName = value;
        break;
      case 10:
        entity.x = value;
        break;
      case 20:
        entity.y = value;
        break;
      case 30:
        entity.z = value;
        break;
      case 40:
        entity.height = value;
        break;
      case 41:
        entity.scaleX = value;
        break;
      case 1:
        entity.textValue = value;
        break;
      case 50:
        entity.rotation = value;
        break;
      case 51:
        entity.angle = value;
        break;
      case 210:
        entity.extrusionX = value;
        break;
      case 220:
        entity.extrusionY = value;
        break;
      case 230:
        entity.extrusionZ = value;
        break;
      default:
        Object.assign(entity, common(type, value));
        break;
    }
    return entity;
  }, {
    type: TYPE
  });
};

export default { TYPE, process };
