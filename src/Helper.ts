import denormalise from './denormalise';
import groupEntitiesByLayer from './groupEntitiesByLayer';
import parsedCustomAttribut from './parsedCustomAttribut';
import parseString from './parseString';
import toPolylines from './toPolylines';
import toSVG from './toSVG';
import logger from './util/logger';

export default class Helper {
  private _contents : string;
  private _parsed : any;
  private _denormalised : any;
  private _groups : any;
  private _customAttributs : any;
  private _localisations : any;
  private _blockEntities : any;

  constructor(contents) {
    if (typeof contents !== 'string') {
      throw Error('Helper constructor expects a DXF string');
    }
    this._contents = contents;
    this._parsed = null;
    this._denormalised = null;
  }

  public parse() {
    this._parsed = parseString(this._contents);
    return this._parsed;
  }

  get parsed() {
    if (this._parsed === null) {
      this.parse();
    }
    return this._parsed;
  }

  public denormalise() {
    this._denormalised = denormalise(this.parsed);
    return this._denormalised;
  }

  get denormalised() {
    if (!this._denormalised) {
      this.denormalise();
    }
    return this._denormalised;
  }

  public group() {
    this._groups = groupEntitiesByLayer(this.denormalised);
  }

  get groups() {
    if (!this._groups) {
      this.group();
    }
    return this._groups;
  }

  /**
   * parse le dxf en svg
   * return le svg
   * @param ignoringLayers : la liste de layers à ignorer
   * @param ignoreBaseLayer : doit-on prendre en compte le layer 0 pour la viewbox
   */
  public toSVG(ignoringLayers : string[] = [], ignoreBaseLayer : boolean = true) {
    return toSVG(this.parsed, this.groups, ignoringLayers, ignoreBaseLayer);
  }

  public toPolylines() {
    return toPolylines(this.parsed);
  }

  public customAttribut() {
    this._customAttributs = parsedCustomAttribut(this.parsed.entities, this.denormalised);
    this._localisations = this._customAttributs.localisationEntities;
    this._blockEntities = this._customAttributs.blockEntities;
  }

  get customAttributs() {
    if (!this._customAttributs) {
      this.customAttribut();
    }
    return this._customAttributs;
  }

  get localisations() {
    if (!this._customAttributs) {
      this.customAttribut();
    }
    return this._localisations;
  }

  get blockEntities() {
    if (!this._customAttributs) {
      this.customAttribut();
    }
    return this._blockEntities;
  }
}
