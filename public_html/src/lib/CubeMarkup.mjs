/* @(#)CubeMarkup.mjs
 * Copyright (c) 2020 Werner Randelshofer, Switzerland. MIT License.
 */
import CubeAttributes from './CubeAttributes.mjs';
import ScriptNotation from './ScriptNotation.mjs';

let module = {
    log: (true && console != null && console.log != null) ? console.log : () => {
    },
    info: (true && console != null && console.info != null) ? console.info : () => {
    },
    warning: (true && console != null && console.warn != null) ? console.warn : () => {
    },
    error: (true && console != null && console.error != null) ? console.error : () => {
    }
}

let ScriptType = Object.freeze({
    GENERATOR:"generator",
    SOLVER:"solver"
    
});

let parseSymbol;
{
    let nameToSymbolMap = new Map();
    for (let key in ScriptNotation.Symbol) {
        let s = ScriptNotation.Symbol[key];
        if (typeof(s) != "function") {
            nameToSymbolMap.set(s.getName(), s);
        }
    }
    parseSymbol = function(string) {
        return nameToSymbolMap.get(string);
    }
}
let parseSyntax;
{
    let nameToSyntaxMap = new Map();
    for (let key in ScriptNotation.Syntax) {
        let s = ScriptNotation.Syntax[key];
        if (typeof(s) != "function") {
            nameToSyntaxMap.set(s, s);
        }
    }
    parseSyntax = function(string) {
        return nameToSyntaxMap.get(string);
    }
}

let parseAxis = function (string) {
    switch (string) {
        case "x":
            return 0;
        case "y":
            return 1;
        case "z":
            return 2;
        default:
            module.warning("Illegal axis: "+string);
            return 0;
    }
}

let parseScriptType = function (string) {
    switch (string) {
        case "generator":
            return ScriptType.GENERATOR;
        case "solver":
            return ScriptType.SOLVER;
        default:
            module.warning("Illegal script type: "+string);
            return ScriptType.GENERATOR;
    }
}
let parseAngle = function (string) {
    return Math.round(parseInt(string) / 90);
}

/** Parses a comma or space separated list into an array.
 *
 *  EBNF: (|)=choice, []=optional, {}=zero or more, (* *)=comment
 *
 *  list = value, { [','] , {' '} , value } ;
 *  value = (* word *) ;
 */
let parseCommaOrSpaceSeparatedList = function (str) {
    let map = [];
    if (str == null)
        return map;
    let tokens = str.split(/(\s|,)+/);
    let elementIndex = 0;
    for (let i = 0; i < tokens.length; ) {
        if (tokens[i].match(/^(\s|,)+$/)) {
            // found a separator
            i++; // consume separator
        } else {
            // found a value
            let stringValue = tokens[i];
            map[elementIndex] = stringValue;
            i++; // consume value
            elementIndex++; // increase element index
        }
    }
    return map;
}
/** Parses a word list into an array.
 *
 *  EBNF: (|)=choice, []=optional, {}=zero or more, (* *)=comment
 * 
 *  list = value, { [' '] , {' '} , value } ;
 *  value = (* word *) ;
 */
let parseWordList = function (str) {
    let map = [];
    if (str == null)
        return map;
    let tokens = str.split(/(\s+)/);
    let elementIndex = 0;
    for (let i = 0; i < tokens.length; ) {
        if (tokens[i].match(/^\s+$/)) {
            // found a separator
            i++; // consume separator
        } else {
            // found a value
            let stringValue = tokens[i];
            map[elementIndex] = stringValue;
            i++; // consume value
            elementIndex++; // increase element index
        }
    }
    return map;
}
/**
 * Parses a layer list and turns it into a layer mask.
 */
let parseLayerList = function (string) {
    let mask=0;
    for (let word of parseCommaOrSpaceSeparatedList(string)) {
        mask |= 1<<parseInt(word - 1);
    }
    return mask;
}

let parseBoolean = function (string) {
    return string.toLowerCase() == "true" || string == "1";
}
/** Parses an ARGB hex string into an array with the values [r,g,b,a].*/
let parseArgbColor = function (string) {
    let v=parseInt("0x"+string);
    return [(v>>>16)&0xff,(v>>>8)&0xff,v&0xff,(v>>>24)&0xff];
}
/** Parses a #RGB hex string into an array with the values [r,g,b,a].*/
let parseRgbColor = function (string) {
    let v=parseInt("0x"+string.substring(1));
    return [(v>>>16)&0xff,(v>>>8)&0xff,v&0xff,255];
}
class CubeKind {
    constructor(name,layerCount,partCount,stickerCount,stickerCountPerFace) {
        this.name=name;
        this.layerCount=layerCount;
        this.partCount=partCount;
        this.stickerCount=stickerCount;
        this.stickerCountPerFace=stickerCountPerFace;//Array
    }
    getName() {
        return this.name;
    }
    getLayerCount() {
        return this.layerCount;
    }
    getPartCount() {
        return this.partCount;
    }
    getStickerCount() {
        return this.stickerCount;
    }
    getStickerCountPerFace() {
        return this.stickerCountPerFace;
    }
}
const CubeKindEnum = Object.freeze({
    POCKET:new CubeKind("2x2 Pocket Cube", 2,4,24,[4,4,4,4,4,4]),
    RUBIK:new CubeKind("3x3 Rubik's Cube", 3,9,54,[9,9,9,9,9,9]),
    REVENGE:new CubeKind("4x4 Revenge Cube", 4,57,96,[16,16,16,16,16,16]),
    PROFESSOR:new CubeKind("5x5 Professor Cube", 5,99,150,[25,25,25,25,25,25]),
    VCUBE_6:new CubeKind("6x6 V-Cube", 6,153,216,[36,36,36,36,36,36]),
    VCUBE_7:new CubeKind("7x7 V-Cube", 7,219,294,[49,49,49,49,49,49]),
    BARREL:new CubeKind("3x3 Rubik's Barrel", 3,9,42,[6,6,6,6,9,9]),
    DIAMOND:new CubeKind("3x3 Rubik's Diamond", 3,9,26,[6,6,6,6,1,1]),
    CUBOCTAHEDRON:new CubeKind("3x3 Rubik's Cuboctahedron", 3,9,86,[9,9,9,9,9,9,4,4,4,4,4,4,4,4]),
    CUBE_6:new CubeKind("6x6 Cube", 6,153,216,[36,36,36,36,36,36]),
    CUBE_7:new CubeKind("7x7 Cube", 7,219,294,[49,49,49,49,49,49]),
    });
const CubeKindMap = new Map([
    ["2x2 Pocket Cube",CubeKindEnum.POCKET] ,["PocketCube",CubeKindEnum.POCKET] ,["Pocket",CubeKindEnum.POCKET] ,["2x2 Cube",CubeKindEnum.POCKET],
    ["3x3 Rubik's Cube",CubeKindEnum.RUBIK] ,["RubiksCube",CubeKindEnum.RUBIK] ,["Rubik",CubeKindEnum.RUBIK] ,["3x3 Cube",CubeKindEnum.RUBIK] ,["Cube",CubeKindEnum.RUBIK],
    ["4x4 Revenge Cube",CubeKindEnum.REVENGE] ,["RevengeCube",CubeKindEnum.REVENGE] ,["Revenge",CubeKindEnum.REVENGE] ,["4x4 Cube",CubeKindEnum.REVENGE],
    ["5x5 Professor Cube",CubeKindEnum.PROFESSOR] ,["ProfessorCube",CubeKindEnum.PROFESSOR] ,["Professor",CubeKindEnum.PROFESSOR] ,["5x5 Cube",CubeKindEnum.PROFESSOR],
    ["6x6 V-Cube",CubeKindEnum.VCUBE_6] ,["V-Cube 6",CubeKindEnum.VCUBE_6] ,["VCube6",CubeKindEnum.VCUBE_6] ,["6x6 V-Cube",CubeKindEnum.VCUBE_6],
    ["7x7 V-Cube",CubeKindEnum.VCUBE_7] ,["V-Cube 7",CubeKindEnum.VCUBE_7] ,["VCube7",CubeKindEnum.VCUBE_7] ,["7x7 V-Cube",CubeKindEnum.VCUBE_7],
    ["3x3 Rubik's Barrel",CubeKindEnum.BARREL] ,["RubiksBarrel",CubeKindEnum.BARREL] ,["Barrel",CubeKindEnum.BARREL] ,["3x3 Barrel",CubeKindEnum.BARREL],
    ["3x3 Rubik's Diamond",CubeKindEnum.DIAMOND] ,["RubiksDiamond",CubeKindEnum.DIAMOND] ,["Diamond",CubeKindEnum.DIAMOND] ,["3x3 Diamond",CubeKindEnum.DIAMOND],
    ["3x3 Rubik's Cuboctahedron",CubeKindEnum.CUBOCTAHEDRON] ,["RubiksCuboctahedron",CubeKindEnum.CUBOCTAHEDRON] ,["Cuboctahedron",CubeKindEnum.CUBOCTAHEDRON] ,["Octahedron",CubeKindEnum.CUBOCTAHEDRON] ,["3x3 Octahedron",CubeKindEnum.CUBOCTAHEDRON],
    ["6x6 Cube",CubeKindEnum.CUBE_6] ,["Cube 6",CubeKindEnum.CUBE_6] ,["Cube6",CubeKindEnum.CUBE_6],
    ["7x7 Cube",CubeKindEnum.CUBE_7] ,["Cube 7",CubeKindEnum.CUBE_7] ,["Cube6",CubeKindEnum.CUBE_7]
]);


/**
 * Holds the data that can be stored in a CubeMarkup XML file.
 * @type type
 */
class CubeMarkupData {
    constructor() {
        this.cubes = new Array();
        this.notations = new Array();
        this.scripts = new Array();
        this.texts = new Array();
    }
    
    addCube(obj) {
        this.cubes.push(obj);
    }
    addNotation(obj) {
        this.notations.push(obj);
    }
    addScript(obj) {
        this.scripts.push(obj);
    }
    addText(obj) {
        this.texts.push(obj);
    }
    
    getCubes() {
        return this.cubes;
    }
    getNotations() {
        return this.notations;
    }
    getScripts() {
        return this.scripts;
    }
    getTexts() {
        return this.texts;
    }
    findNotation(name) {
        for (let n of this.notations) {
            if (n.getName()==name) {
                return n;
            }
        }
        return null;
    }
    findCube(name) {
        for (let n of this.cubes) {
            if (n.getName()==name) {
                return n;
            }
        }
        return null;
    }
    findScript(name) {
        for (let n of this.scripts) {
            if (n.getName()==name) {
                return n;
            }
        }
        return null;
    }
    findText(name) {
        for (let n of this.texts) {
            if (n.getTitle()==name) {
                return n;
            }
        }
        return null;
    }
}

/**
 * Holds Cube data. 
 */
class CubeData {
    constructor() {
        this.kind = CubeKindEnum.RUBIK;
        this.default = false;
        this.id = null;
        this.name = null;
        this.author=null;
        this.description=null;
        this.date=null;
        
        // FIXME we should store the actual attributes data and create CubeAttributes on demand
        //          the size of the cube attributes changes when we change the cube kind!
        this.attributes = new CubeAttributes.CubeAttributes(9,54,[9,9,9,9,9,9]);
    }
    getAttributes(){
        return this.attributes;
    }
    setId(newValue) {
        this.id=newValue;
    }
    getId() {
        return this.id;
    }
    getName() {
        return this.name;
    }
    setName(newValue) {
        this.name=newValue;
    }
    setAuthor(newValue) {
        this.author=newValue;
    }
    getDescription() {
        return this.description;
    }
    setDescription(newValue) {
        this.description=newValue;
    }
    setDate(newValue) {
        this.date=newValue;
    }
    setKind(kind) {
        this.kind=kind;
        this.attributes=new CubeAttributes.CubeAttributes(kind.getPartCount(),kind.getStickerCount(),kind.getStickerCountPerFace());
    }
    getKind() {
        return this.kind;
    }
      
    setDefault(newValue) {
        this.default=newValue;
    }
    getStickersImageUrl() {
        return this.attributes.getStickersImageUrl();
    }
}
/**
 * Holds Notation data. 
 */
class NotationData {
    constructor() {
        this.id=null;
        this.default=false;
        this.name = null;
        this.author=null;
        this.description=null;
        this.date=null;
        
        // FIXME we should store the actual notation data and create ScriptNotation on demand
        this.notation=new ScriptNotation.Notation();
    }
    setDefault(newValue) {
        this.default=newValue;
    }
    setId(newValue) {
        this.id=newValue;
    }
    getId() {
        return this.id;
    }
    getName() {
        return this.name;
    }
    setLayerCount(newValue) {
        this.notation.setLayerCount(newValue);
    }
    getLayerCount() {
        return this.notation.getLayerCount();
    }
    setName(newValue) {
        this.name=newValue;
    }
    setAuthor(newValue) {
        this.author=newValue;
    }
    getDescription() {
        return this.description;
    }
    setDescription(newValue) {
        this.description=newValue;
    }
    setDate(newValue) {
        this.date=newValue;
    }
    
    getNotation() {
        return this.notation;
    }
    
}
/**
 * Holds Script data. 
 */
class ScriptData {
    constructor() {
        this.id=null;
        this.name = null;
        this.author=null;
        this.description=null;
        this.date=null;
        this.scriptType=ScriptType.GENERATOR;
        this.cube=null;
        this.notatiion=null;
    }
    setId(newValue) {
        this.id=newValue;
    }
    getId() {
        return this.id;
    }
    setCube(newValue) {
        this.cube=newValue;
    }
    getCube() {
        return this.cube;
    }
    setNotation(newValue) {
        this.notation=newValue;
    }
    getNotation() {
        return this.notation;
    }
    setScriptType(newValue) {
        this.scriptType=newValue;
    }
    getScriptType() {
        return this.scriptType;
    }
    setName(newValue) {
        this.name=newValue;
    }
    getName() {
        return this.name;
    }
    setAuthor(newValue) {
        this.author=newValue;
    }
    setSource(newValue) {
        this.source=newValue;
    }
    getSource() {
        return this.source;
    }
    setDescription(newValue) {
        this.description=newValue;
    }
    getDescription() {
        return this.description;
    }
    setDate(newValue) {
        this.date=newValue;
    }
}
/**
 * Holds Text data. 
 */
class TextData {
    constructor() {
        this.id=null;
        this.name = null;
        this.author=null;
        this.title=null;
        this.body=null;
        this.date=null;
    }
    setId(newValue) {
        this.id=newValue;
    }
    getId() {
        return this.id;
    }
    setName(newValue) {
        this.name=newValue;
    }
    setAuthor(newValue) {
        this.author=newValue;
    }
    setTitle(newValue) {
        this.title=newValue;
    }
    getTitle() {
        return this.title;
    }
    getBody() {
        return this.body;
    }
    setBody(newValue) {
        this.body=newValue;
    }
    setDate(newValue) {
        this.date=newValue;
    }
}

/** Object referencers for the loader. */
class ObjectReferences {
    constructor() {
        this.cubes=new Map();
        this.notations=new Map();
    }
    registerCube(id,cube) {
        this.cubes.set(id,cube);
    }
    registerNotation(id,notation) {
        this.notations.set(id,notation);
    }
    getCube(id) {
        this.cubes.get(id);
    }
    getNotation(id) {
        this.notations.get(id);
    }
}

/** Reader for CubeMarkup XML files.
 */
class CubeMarkupReader {
    constructor() {
        
    }
    
    parseDoc(doc, data=new CubeMarkupData()) {
        for (let child of doc.children) {
            switch (child.tagName) {
                case "CubeMarkup":
                    this.parseCubeMarkup(child, data, new ObjectReferences());
                    break;
                default:
                    module.warning("unsupported root element: "+child.tagName);
                    break;
            }
        }
        return data;
    }
    /** Parses a CubeMarkup element and adds its content to the provided CubeMarkupData object. */
    parseCubeMarkup(elem, data, refs) {
        for (let attr of elem.attributes) {
            switch (attr.nodeName) {
                case "version":
                    if (attr.nodeValue != "9") {
                        module.warning("unsupported version="+attr.nodeValue+" in element: "+elem.tagName);
                        return;
                    }
                    break;
                default:
                    module.warning("unsupported attribute: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                    break;
            }
        }
        for (let child of elem.children) {
              switch (child.tagName) {
                case "Cube":
                    this.parseCube(child, data, refs);
                    break;
                case "Notation":
                    this.parseNotation(child, data, refs);
                    break;
                case "Script":
                    this.parseScript(child, data, refs);
                    break;
                case "Text":
                    this.parseText(child, data);
                    break;
                default:
                    module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                    break;
            }
      }
    }
    
    /** Parses a Cube element and adds its content to the provided CubeMarkupData object. */
    parseCube(elem, data, refs) {
        let obj = new CubeData();
        
        for (let attr of elem.attributes) {
            switch (attr.nodeName) {
                case "alpha" :
                    obj.getAttributes().setAlpha(parseFloat(attr.nodeValue));
                    break;
                case "backgroundColor" :
                    obj.getAttributes().setBackgroundColor(parseRgbColor(attr.nodeValue));
                    break;
                case "beta" :
                    obj.getAttributes().setBeta(parseFloat(attr.nodeValue));
                    break;
                case "id" :
                    obj.setId(attr.nodeValue);
                    break;
                case "default" :
                    obj.setDefault(parseBoolean(attr.nodeValue));
                    break;
                case "explode" :
                    obj.getAttributes().setExplosionFactor(parseFloat(attr.nodeValue));
                    break;
                case "scale" :
                    obj.getAttributes().setScaleFactor(parseFloat(attr.nodeValue));
                    break;
                case "kind" :
                    let kind = CubeKindMap.get(attr.nodeValue);
                    if (kind == null) {
                        module.warning("unsupported type: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                    } else { 
                        obj.setKind(kind);
                    }
                    break;
                case "twistDuration" :
                    obj.getAttributes().setTwistDuration(parseInt(attr.nodeValue));
                    break;
                default:
                    module.warning("unsupported attribute: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                    break;
            }
        }
        let colorMap = new Map(); // id=[r,g,b,a]
        for (let child of elem.children) {
              switch (child.tagName) {
                  case "Author":
                    obj.setAuthor(child.textContent);
                    break;
                  case "Date":
                    obj.setDate(child.textContent);
                    break;
                  case "Name":
                    obj.setName(child.textContent);
                    break;
                  case "Description":
                    obj.setDescription(child.textContent);
                    break;
                  case "Color": {
                      let id=child.getAttribute("id");
                      let argb=child.getAttribute("argb");
                      let name=child.textContent;
                      colorMap.set(id,parseArgbColor(argb));
                      break;
                  }
                  case "Part": {
                      let index=parseInt(child.getAttribute("index"));
                      let visible=parseBoolean(child.getAttribute("visible"));
                      let fillColorRef=child.getAttribute("fillColorRef");
                      let outlineColorRef=child.getAttribute("outlineColorRef");// currently not supported
                      obj.getAttributes().setPartFillColor(index, colorMap.get(fillColorRef));
                      obj.getAttributes().setPartVisible(index, visible);
                      break;
                  }
                  case "Sticker": {
                      let index=parseInt(child.getAttribute("index"));
                      let visible=parseBoolean(child.getAttribute("visible"));
                      let fillColorRef=child.getAttribute("fillColorRef");
                      obj.getAttributes().setStickerFillColor(index, colorMap.get(fillColorRef));
                      obj.getAttributes().setStickerVisible(index, visible);
                      break;
                  }
                  case "StickersImage": {
                      let visible=parseBoolean(child.getAttribute("visible"));
                      let imageData=child.textContent;
                      obj.getAttributes().setStickersImageVisible(visible);
                      obj.getAttributes().setStickersImageUrl("data:image/jpeg;base64,"+imageData);
                      break;
                  }
                default:
                    module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                    break;
            }
      }
      
        refs.registerCube(obj.getId(), obj);
        data.addCube(obj);
    }
    /** Parses a Notation element and adds its content to the provided CubeMarkupData object. */
    parseNotation(elem, data, refs) {
        let obj=new NotationData();
        
        for (let attr of elem.attributes) {
            switch (attr.nodeName) {
                case "id" :
                    obj.setId(attr.nodeValue);
                    break;
                case "default" :
                    obj.setDefault(parseBoolean(attr.nodeValue));
                    break;
                case "layerCount" :
                    obj.setLayerCount(parseInt(attr.nodeValue));
                    break;
                default:
                    module.warning("unsupported attribute: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                    break;
            }
        }
        for (let child of elem.children) {
              switch (child.tagName) {
                  case "Author":
                    obj.setAuthor(child.textContent);
                    break;
                  case "Date":
                    obj.setDate(child.textContent);
                    break;
                  case "Name":
                    obj.setName(child.textContent);
                    break;
                  case "Description":
                    obj.setDescription(child.textContent);
                    break;
                  case "Statement":
                    this.parseStatement(child,obj);
                    break;
                  case "Macro":
                    this.parseMacro(child,obj);
                    break;
                default:
                    module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                    break;
            }
      }
        refs.registerNotation(obj.getId(), obj);
        data.addNotation(obj);
    }
    /** Parses a Scripot element and adds its content to the provided CubeMarkupData object. */
    parseScript(elem, data, refs) {
        let obj=new ScriptData();
        
        for (let attr of elem.attributes) {
            switch (attr.nodeName) {
                case "id" :
                    obj.setId(attr.nodeValue);
                    break;
                case "cubeRef" :
                    obj.setCube(refs.getCube(attr.nodeValue));
                    break;
                case "notationRef" :
                    obj.setNotation(refs.getNotation(attr.nodeValue));
                    break;
                case "scriptType" :
                    obj.setScriptType(parseScriptType(attr.nodeValue));
                    break;
                default:
                    module.warning("unsupported attribute: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                    break;
            }
        }
        for (let child of elem.children) {
              switch (child.tagName) {
                  case "Author":
                    obj.setAuthor(child.textContent);
                    break;
                  case "Source":
                    obj.setSource(child.textContent);
                    break;
                  case "Date":
                    obj.setDate(child.textContent);
                    break;
                  case "Name":
                    obj.setName(child.textContent);
                    break;
                  case "Description":
                    obj.setDescription(child.textContent);
                    break;
                default:
                    module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                    break;
            }
      }
        data.addScript(obj);
    }
    
    /** Parses a Statement element and adds its content to the provided Notation object. */
    parseStatement(elem, notation) {
        let symbol=null;
        let syntax=null;
        let enabled=true;
        
        for (let attr of elem.attributes) {
            switch (attr.nodeName) {
                case "enabled": 
                     enabled=parseBoolean(attr.nodeValue);
                     if (enabled==null) {
                        module.warning("unsupported attribute: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                     }
                    break;
                case "symbol": 
                     symbol=parseSymbol(attr.nodeValue);
                     if (symbol==null) {
                        module.warning("unsupported symbol: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                     }
                    break;
                case "syntax": 
                     syntax=parseSyntax(attr.nodeValue);
                     if (syntax==null) {
                        module.warning("unsupported syntax: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                     }
                    break;
                default:
                    module.warning("unsupported attribute: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                    break;
            }
        }
        
        for (let child of elem.children) {
              switch (child.tagName) {
                  case "Token":
                      if (symbol==ScriptNotation.Symbol.MOVE) {
                          let tokens=parseWordList(child.textContent);
                          let axis=parseAxis(child.getAttribute("axis"));
                          let layerMask=parseLayerList(child.getAttribute("layerList"));
                          let angle=parseAngle(child.getAttribute("angle"));
                          if (axis != null && layerMask !=null && angle!=null) {
                            for (let token of tokens) {
                                if (enabled) {
                                    notation.getNotation().addMoveToken(notation.getLayerCount(), axis, layerMask, angle, token);
                                }
                            }
                        } else {
                            module.warning("illegal move token. axis="+child.getAttribute("axis")+" angle="+child.getAttribute("angle")+" layerList="+child.getAttribute("layerList"));
                        }
                      } else {
                          let tokenSymbol = parseSymbol(child.getAttribute("symbol"));
                          if (tokenSymbol != null) {
                              
                          } else {
                            module.warning("illegal token symbol="+child.getAttribute("symbol"));
                          }
                      }
                      break;
                default:
                    module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                    break;
            }
      }
    }    
    /** Parses a Macro element and adds its content to the provided Notation object. */
    parseMacro(elem, notation) {
        let identifiers=elem.getAttribute("identifier");
        let source=null;
        for (let child of elem.children) {
          switch (child.tagName) {
              case "Source" :
                  source = child.textContent;
                  break;
              default:
                  module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                 break;
          }
        }
        
        for (let identifier of parseWordList(identifiers)) {
            notation.getNotation().addMacro(identifier, source);
        }
    }    
    
    /** Parses a Text element and adds its content to the provided CubeMarkupData object. */
    parseText(elem, data, refs) {
        let obj=new TextData();
        
        for (let attr of elem.attributes) {
            switch (attr.nodeName) {
                case "id" :
                    obj.setId(attr.nodeValue);
                    break;
                default:
                    module.warning("unsupported attribute: "+attr.nodeName+"="+attr.nodeValue+" in element: "+elem.tagName);
                    break;
            }
        }
        for (let child of elem.children) {
              switch (child.tagName) {
                  case "Author":
                    obj.setAuthor(child.textContent);
                    break;
                  case "Date":
                    obj.setDate(child.textContent);
                    break;
                  case "Name":
                    obj.setName(child.textContent);
                    break;
                  case "Title":
                    obj.setTitle(child.textContent);
                    break;
                  case "Body":
                    obj.setBody(child.textContent);
                    break;
                default:
                    module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                    break;
            }
      }
      data.addText(obj);
    }
    
    /** Loads CubeMarkup XML data from the specified URL and returns it asynchronously.
     * 
     * @param {string} url
     * @returns {Promise<CubeMarkupData} the promise
     */
    loadFromUrl(url) {
        let self = this;
        return new Promise(function (resolve, reject){
            let xhr = new XMLHttpRequest();
            xhr.onload = function () {
                if (this.status >= 200 && this.status < 300) {
                    resolve(self.parseDoc(xhr.responseXML, new CubeMarkupData()));
                } else {
                    reject({
                        status: this.status,
                        statusText: xhr.statusText
                    });
                }            };
            xhr.onerror = event => {
                reject({
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            };
            xhr.open("GET", url, true);
            xhr.send();
        });
    }
}

// ------------------
// MODULE API    
// ------------------
export default {
    CubeMarkupReader: CubeMarkupReader,
    CubeMarkupData: CubeMarkupData,
    ScriptType:ScriptType,
};

