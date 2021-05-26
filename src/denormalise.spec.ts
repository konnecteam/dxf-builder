import * as assert from 'assert';
import * as fs from 'fs-extra';
import { join } from 'path';
import * as denormalise from './denormalise';
import parseString from './parseString';

function getDenormalizeEntities(fileName) {
  const contents = fs.readFileSync(join(__dirname, fileName), 'utf-8');
  const parsed = parseString(contents);
  return denormalise.default(parsed);
}

describe('Denormalise', () => {

  it('top-level entities', () => {
    const entities = getDenormalizeEntities('../test/resources/lines.dxf');
    assert.equal(entities.length, 11);
  });

  it('entities from inserted blocks', () => {
    const entities = getDenormalizeEntities('../test/resources/blocks1.dxf');
    assert.equal(entities.length, 10);
  });

  it('for blocks that contain inserts', () => {
    const entities = getDenormalizeEntities('../test/resources/blocks2.dxf');
    assert.equal(entities.length, 14);
    // assert.equal(entities[3].transforms.length, 2);
    assert.deepEqual(entities[3].transforms, [
      { x: 0, y: 0, scaleX: 2, scaleY: 2, scaleZ: 0, rotation: 0, extrusionX: undefined, extrusionY: undefined, extrusionZ: undefined },
      { x: 175, y: 25, scaleX: 0.5, scaleY: 0.5, scaleZ: 0, rotation: 0, extrusionX: undefined, extrusionY: undefined, extrusionZ: undefined},
    ]);
  });

  it('should sort entities', () => {
    const entities = [{blockId : 1, id : 1}, {blockId : 1, id : 2}, {blockId : 1, id : 3}, {blockId : 1, id : 4}, {blockId : 1, id : 5}];
    const sortTable = {
      1 : {
        2 : {
          entityId : 2,
          sortValue : 3
        },
        3 : {
          entityId : 3,
          sortValue : 2
        },
        5 : {
          entityId : 5,
          sortValue : 1
        }
      }
    };
    const sortedEntities = denormalise.sortEntities(entities, sortTable);
    const order = sortedEntities.map(s => s.id).join();
    assert.equal(order, '1,5,3,2,4');
  });
});
