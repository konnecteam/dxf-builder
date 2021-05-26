import * as assert from 'assert';
import * as fs from 'fs';
import { join } from 'path';
import parseString from '../parseString';

const dxfContents = fs.readFileSync(join(__dirname, '../../test/resources/blocks1.dxf'), 'utf-8');

describe('BLOCK', () => {
  it('can be parsed', () => {
    const blocks = parseString(dxfContents).blocks;
    assert.deepEqual(blocks.length, 3);
    assert.deepEqual(blocks[0], {
      name: '*Model_Space',
      entities: [],
      x: 0,
      xref: '',
      y: 0,
      z: 0,
      id: '20',
    });
    assert.deepEqual(blocks[1], {
      name: '*Paper_Space',
      entities: [],
      x: 0,
      xref: '',
      y: 0,
      z: 0,
      id: '1C'
    });

    const entities2 = blocks[2].entities;
    delete (blocks[2]['entities']);
    assert.deepEqual(blocks[2], {
      name: 'a',
      x: 0,
      xref: '',
      y: 0,
      id: '4E'
    });
    assert.equal(entities2.length, 5);
    assert.equal(entities2[0].type, 'LINE');
    assert.equal(entities2[1].type, 'LINE');
    assert.equal(entities2[2].type, 'LINE');
    assert.equal(entities2[3].type, 'LINE');
    assert.equal(entities2[4].type, 'CIRCLE');
  });
});
