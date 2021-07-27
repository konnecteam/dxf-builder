import * as assert from 'assert';
import * as fs from 'fs-extra';
import { join } from 'path';
import parseString from './parseString';
import toPolylines from './toPolylines';


const dxfContentColouredLine = fs.readFileSync(join(__dirname, '../test/resources/squareandcircle.dxf'), 'utf-8');
const dxfContentCircleEllipseArc = fs.readFileSync(join(__dirname, '../test/resources/circlesellipsesarcs.dxf'), 'utf-8');

describe('DXF to coloured polylines', () => {
  it('for square and circle', () => {
    const parsed = parseString(dxfContentColouredLine);
    const polylines = toPolylines(parsed);

    assert.equal(polylines.bbox.width, 10);
    assert.equal(polylines.polylines[0].vertices.length, 73);
    assert.equal(polylines.polylines[1].vertices.length, 5);
  });

  it('supports CIRCLE, ELLIPSE, ARC', () => {

    const parsed = parseString(dxfContentCircleEllipseArc);
    const polylines = toPolylines(parsed);
    assert.equal(polylines.polylines.length, 5);
  });
});
