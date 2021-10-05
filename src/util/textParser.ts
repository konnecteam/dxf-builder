enum dxfColorEnum {
  'red' = 1,
  '#FFFF00' = 2, // yellow
  'green' = 3,
  '#00FFFF' = 4, // cyan
  'blue' = 5,
  '#FF00FF' = 6, // magenta
  'white' = 7
}

enum dxfVAlignEnum {
  'baseline' = 0,
  '#middle' = 1,
  'hanging' = 2,
}

interface ICodeText {
  textValue : string;
  codeValue : string[];
}

/**
 * Class pour parser les textes dxf en prenant en compte les formatages
 */
export class TextParser {

  /** taille du text de base */
  private _textHeight : number = 0;

  public readonly TEXTDECORATION = 'text-decoration';

  /**
   * Map des correspondances des traitements
   */
  private readonly _CORRESPONDANCE : {[style : string] : (token : string) => any } = {
    '\\L' : (token : string) => { // underline
      return {[this.TEXTDECORATION] : 'underline'};
    },
    '\\O' : (token : string) => { // overline
      return  {[this.TEXTDECORATION] : 'overline'};
    },
    '\\Q' : (token : string) => {
      //rotation de arg degré
      return {style : `font-style:oblique ${token}deg;`};
    },
    '\\H' : (token : string) => { // hauteur
      return {style : `font-size: ${this._textHeight * parseFloat(token.slice(0, -1))};`};
    },
    '\\C' : (token : string) => {
      //color : 1 : red, 2 : yellow, 3 : green, 4 : cyan, 5 : blue, 6 : magenta, 7 : white
      const colorValue = dxfColorEnum[token];
      return {style : `fill: ${colorValue};`};
    },
    '\\c' : (token : string) => { // couleurs non primaires
      const colorValue = parseFloat(token).toString(16); // => il faut passer la couleur en hexa
      return {style : `fill: #${colorValue};`};
    },
    '\\T' : (token : string) => {
      return {'letter-spacing' : token};
    },
    '\\~' : (token : string) => {
      return '&nbsp';
      // NBSP,
    },
    '\\S' : (token : string) => { // exposant, index ou fraction
      let returnValue = '';
      const match = this._FRAGMENTSREGEX.exec(token);
      let delimiter : string;
      if (match && match[2]) {
        delimiter = match[2];
        if (delimiter === '^') {
          if (match[1].trim() === '' && match[3]) { //index
            returnValue += `<tspan style="baseline-shift: sub">${match[3]}</tspan>`;
          } else if (match[3].trim() === '' && match[1]) { // exposant
            returnValue += `<tspan style="baseline-shift: super">${match[1]}</tspan>`;
          } else { // fraction
            returnValue += `<tspan>${match[1]}/${match[3].trim()}</tspan>`;
          }
        } else if (delimiter === '#' || delimiter === '/') { // autres fractions possibles
          returnValue += `<tspan>${match[1]}/${match[3].trim()}</tspan>`;
        } else {
          returnValue = '';
        }
      }
      return returnValue;
    },
    '\\A' : (token : string) => {
      // alignement 0 = bottom, 1 = center, 2 = top
      const align = dxfVAlignEnum[token];
      return {'alignment-baseline' : align};
    },
    '\\K' : (token : string) => { // texte barré
      return {[this.TEXTDECORATION] : 'line-through'};
    },
    '\\W' : (token : string) => {
      return this._skipFormating(token);
    },
    '\\f' : (token : string) => {
      return this._skipFormating(token);
    },
    '\\N' : (token : string) => {
      return this._skipFormating(token);
    },
    '\\X' : (token : string) => {
      return this._skipFormating(token);
    },
  };

  /** match les entités d'effet de text en \S  */
  private readonly _SREGEX = /\\S.+;/;

  /** match les différentes parties d'une entité \S */
  private readonly _FRAGMENTSREGEX = /([\w ]*)(\^|\/|\#)([\w ]*)/gm;

  /** match tous les effets à traiter */
  private readonly _GLOBALEFFECTSREGEX = /\\(L|O|A[0-2]|W[0-9\.]+|S[\w ]*\^[\w ]*|Q[0-9]+|X|N|f|K|H[0-9\.]+x|C[0-9]|c[0-9]*);?([^\\]*)/g;

  /**
   * match les différentes parties d'un effet
   * accessibilité aux groupes d'effets et de textes correspondant
   */
  private readonly _FRAGMENTEFFECTSREGEX = /\\(L|O|A[0-2]|W[0-9\.]+|S[\w ]*\^[\w ]*|Q[0-9]+|X|N|f|K|H[0-9\.]+x|C[0-9]|c[0-9]*);?([^\\]*)/;


  constructor(textHeight : number) {
    this._textHeight = textHeight;
  }

  /**
   * Parse le text en prenant en compte le formatting
   * @param textToParse le texte à parser
   */
  public parseText(textToParse : string) : string {
    let parsedText = '';
    const sections = this._separateSections(textToParse);
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      parsedText += this._parseSymboles(section);
    }
    return parsedText;
  }

  /**
   * Remplace les entités qui demandent un traitement spécial par leur interprétation
   * @param textToParse le text à traiter
   */
  public replacePlainEntities(textToParse : string) {
    // on remplace les nbsp
    textToParse = textToParse.replace(/\\~/g, '&nbsp');
    // on remplace les \S
    const match = this._SREGEX.exec(textToParse);
    if (match) {
      textToParse = textToParse.replace(this._SREGEX, this._CORRESPONDANCE['\\S'](match[0].substring(2)));
    }
    return textToParse;
  }


  /**
   * Séparer le texte à parser en plusieurs parties, délimitées par les {}
   * @param textToParse le texte à parser
   */
  private _separateSections(textToParse : string) : string[] {
    const tokens = textToParse.split(/([\{\}])/);
    const result = [];
    tokens.forEach(token => {
      if (!token || token === '{' || token === '}') {
        return;
      } else {
        result.push(token);
      }
    });
    return result;
  }

  /**
   * Applique les différents styles sur le text associé
   * @param token
   */
  private _parseSymboles(token : string) : string {
    const effectsToAplly = [];
    const styleAndText = this._parseTextCode(token);
    const codeValueLength = styleAndText.codeValue.length;
    for (let i = 0; i < codeValueLength; i++) {
      // Pour chaque effet de text, on va le lire et l'appliquer
      const styleCode = styleAndText.codeValue[i];
      const style = styleCode.substring(0, 2); // => l'effet à appliquer
      const code = styleCode.substring(2); // les parametres qui lui sont liés
      if (style in this._CORRESPONDANCE) {
        // push l'effet
        effectsToAplly.push(this._CORRESPONDANCE[style](code));
      }
    }
    return '<tspan ' + this._compileEffects(effectsToAplly) + '>' + styleAndText.textValue + '</tspan>';
  }

  /**
   * Parse le texte passé en parametre pour distinguer le code et le texte sur lequel l'appliquer
   * @param textToParse le text à traiter
   */
  private _parseTextCode(textToParse : string) : ICodeText {
    const parameterValueIndex = textToParse.lastIndexOf(';');
    const returnValue : ICodeText = {codeValue : [], textValue : textToParse};
    if (parameterValueIndex !== -1) {
      returnValue.codeValue = textToParse.substring(0, parameterValueIndex).split(';'); // => les codes et paramtres des effets à appliquer
      returnValue.textValue = textToParse.substring(parameterValueIndex + 1); // => le texte sur lesquels les appliquer
    }
    return returnValue;
  }

  /**
   * retourne le text sans les infos de format
   * A utiliser pour ignorer les formats qu'on ne peut pas rendre en svg
   * @param text le text à formater
   */
  private _skipFormating(text : string) : string {
    let returnValue = '';
    const textCode = this._parseTextCode(text);
    returnValue += `<tspan>${textCode.textValue}</tspan>`;
    return returnValue;
  }

  /**
   * distribue les styles au texte qui correspond pour pouvoir appliquer plusieurs styles à un texte et gérer les retours à la ligne embetants
   * @param str le texte à traiter
   */
  public distributeStyles(str : string) {
    let i;
    let returnValue = '';
    const sections = this._separateSections(str);
    for (let j = 0; j < sections.length; j++) {
      let section = sections[j];
      section = section.replace(/\\P/g, '#P#');
      const matches = section.match(this._GLOBALEFFECTSREGEX);
      let finalString = '';
      if (matches && matches.length > 0) {
        const styleAndText = [];
        let styleToApply = '';
        for (i = 0; i < matches.length; i++) {
          const style = matches[i].match(this._FRAGMENTEFFECTSREGEX)[1];
          const text = matches[i].match(this._FRAGMENTEFFECTSREGEX)[2];
          styleAndText.push({style, text});
        }
        for (i = 0; i < styleAndText.length; i++) {
          styleToApply += `\\${styleAndText[i].style};`;
          // on incorpore les retours à la lignes pour ne pas perdre les effets de textes d'une ligne à l'autre et on redonne les effets
          if (styleAndText[i].text.match(/#P#/)) {
            styleAndText[i].text.split('#P#').forEach((text, index) => {
              if (index > 0) {
                finalString += '\\P';
              }
              finalString += `{${styleToApply}${text}}`;
            });
          } else {
            finalString += `{${styleToApply}${styleAndText[i].text}}`;
          }
        }
      } else {
        finalString = section.replace(/#P#/g, '\\P');
      }
      returnValue += finalString;
    }
    return returnValue;
  }

  /**
   * Combine les effets de text ayant le meme atribut en svg
   * => regroupe tous les styles ensembles, tous les fill, ect...
   * @param effects le tableau des effets
   */
  private _compileEffects(effects : any[]) : string {
    const mergedEffectsObject = {};
    for (let i = 0; i < effects.length; i++) {
      const effect = effects[i];
      const key = Object.keys(effect)[0];
      if (!mergedEffectsObject[key]) {
        mergedEffectsObject[key] = effect[key];
      } else {
        // on additionne les effets qui ont le meme attribut
        mergedEffectsObject[key] += ' ' + effect[key];
      }
    }

    // si plusieurs couleurs sont définies dans le meme attribut fill, aucune ne marche
    // on fait en sorte de garder seulement la dernier, qui est celle que l'on veut afficher)
    if (mergedEffectsObject['fill']) {
      const indexOfTrueColor = mergedEffectsObject['fill'].lastIndexOf(' ');
      if (indexOfTrueColor !== -1) {
        mergedEffectsObject['fill'] = mergedEffectsObject['fill'].substring(indexOfTrueColor);
      }
    }

    let returnStyle = '';
    const keys = Object.keys(mergedEffectsObject);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      returnStyle += `${key}="${mergedEffectsObject[key]}" `;
    }
    return returnStyle;
  }
}
