import * as assert from 'assert';
import * as fs from 'fs';
import { join } from 'path';
import parseString from '../parseString';

const dxfContents = fs.readFileSync(join(__dirname, '../../test/resources/lines.dxf'), 'utf-8');

describe('header', () => {
  it('can parse the header', () => {
    const parsed = parseString(dxfContents);
    assert.deepEqual(parsed.header, {
      extMin: {
        x: 0,
        y: 0,
        z: 0,
      },
      extMax: {
        x: 100,
        y: 99.2820323027551,
        z: 0,
      },
      author: '',
      comments: '',
      creationDate: '',
      drawingUnit: 'mm',
      lastSaveBy: '',
      latitude: 1,
      longitude: 1,
      name: '',
      title: '',
      tracewid: 15.68,
      updateDate: '',
    });
  });
});
