/* @(#)CubeMarkup.mjs
 * Copyright (c) 2020 Werner Randelshofer, Switzerland. MIT License.
 */
import CubeAttributes from './CubeAttributes.mjs';


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
const CubeKindEnum = Object.freeze({
    POCKET:{name:"2x2 Pocket Cube", layers:2},
    RUBIK:{name:"3x3 Rubik's Cube", layers:3},
    REVENGE:{name:"4x4 Revenge Cube", layers:4},
    PROFESSOR:{name:"5x5 Professor Cube", layers:5},
    VCUBE_6:{name:"6x6 V-Cube", layers:6},
    VCUBE_7:{name:"7x7 V-Cube", layers:7},
    BARREL:{name:"3x3 Rubik's Barrel", layers:3},
    DIAMOND:{name:"3x3 Rubik's Diamond", layers:3},
    CUBOCTAHEDRON:{name:"3x3 Rubik's Cuboctahedron", layers:3},
    CUBE_6:{name:"6x6 Cube", layers:6},
    CUBE_7:{name:"7x7 Cube", layers:7},
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
        this.attributes = new CubeAttributes.CubeAttributes();
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
    setName(newValue) {
        this.name=newValue;
    }
    setAuthor(newValue) {
        this.author=newValue;
    }
    setDescription(newValue) {
        this.description=newValue;
    }
    setDate(newValue) {
        this.date=newValue;
    }
    setKind(newValue) {
        this.kind=newValue;
    }
    setDefault(newValue) {
        this.default=newValue;
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
        this.layerCount=3;
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
    setLayerCount(newValue) {
        this.layerCount=newValue;
    }
    setName(newValue) {
        this.name=newValue;
    }
    setAuthor(newValue) {
        this.author=newValue;
    }
    setDescription(newValue) {
        this.description=newValue;
    }
    setDate(newValue) {
        this.date=newValue;
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
    setDescription(newValue) {
        this.description=newValue;
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
}

/** Loader for CubeMarkup XML files.
 */
class Loader {
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
        return data;
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
                      obj.getAttributes().setStickersImage("data:image/jpeg;base64,"+imageData);
                      break;
                  }
                default:
                    module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                    break;
            }
      }
      
        refs.registerCube(obj.getId(), obj);
        return data;
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
                 
                default:
                    module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                    break;
            }
      }
        refs.registerNotation(obj.getId(), obj);
        return data;
    }
    /** Parses a Scripot element and adds its content to the provided CubeMarkupData object. */
    parseScript(elem, data, refs) {
        let obj=new ScriptData();
        
        for (let attr of elem.attributes) {
            switch (attr.nodeName) {
                case "id" :
                    obj.setId(attr.nodeValue);
                    break;
                default:
                    module.warning("unsupported attribute:"+attr.nodeName+" in element: "+elem.tagName);
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
                default:
                    module.warning("unsupported child element: "+child.tagName+" in element: "+elem.tagName);
                    break;
            }
      }
        return data;
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
                    module.warning("unsupported attribute:"+attr.nodeName+" in element: "+elem.tagName);
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
        return data;
    }
    
    /** Parses a Name element and sets it on the provided data object. */
    
    load(url) {
        let xhttp = new XMLHttpRequest();
        let data = new CubeMarkupData();
        let self = this;
        xhttp.onreadystatechange = function() {
          if(xhttp.readyState === XMLHttpRequest.DONE && xhttp.status === 200) {
            self.parseDoc(xhttp.responseXML, data)
           }
        };
        xhttp.open("GET", url, true);
        xhttp.send();
        return data;
    }
}

// ------------------
// MODULE API    
// ------------------
export default {
    Loader: Loader,
    CubeMarkupData: CubeMarkupData,
};

