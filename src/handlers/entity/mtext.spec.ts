import * as assert from 'assert';
import * as fs from 'fs';
import { join } from 'path';
import parseString from '../../parseString';


const dxfContents = fs.readFileSync(join(__dirname, '../../../test/resources/texts.dxf'), 'utf-8');

describe('MTEXT', () => {
  it('can be parsed', () => {
    const entities = parseString(dxfContents).entities;
    assert.equal(entities.length, 2);

    assert.deepEqual(entities[0], {
      type: 'MTEXT',
      layer: '0',
      string: 'ISO TEXT',
      styleName: 'iso',
      colorNumber: 256,
      nominalTextHeight: 20,
      x: 0,
      y: 20,
      z: 0,
      id: '4F',
      extrusionX: 0,
      extrusionY: 0,
      extrusionZ: 1,
      attachmentPoint: 1,
      columnHeights: 0,
      drawingDirection: 1,
      lineSpacingFactor: 1,
      lineSpacingStyle: 2,
      lineTypeName: 'ByLayer',
      refRectangleWidth: 121.6666624266237
    });
    assert.deepEqual(entities[1], {
      type: 'MTEXT',
      layer: '0',
      string: 'UNICODE TEXT',
      styleName: 'unicode',
      colorNumber: 256,
      nominalTextHeight: 30,
      x: 0,
      y: 100,
      z: 0,
      id: '50',
      extrusionX: 0,
      extrusionY: 0,
      extrusionZ: 1,
      attachmentPoint: 7,
      columnHeights: 0,
      drawingDirection: 1,
      lineSpacingFactor: 1,
      lineSpacingStyle: 2,
      lineTypeName: 'ByLayer',
      refRectangleWidth: 282.5000000000001
    });
  });
});
