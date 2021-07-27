import * as assert from 'assert';
import * as fs from 'fs';
import { join } from 'path';
import parseString from '../parseString';

const dxfContents = fs.readFileSync(join(__dirname, '../../test/resources/blocks2.dxf'), 'utf-8');

describe('BLOCK 2', () => {
  it('can be parsed', () => {
    const blocks = parseString(dxfContents).blocks;
    assert.equal(blocks.length, 5);
    assert.deepEqual(blocks[0], {
      name: '*Model_Space',
      entities: [],
      x: 0,
      xref: '',
      y: 0,
      z: 0,
      id: '20'
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
      name: 'block_insert',
      x: 0,
      xref: '',
      y: 0,
      id: '55'
    });
    assert.equal(entities2.length, 2);
    assert.equal(entities2[0].type, 'INSERT');
    assert.equal(entities2[1].type, 'INSERT');

    const entities3 = blocks[3].entities;
    delete (blocks[3]['entities']);
    assert.deepEqual(blocks[3], {
      name: 'block01',
      x: 0,
      xref: '',
      y: 0,
      id: '58'
    });
    assert.equal(entities3.length, 6);
    assert.equal(entities3[0].type, 'LINE');
    assert.equal(entities3[1].type, 'LINE');
    assert.equal(entities3[2].type, 'LINE');
    assert.equal(entities3[3].type, 'LINE');
    assert.equal(entities3[4].type, 'ARC');
    assert.equal(entities3[5].type, 'MTEXT');

    const entities4 = blocks[4].entities;
    delete (blocks[4]['entities']);
    assert.deepEqual(blocks[4], {
      name: 'block02',
      x: 0,
      xref: '',
      y: 0,
      id: '5B'
    });
    assert.equal(entities4.length, 5);
    assert.equal(entities4[0].type, 'LINE');
    assert.equal(entities4[1].type, 'LINE');
    assert.equal(entities4[2].type, 'LINE');
    assert.equal(entities4[3].type, 'MTEXT');
    assert.equal(entities4[4].type, 'ELLIPSE');
  });
});
