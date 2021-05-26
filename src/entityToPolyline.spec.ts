import * as assert from 'assert';
import * as fs from 'fs-extra';
import { join } from 'path';
import entityToPolyline from './entityToPolyline';
import parseString from './parseString';

describe('Entity To Polyline', () => {

  it('ARC to polyline', () => {
    const arcEntity = {
      endAngle: 220,
      IsCounterclockwiseFlag: 0,
      r: 20,
      startAngle: 40,
      transforms: [],
      type: 'ARC',
      vertices: [],
      x: 30,
      y: 60,
    };
    const polylines = entityToPolyline(arcEntity);
    assert.ok(polylines.length === 37);
  });

  it('polyline to polyline', () => {
    const polylineEntity = {
      blockId: '21D',
      closed: true,
      id: '37B',
      transforms: [],
      type: 'LWPOLYLINE',
      vertices: [{x: 0, y: 0}, {x: 0, y: 5}, {x: 5, y: 5}],
    };
    const polylines = entityToPolyline(polylineEntity);
    assert.ok(polylines.length === 4);
  });

  it('circle to polyline', () => {
    const circleEntity = {
      id: '204',
      layer: '0',
      r: 5,
      transforms: [],
      type: 'CIRCLE',
      x: 0,
      y: 0,
    };
    const polylines = entityToPolyline(circleEntity);
    assert.ok(polylines.length === 73);
  });
});
