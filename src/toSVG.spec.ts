import * as assert from 'assert';
import { Box2 } from 'vecks';
import * as toSVG from './toSVG';

describe('toSVG', function() {

  it('create polyline from entity', () => {
    const polylineEntity = {
      closed : true,
      id : '6F',
      layer : 'Default',
      transforms : [],
      type : 'POLYLINE',
      vertices : [{x: 0, y: 0, z: 0}, {x: 10, y: 0, z: 0}, {x: 10, y: 10, z: 0}, {x: 0, y: 10, z: 0}],
    };
    const polylineFromEntity = toSVG.polyline(polylineEntity);
    assert.ok(polylineFromEntity.element.includes('d="M0,0L10,0L10,-10L0,-10L0,0"'));
    assert.deepStrictEqual(polylineFromEntity.bbox, new Box2({x : 0, y : 0}, {x : 10, y : 10}));
  });

  it('create circle from entity', () => {
    const circleEntity = {
      closed : true,
      id : '6F',
      layer : 'Default',
      transforms : [],
      type : 'CIRCLE',
      x: 5,
      y: 5,
      z: 0,
      r: 5
    };
    const circleFromEntity = toSVG.circle(circleEntity);
    assert.ok(circleFromEntity.element.includes('<circle id="111" fill="none" cx="5" cy="-5" r="5"/>'));
    assert.deepStrictEqual(circleFromEntity.bbox, new Box2({x : 0, y : 0}, {x : 10, y : 10}));
  });

  it('create full ellipse from entity', () => {
    const ellipseEntity = {
      closed : true,
      id : '6F',
      layer : 'Default',
      transforms : [],
      type : 'ELLIPSE',
      x : 5,
      y : 5,
      z : 0,
      axisRatio : 0.5588235294117645,
      endAngle : 6.283185307179586,
      startAngle : 0,
      majorX : -50,
      majorY : 30,
      majorZ : 0,
      colorNumber : 256
    };
    const ellispeFromEntity = toSVG.ellipse(ellipseEntity);
    assert.ok(ellispeFromEntity.element.includes('rotate(149.03624346792648 5 5)'));
    assert.ok(ellispeFromEntity.element.includes('<ellipse cx="5" cy="5" rx="58.309518948453004" ry="32.58473117707667" />'));
    assert.deepStrictEqual(ellispeFromEntity.bbox, new Box2({x: -61.76470588235294, y: -52.94117647058823}, {x: 71.76470588235294, y: 7.058823529411775}));
  });

  it('create partial ellipse from entity', () => {
    const arcEntity = {
      axisRatio: 0.5205479452054796,
      colorNumber: 256,
      endAngle: 3.859405532016142,
      id: '4E',
      layer: '0',
      lineTypeName: 'ByLayer',
      majorX: 30,
      majorY: -80,
      majorZ: 0,
      startAngle: 0.6113462377070888,
      type: 'ELLIPSE',
      x : 130,
      y : 180,
      z : 0,
      transforms : []
    };
    const arcFromEntity = toSVG.ellipse(arcEntity);
    assert.ok(arcFromEntity.element.includes('d="M 80.0118507690748 229.98814923092522 A 85.44003745317531 44.47563593452963 -69.44395478041653 1 0 178.46861001153454 123.45328831987638"'));
    assert.deepStrictEqual(arcFromEntity.bbox, new Box2({x: 58.356164383561634, y: 115.6164383561644}, {x: 201.64383561643837, y: 275.6164383561644}));
  });

  it('create arc from entity', () => {
    const arcEntity = {
      colorNumber : 256,
      endAngle : 0.19739555984988089,
      id : '4F',
      layer : '0',
      lineTypeName : 'ByLayer',
      r : 50,
      startAngle : 3.141592653589793,
      type : 'ARC',
      x : 50,
      y : 140,
      transforms : []
    };
    const arcFromEntity = toSVG.arc(arcEntity);
    assert.ok(arcFromEntity.element.includes('d="M 0 -140 A 50 50 0 1 0 99.02903378454602 -149.80580675690922"'));
    assert.deepStrictEqual(arcFromEntity.bbox, new Box2({x : 0, y : 90}, {x : 100, y : 190}));
  });

  it('create partial arc from entity', () => {
    const arcEntity = {
      colorNumber : 256,
      endAngle : 0.540419500270584,
      id : '50',
      layer : '0',
      lineTypeName : 'ByLayer',
      r : 58.309518948453,
      startAngle : 5.355890089177973,
      type : 'ARC',
      x : 0,
      y : 210,
      transforms : []
    };
    const arcFromEntity = toSVG.arc(arcEntity);
    assert.ok(arcFromEntity.element.includes('d="M 34.985711369071744 -163.35238484123755 A 58.309518948453 58.309518948453 0 0 0 49.99999999999999 -240"'));
    assert.deepStrictEqual(arcFromEntity.bbox, new Box2({x: -58.309518948453, y: 151.690481051547}, {x: 58.309518948453, y: 268.309518948453}));
  });

  it('create simple text', () => {
    const textEntity = {
      blockId: '2F6',
      height: 2,
      layer: 'DEFAULT',
      rotation: 45,
      styleName: 'STYLE_1',
      textValue: 'SIMPLE TEXT',
      transforms: [],
      type: 'TEXT',
      x: 1,
      y: 1,
      z: 0,
    };
    const textFromEntity = toSVG.text(textEntity, [126, 126, 126], {STYLE_1 : {type: 'STYLE', name: 'STYLE_1', fontFamily: 'Arial Narrow'}});
    assert.ok(textFromEntity.element.includes('transform="rotate(-45, 1, -1)"'));
    assert.ok(textFromEntity.element.includes('x="1"'));
    assert.ok(textFromEntity.element.includes('y="-1"'));
    assert.ok(textFromEntity.element.includes('font-family="Arial Narrow"'));
    assert.ok(textFromEntity.element.includes('fill="rgb(126,126,126)"'));
    assert.ok(textFromEntity.element.includes('>SIMPLE TEXT</text>'));
  });

  it('create mutiple line text', () => {
    const textEntity = {
      attachmentPoint: 1,
      drawingDirection: 5,
      id: '285',
      layer: 'DEFAULT',
      lineSpacingFactor: 1,
      lineSpacingStyle: 1,
      nominalTextHeight: 10,
      refRectangleWidth: 100,
      string: 'line1\\Pline2\\Pline3\\Pline4',
      transforms: [],
      type: 'MTEXT',
      xAxisX: 0.0,
      xAxisY: 0.2,
      xAxisZ: 0,
      x: 10,
      y: 10,
      z: 0,
    };
    const textFromEntity = toSVG.mtext(textEntity, [126, 126, 126], {STYLE_1 : {type: 'STYLE', name: 'STYLE_1', fontFamily: 'ARIAL'}});
    assert.ok(textFromEntity.element.includes('transform="rotate(-90, 10, -10)"'));
    assert.ok(textFromEntity.element.includes('x="10"'));
    assert.ok(textFromEntity.element.includes('y="-10"'));
    assert.ok(textFromEntity.element.includes('font-size="10"'));
    assert.ok(textFromEntity.element.includes('font-family="ARIAL"'));
    assert.ok(textFromEntity.element.includes('fill="rgb(126,126,126)"'));
    assert.ok(textFromEntity.element.includes('<tspan x="10" dy="10"><tspan >line1</tspan></tspan><tspan x="10" dy="10"><tspan >line2</tspan></tspan><tspan x="10" dy="10"><tspan >line3</tspan></tspan><tspan x="10" dy="10"><tspan >line4</tspan></tspan>'));
  });
});
