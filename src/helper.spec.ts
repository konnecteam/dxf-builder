import * as assert from 'assert';
import * as fs from 'fs-extra';
import { join } from 'path';
import { Box2 } from 'vecks';

import Helper from './helper';
const dxfContents = fs.readFileSync(join(__dirname, '../test/resources/1x1rectangle.dxf'), 'utf-8');

describe('Helper', () => {
  it('should be constructed with a string', () => {
    assert.throws(() => {
      return new Helper(null);
    });
  });

  it('parsed automatically', () => {
    const helper = new Helper(dxfContents);
    assert.equal(helper.parsed.entities.length, 1);
  });

  it('denormalises automatically', () => {
    const helper = new Helper(dxfContents);
    assert.equal(helper.denormalised.length, 1);
  });

  it('can group by layer', () => {
    const helper = new Helper(dxfContents);
    assert.equal(helper.groups.Default.length, 1);
  });

  it('can output an SVG', () => {
    const helper = new Helper(dxfContents);
    const svg = helper.toSVG();
    assert.ok(svg.includes('<svg') && svg.includes('</svg>'));
  });

  it('can output polylines', () => {
    const helper = new Helper(dxfContents);
    const polylines = helper.toPolylines();
    assert.deepEqual(polylines.bbox, new Box2({x : 0, y : 0}, {x : 10, y : 10}));
    assert.deepEqual(polylines.polylines,
      [{
        id: undefined,
        rgb: [0, 0, 79],
        vertices: [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
      }]);
  });

  it('can detect localisations', () => {
    const dxfLocalisationContents = fs.readFileSync(join(__dirname, '../test/resources/localisation.dxf'), 'utf-8');
    const helper = new Helper(dxfLocalisationContents);
    const helperLocalisations = helper.localisations;
    const entries = Object.entries(helperLocalisations);
    assert.equal(entries[0][0], 226);
    assert.equal(entries[0][1]['OBJIDENTVAL'], 'OBJIDENTVAL');
    assert.equal(entries[0][1]['layer'], 'Localisation');
  });
});
