import * as assert from 'assert';
import {TextParser} from './textParser';


function parseText(textToParse : string, height : number = 20) {
  const tp = new TextParser(height);
  return tp.parseText(textToParse);
}

function parsePlainEntities(textToParse : string, height : number = 20) {
  const tp = new TextParser(height);
  return tp.replacePlainEntities(textToParse);
}

describe('Text Parser', () => {

  it('parse over', () => {
    const parsedText = parseText('{\\O;over}');
    assert.equal('<tspan text-decoration="overline" >over</tspan>', parsedText);
  });
  it('parse under', () => {
    const parsedText = parseText('{\\L;under}');
    assert.equal('<tspan text-decoration="underline" >under</tspan>', parsedText);
  });
  it('parse rotation', () => {
    const parsedText = parseText('{\\Q30;rotation}');
    assert.equal(`<tspan style="font-style:oblique 30deg;" >rotation</tspan>`, parsedText);
  });
  it('parse height', () => {
    const parsedText = parseText('{\\H2x;height}');
    assert.equal(`<tspan style="font-size: 40;" >height</tspan>`, parsedText);
  });
  it('parse primary color', () => {
    const parsedText = parseText('{\\C2;yellow}');
    assert.equal(`<tspan style="fill: #FFFF00;" >yellow</tspan>`, parsedText);
  });

  it('parse color', () => {
    const parsedText = parseText('{\\c3093151;kind of blue}');
    assert.equal(`<tspan style="fill: #2f329f;" >kind of blue</tspan>`, parsedText);
  });
  it('parse nbsp', () => {
    const parsedText = parsePlainEntities('\\~');
    assert.equal('&nbsp', parsedText);
  });
  it('parse exponent', () => {
    const parsedText = parsePlainEntities('\\Sexponent^;');
    assert.equal(`<tspan style="baseline-shift: super">exponent</tspan>`, parsedText);
  });
  it('parse index', () => {
    const parsedText = parsePlainEntities('\\S^index;');
    assert.equal(`<tspan style="baseline-shift: sub">index</tspan>`, parsedText);
  });
  it('parse fraction', () => {
    const parsedText = parsePlainEntities('\\Snumerator^denominator;');
    assert.equal(`<tspan>numerator/denominator</tspan>`, parsedText);
  });
  it('parse alignement text', () => {
    const parsedText = parseText('{\\A0;bottom}');
    assert.equal('<tspan alignment-baseline="baseline" >bottom</tspan>', parsedText);
  });
  it('parse multiple text', () => {
    const parsedText = parseText('{\\c3093151;kind of blue} {\\L;underline}');
    assert.equal(`<tspan style="fill: #2f329f;" >kind of blue</tspan><tspan > </tspan><tspan text-decoration="underline" >underline</tspan>`, parsedText);
  });
  it('parse simple text', () => {
    const parsedText = parseText('I am a text without format');
    assert.equal(`<tspan >I am a text without format</tspan>`, parsedText);
  });
  it('parse weird A formatting behavior', () => {
    const parsedText = parseText('\\A1;Weird A1 text behavior');
    assert.equal(`<tspan alignment-baseline="#middle" >Weird A1 text behavior</tspan>`, parsedText);
  });

  it('distribute style', () => {
    const tp = new TextParser(20);
    const distributedStyle = tp.distributeStyles('\\C3;le#P#l#P#s\\L\\Oauce');
    assert.equal('{\\C3;le}\\P{\\C3;l}\\P{\\C3;s}{\\C3;\\L;}{\\C3;\\L;\\O;auce}', distributedStyle);
  });
});
