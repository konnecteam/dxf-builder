import * as assert from 'assert';
import { Box2 } from 'vecks';
import * as hatchToSVG from './hatchToSVG';

describe('hatchToSVG', function() {

  it('polylineFiller', () => {
    const entity = {
      closed: 1,
      numberOfVertices: 4,
      type: 'POLYLINE',
      vertices: [{x: 0, y: 5}, {x : 0, y : 0}, {x : 5, y : 0}, {x : 5, y : 5}],
      transforms: [{
        scaleX: 1,
        scaleY: 1
      }]
    };
    const fill = hatchToSVG.polylineFiller(entity);
    assert.ok(fill.element.includes('d="M0,-5L0,0L5,0L5,-5L0,-5"'));
    assert.equal(fill.vertices.length, 5);
    assert.ok(fill.bbox.height === 5 && fill.bbox.width === 5);
  });

  it('transformSegmentsToShapes', () => {
    const e1 = {
      hasBulge: true,
      numberOfVertices: 2,
      type: 'LINE',
      vertices: [{x: 10, y: 10, bulge: 0},
      {x: 10, y: 10, bulge: 0.25}]
    };
    const transform = {
      x: 1,
      y: 1,
    };
    const transformedSegmentsToShapes = hatchToSVG.transformSegmentsToShapes([e1], [transform]);
    assert.ok(transformedSegmentsToShapes.length === 1);
    assert.equal(transformedSegmentsToShapes.join(';'), '11,-11,11,-11,11,-11');
  });

  it('getBBox', () => {
    const points = ['0, 0', '0, 5', '5, 0', '5, 5'];
    const bbox = hatchToSVG.getBBox(points);
    assert.equal(bbox.height, 5);
    assert.equal(bbox.width, 5);
  });

  it('isIncludeInShapes true', () => {
    const shapes = [{bbox : new Box2({x : 0, y : 0}, {x : 10, y : 10}), shape : []}];
    const point = {x: 5, y: 5};
    const shapeId = hatchToSVG.isIncludeInShapes(shapes, point);
    assert.equal(shapeId, 0);
  });

  it('isIncludeInShapes false', () => {
    const shapes = [{bbox : new Box2({x : 0, y : 0}, {x : 10, y : 10}), shape : []}];
    const point = {x: -1, y: -1};
    const shapeId = hatchToSVG.isIncludeInShapes(shapes, point);
    assert.equal(shapeId, '-1');
  });

  it('buildMask', () => {
    const e1 = {shape: ['0, 0', '0, 5', '5, 0', '5, 5'], box: new Box2({x : 0, y : 0}, {x : 5, y : 5}), container : true};
    const e2 = {shape: ['0, 0', '0, 10', '10, 0', '10, 10'], box: new Box2({x : 0, y : 0}, {x : 10, y : 10}), inside : 0};
    const hatchElement = hatchToSVG.buildMask([[e1], [e2]], [130, 0, 130]);
    assert.ok(hatchElement.includes('<mask') && hatchElement.includes('</mask>'));
    assert.ok(hatchElement.includes('<path fill="rgb(130, 0, 130)" mask="url'));
  });

  it('createPathForMask', () => {
    const vertices = ['0, 0', '0, 5', '5, 0', '5, 5'];
    const transformedVertices = hatchToSVG.createPathForMask(vertices);
    assert.ok(transformedVertices.includes('d="M0, 0L0, 5L5, 0L5, 5"'));
  });

  it('calculateCoordFromMatrix', () => {
    const vertices = [[0, 0], [0, 5], [5, 0], [5, 5]];
    const matrices = [['1', '0', '0', '1', '0', '0']];
    const calculatedCoordFromMatrix = hatchToSVG.calculateCoordFromMatrix(vertices, matrices);
    assert.ok(calculatedCoordFromMatrix.length === 4);
    assert.ok(calculatedCoordFromMatrix.join(';') === '0,0;0,-5;5,0;5,-5');
  });

});
