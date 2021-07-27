import * as assert from 'assert';
import * as fs from 'fs';
import { join } from 'path';
import parseString from '../../parseString';

const dxfContents = fs.readFileSync(join(__dirname, '../../../test/resources/dimensions.dxf'), 'utf-8');

const verticalDxfDimension = fs.readFileSync(join(__dirname, '../../../test/resources/dimension-vertical.dxf'), 'utf-8');

describe('DIMENSION', () => {
  it('can be parsed', () => {
    const parsed = parseString(dxfContents);
    const entities = parsed.entities;
    const dimensions = entities.filter(e => e.type === 'DIMENSION');
    const header = parsed.header;
    assert.equal(dimensions.length, 2);

    assert.deepEqual(dimensions[0], {
      actualMeasurement : 0,
      type: 'DIMENSION',
      block: '*D1',
      dimensionType: 0,
      attachementPoint: 5,
      start: { x: 90, y: 20, z: 0 },
      textMidpoint: { x: 50, y: 21.875, z: 0 },
      measureStart: { x: 10, y: 10, z: 0 },
      measureEnd: { x: 90, y: 10, z: 0 },
      extrudeDirection: { x: 0, y: 0, z: 1 },
      dimensionArc: { x: 0, y: 0, z: 0 },
      firstPointOnArc: { x: 0, y: 0, z: 0 },
      textRotation: 0,
      uniqueBlockReference: true,
      layer: '0',
      id: '5C',
      colorNumber: 256,
      lineTypeName: 'ByLayer'
    });

    assert.equal(header.dimArrowSize, 2.5);
  });

  it('can handle rotation for vertical dimension', () => {
    const parsed = parseString(verticalDxfDimension);
    const entities = parsed.entities;
    const dimensions = entities.filter(e => e.type === 'DIMENSION');
    const header = parsed.header;
    assert.equal(dimensions.length, 1);

    assert.deepEqual(dimensions[0], {
      actualMeasurement : -1,
      type: 'DIMENSION',
      block: '',
      dimensionType: 0,
      uniqueBlockReference: true,
      userDefinedLocation: true,
      attachementPoint: 5,
      start: { x: 88.15777111112607, y: 148.1076419471065, z: 0 },
      textMidpoint: { x: 88.15777111112607, y: 121.3576419471065, z: 0 },
      measureStart: { x: 187.8323741464143, y: 148.1076419471065, z: 0 },
      measureEnd: { x: 109.5740206784428, y: 94.60764194710634, z: 0 },
      extrudeDirection: { x: 0, y: 0, z: 0 },
      dimensionArc: { x: 0, y: 0, z: 0 },
      firstPointOnArc: { x: 0, y: 0, z: 0 },
      rotation: 90,
      id: '3026C',
      layer: '0',
      display: '5.35'
    });

    //  assert.equal(header.dimArrowSize, 3);
  });
});
