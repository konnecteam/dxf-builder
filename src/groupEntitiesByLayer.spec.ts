import * as assert from 'assert';
import * as fs from 'fs';
import { join } from 'path';
import denormalise from './denormalise';
import groupEntitiesByLayer from './groupEntitiesByLayer';
import parseString from './parseString';


describe('Group entities', () => {
  it('by layer', () => {
    const parsed = parseString(
      fs.readFileSync(join(__dirname, '../test/resources/floorplan.dxf'), 'utf-8'));
    const entities = denormalise(parsed);
    const byLayer = groupEntitiesByLayer(entities);

    assert.deepEqual(Object.keys(byLayer), [
      '0',
      'A-NOTE',
      'A-TEXT',
      'A-DIMS-1',
      'ANNTEXT',
      'xref-Bishop-Overland-08$0$A-WALL',
      'xref-Bishop-Overland-08$0$A-CASE-1',
      'xref-Bishop-Overland-08$0$A-OPENING',
      'xref-Bishop-Overland-08$0$A-GARAGE-DOOR',
      'xref-Bishop-Overland-08$0$S-STEM-WALL',
      'xref-Bishop-Overland-08$0$S-FOOTER',
      'xref-Bishop-Overland-08$0$A-HEADER',
      'xref-Bishop-Overland-08$0$R-BEAM',
      'xref-Bishop-Overland-08$0$A-FOOTPRINT',
      'xref-Bishop-Overland-08$0$S-SLAB',
      'xref-Bishop-Overland-08$0$TEMP',
      'xref-Bishop-Overland-08$0$A-FIXTURE',
    ]);

    const layerEntityCounts = Object.keys(byLayer).map(layer => {
      return byLayer[layer].length;
    });
    assert.deepEqual(layerEntityCounts, [
      2, 183, 31, 131, 52, 177, 199, 159, 1, 26, 87, 27, 8, 5, 1, 3, 2,
    ]);
  });
});
