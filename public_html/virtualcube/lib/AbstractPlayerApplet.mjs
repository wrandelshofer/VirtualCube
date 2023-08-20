/* @(#)AbstractPlayerApplet.mjs
 * Copyright (c) 2023 Werner Randelshofer, Switzerland. MIT License.
 */

/** Base class for objects which can render a Cube3D into an HTML 5 canvas
 using one of its contexts (3D or 2D context). And which can handle
 input events and forward them to the Cube3D.
 */

import AbstractCanvas from './AbstractCanvas.mjs';
import Node3D from './Node3D.mjs';
import J3DI from './J3DI.mjs';
import J3DIMath from './J3DIMath.mjs';
import ScriptNotation from './ScriptNotation.mjs';
import ScriptAST from './ScriptAST.mjs';
import ScriptParser from './ScriptParser.mjs';
import Tokenizer from './Tokenizer.mjs';
import Cube3Cube3D from './Cube3Cube3D.mjs';
import Cube2Cube3D from './Cube2Cube3D.mjs';
import Cube4Cube3D from './Cube4Cube3D.mjs';
import Cube5Cube3D from './Cube5Cube3D.mjs';
import Cube6Cube3D from './Cube6Cube3D.mjs';
import Cube7Cube3D from './Cube7Cube3D.mjs';

let logger = {
  log: (false) ? console.log : () => {
  },
  info: (true) ? console.info : () => {
  },
  warning: (true) ? console.warn : () => {
  },
  error: (true) ? console.error : () => {
  }
}
//
// ===============================
//
// Module functions
//
// ===============================

/** Returns an array of script nodes. */
let createRandomScript = function (layerCount, scrambleCount, scrambleMinCount) {
  if (scrambleCount == null)
    scrambleCount = 21;
  if (scrambleMinCount == null)
    scrambleMinCount = 6;
  let scrambler = new Array(Math.floor(Math.random() * scrambleCount - scrambleMinCount) + scrambleMinCount);
  // Keep track of previous axis,  avoid two subsequent moves on
  // the same axis.
  let prevAxis = -1;
  let axis, layerMask, angle;
  for (let i = 0; i < scrambleCount; i++) {
    while ((axis = Math.floor(Math.random() * 3)) == prevAxis) {
    }
    prevAxis = axis;
//  while ((layerMask = Math.floor(Math.random()*(1 << this.layerCount))) == 0) {    }
    layerMask = 1 << Math.floor(Math.random() * layerCount);
    while ((angle = Math.floor(Math.random() * 5) - 2) == 0) {
    }
    scrambler[i] = new ScriptAST.MoveNode(layerCount, axis, layerMask, angle);
  }

  return scrambler;
}


/** Parses an indexed or named color list into an array.
 *
 * EBNF: (|)=choice, []=optional, {}=zero or more, (* *)=comment
 *
 *  colormap = entry, { [','] , {' '} , entry } ;
 *  entry = [ key, {' '} , '=', {' '} ] , value ;
 *  key = (* word *) ;
 *  value = ( '0x' | '#' ) , (* hexdigits *) ;
 */
let parseColorMap = function (str) {
  let map = new Map();
  if (str == null)
    return map;
  let tokens = str.split(/([ =,\n]+)/);
  let elementIndex = 0;
  for (let i = 0; i < tokens.length; ) {
    let key = null;
    if (i < tokens.length - 1 && tokens[i + 1].indexOf('=') != -1) {
      // found a key
      if (!tokens[i].match(/^\w+$/)) {
        logger.error('illegal key:"' + key + '" in map:"' + str + '"');
        break;
      } else {
        key = tokens[i];
      }
      i += 2; // consume key and '=' after key
    }
    if (tokens[i].match(/^(0x|#)[0-9a-fA-F]+$/)) {
      // found a value
      let stringValue = tokens[i];
      let hasAlpha = false;
      if (stringValue[0] == '#') {
        stringValue = '0x' + stringValue.substring(1);
      }
      hasAlpha = stringValue.length == 10;
      let intValue = parseInt(stringValue);
      let rgbaValue = [(intValue >>> 16) & 0xff, (intValue >>> 8) & 0xff, intValue & 0xff,
        hasAlpha ? ((intValue >>> 24) & 0xff) : 0xff]

      if (key != null) {
        map.set(key, rgbaValue);
      }
      map.set(""+elementIndex, rgbaValue);
      i++; // consume value
      elementIndex++; // increase element index
    } else if (tokens[i].match(/^[ ,]+$/)) {
      // found a separator
      i++; // consume separator
    } else {
      logger.error('illegal token:"' + tokens[i] + '" in map:"' + str + '"');
      break;
    }
  }
  return map;
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
/** Parses a list of script macro definitions.
 *
 * EBNF: (|)=choice, []=optional, {}=zero or more, (* *)=comment
 *
 *  definitions = {' '}, entry, { {' '}, [','] , {' '} , entry } ;
 *  entry = optionallyQuotedId , {' '},  '=', {' '} , optionallyQuotedValue ;
 *  optionallyQuotedId = (* words *) | (* quote *), (* characters *), (* quote *) ;
 *  optionallyQuotedValue = (* words *) | (* quote *), (* characters *), (* quote *) ;
 */
let parseMacroDefinitions = function (str) {
  const t = new Tokenizer.PushBackReader(str);
  let defs = {};
  do {
    t.skipWhitespace();
    let quote = t.read();
    if (quote == null)
      break;
    let id = '';
    if (/\w/.test(quote)) {// => identifier is not quoted
      id = quote;
      for (let ch = t.read(); ch != null && ch != '='; ch = t.read()) {
        id = id + ch;
      }
      id = id.trim();
      t.pushBack();
    } else {// => identifier is quoted
      for (let ch = t.read(); ch != null && ch != quote; ch = t.read()) {
        id = id + ch;
      }
    }
    t.skipWhitespace();
    let equal = t.read();
    if (equal != '=')
      throw new Tokenizer.ParseException("= expected, ch:" + equal, t.getPosition() - 1, t.getPosition())
    t.skipWhitespace();
    quote = t.read();
    if (quote == null)
      throw new Tokenizer.ParseException("quote around value expected, ch:" + ch, t.getPosition() - 1, t.getPosition())
    let value = '';
    if (/\w/.test(quote)) {// => value is not quoted
      value = quote;
      for (let ch = t.read(); ch != null && ch != ','; ch = t.read()) {
        value = value + ch;
      }
      value = value.trim();
      t.pushBack();
    } else {
      for (let ch = t.read(); ch != null && ch != quote; ch = t.read()) {
        value = value + ch;
      }
    }
    t.skipWhitespace();
    let comma = t.read();
    if (comma != ',') {
      t.pushBack();
    }

    defs[id] = value;
  } while (t.getChar() != null);
  return defs;
}


// ===============================
//
// AbstractPlayerApplet
//
// ===============================

/** Creates a AbstractPlayerApplet.
 Subclasses must call initCube3DCanvas(). */
class AbstractPlayerApplet extends AbstractCanvas.AbstractCanvas {
  constructor() {
    super();
    this.handler = new Cube3DHandler(this);
    this.canvas = null;
    this.cube3d = null;
    this.currentAngle = 0;
    this.autorotate = false;
    this.autorotateFunction = null;
    this.rotateFunction = null;
    this.rotationMatrix = new J3DIMath.J3DIMatrix4();
    this.smoothRotationFunction = null;
    this.spin = new J3DIMath.J3DIVector3();
    this.useFullModel = true;
    this.undoList = [];
    this.redoIndex = 0;
    this.stickersTexture = null;
    this.currentMove = null;
    // applet parameters
    // FIXME some parameters are read from here, and others are read
    // directly from the canvas
    this.parameters = {
      // note: all parameters delivered from html are lowercase!
      baseurl: 'lib/',
      colortable: null, //frdblu (deprecated)
      colorlist: null, //rufldb
    };

    this.script = null; // This is the root node of the parsed script AST
    this.scriptString = null; // This is the script string used for display
    this.scriptElement = null;// This is a DIV element that displays the scriptString
    this.scriptSequence = [];
    this.playIndex = 0;
    this.playToken = null;
  }

  createCube3D() {
    this.debugFPS = this.canvas.getAttribute("debug").indexOf("fps") != -1;
    let c = this.canvas.getAttribute("kind");
    let cname = c == null || c == "null" ? "" : c.trim();
    if (cname.length == 0) {
      cname = "rubikscube";
    }
    let levelOfDetail = parseInt(this.canvas.getAttribute("levelofdetail"));
    if (isNaN(levelOfDetail)) {
      levelOfDetail = this.useFullModel ? 4 : 1;
    }

    let c3d = null;
    switch (cname.toLowerCase()) {
      case "rubikscube" :
        c3d = Cube3Cube3D.createCube3D(levelOfDetail);
        break;
      case "pocketcube" :
        c3d = Cube2Cube3D.createCube3D(levelOfDetail);
        break;
      case "revengecube" :
        c3d = Cube4Cube3D.createCube3D(levelOfDetail);
        break;
      case "professorcube" :
        c3d = Cube5Cube3D.createCube3D(levelOfDetail);
        break;
      case "cube6" :
        c3d = Cube6Cube3D.createCube3D(levelOfDetail);
        break;
      case "cube7" :
        c3d = Cube7Cube3D.createCube3D(levelOfDetail);
        break;
      default :
        logger.error('illegal cube attribute :' + cname);
        if (this.useFullModel) {
          c3d = Cube3Cube3D.createCube3D(levelOfDetail);
        } else {
          c3d = Cube3Cube3D.createCube3D(levelOfDetail);
        }
    }
    if (c3d != null) {
      c3d.baseUrl = this.parameters.baseurl;
      c3d.loadGeometry();
      return c3d;
    }
  }

  /** Sets Cube3D object. */
  setCube3D(cube3d) {
    this.cube3d = cube3d;
  }

  /** Gets Cube3D object. */
  getCube3D() {
    return this.cube3d;
  }

  /** Initializes the scene.-
   * This function is called from openCanvas().
   */
  initScene() {
    let self = this;
    let fRepaint = function () {
      self.repaint();
    };
    this.world = new Node3D.Node3D();
    this.cube3d = this.createCube3D();
    this.scriptProgress = NaN; // initial script progress on startup
    this.readParameters(this.cube3d);
    this.cube3d.repaintFunction = fRepaint;
    this.world.add(this.cube3d);
    this.cube = this.cube3d.cube;
    this.cube3d.addChangeListener(this);
    let attr = this.cube3d.attributes;
    this.cubeSize = this.cube3d.getCubeSize();

    // Make sure that scene fits into range of [-1,+1], so that webGL does not clip it!
    let webglFactor = 2/this.cubeSize;
    this.cubeSize = this.cubeSize * webglFactor;
    this.cube3d.matrix.scale(webglFactor);

    this.currentAngle = 0;
    this.xRot = attr.xRot;
    this.yRot = attr.yRot;
    this.camPos = new J3DIMath.J3DIVector3(0, 0, -this.cubeSize * 3.25);
    this.lookAtPos = new J3DIMath.J3DIVector3(0, 0, 0);
    this.up = new J3DIMath.J3DIVector3(0, 1, 0);
    this.lightPos = new J3DIMath.J3DIVector3(4,this.cubeSize* -4, this.cubeSize*8);
    this.lightNormal = new J3DIMath.J3DIVector3(this.cubeSize*-4, this.cubeSize*4, this.cubeSize*-8).normalize();
    this.observerNormal = new J3DIMath.J3DIVector3(this.camPos).normalize();
    let stickersImageURL = this.canvas.getAttribute('stickersImage');
    if (stickersImageURL != null && stickersImageURL != 'null') {
      attr.stickersImageURL = stickersImageURL;
    }

    if (attr.stickersImageURL) {
      J3DI.loadImageTexture(this.gl, attr.stickersImageURL, (texture) => {
        self.stickersTexture = texture;
        fRepaint();
      });
    }
    this.cube3d.validateAttributes();
    this.mvMatrix = new J3DIMath.J3DIMatrix4();
    this.perspectiveMatrix = new J3DIMath.J3DIMatrix4();
    this.mvpMatrix = new J3DIMath.J3DIMatrix4();
    this.mvNormalMatrix = new J3DIMath.J3DIMatrix4();
    this.invCameraMatrix = new J3DIMath.J3DIMatrix4();
    this.cameraMatrix = new J3DIMath.J3DIMatrix4();
    this.rotationMatrix = new J3DIMath.J3DIMatrix4();
    this.viewportMatrix = new J3DIMath.J3DIMatrix4();
    this.forceColorUpdate = false;

    this.reset(true);
  }

  updateMatrices() {
    // Update the perspective matrix
    this.cameraMatrix.makeIdentity();
    this.cameraMatrix.lookat(
      this.camPos[0], this.camPos[1], this.camPos[2],
      this.lookAtPos[0], this.lookAtPos[1], this.lookAtPos[2],
      this.up[0], this.up[1], this.up[2]
      );
    let flip = new J3DIMath.J3DIMatrix4();
    flip.scale(1, 1, -1);
    flip.multiply(this.cameraMatrix);
    this.cameraMatrix.load(flip);
    this.perspectiveMatrix.makeIdentity();
    this.perspectiveMatrix.perspective(30.5, this.width / this.height, 1, 12);
    this.perspectiveMatrix.multiply(this.cameraMatrix);
    if (this.width < this.height) {
      let factor = this.width / this.height;
      this.perspectiveMatrix.scale(factor, factor, 1);
    }
    logger.log('updateMatrix w:' + this.width + " h:" + this.height);

    this.invCameraMatrix.load(this.cameraMatrix);
    this.invCameraMatrix.invert();
    this.rasterToCameraMatrix = new J3DIMath.J3DIMatrix4(this.perspectiveMatrix);
    this.rasterToCameraMatrix.invert();
    // world-view transformation
    let attr = this.cube3d.attributes;
    let wvMatrix = this.world.matrix;
    wvMatrix.makeIdentity();
    wvMatrix.multiply(this.rotationMatrix);
    wvMatrix.rotate(attr.xRot, 1, 0, 0);
    wvMatrix.rotate(attr.yRot, 0, -1, 0);
    wvMatrix.rotate(this.currentAngle, 1, 1, 1);
    let scaleFactor = attr.scaleFactor;
    wvMatrix.scale(scaleFactor, scaleFactor, scaleFactor);
  }

  /** Draws the scene. */
  draw() {
    if (!this.camPos)
      return;
    this.reshape();
    this.updateMatrices();
    this.cube3d.doValidateDevelopAttributes();
    let self = this;
    this.clearCanvas();
    let start = new Date().getTime();
    this.faceCount = 0;
    if (this.cube3d.isDrawTwoPass) {
      this.drawTwoPass(this.cube3d);
    } else {
      this.drawSinglePass(this.cube3d);
    }

    if (this.debugFPS && this.g != null) {
      let end = new Date().getTime();
      let elapsed = end - start;
      let g = this.g;
      g.fillStyle = 'rgb(0,0,0)';
      g.fillText("faces:" + (this.faceCount) +
        " elapsed:" + (end - start)
        , 20, 20);
    }
  }
  drawSinglePass(cube3d) {
    let self = this;

    //let cube3d=this.cube3d;
    cube3d.repainter = this;
    let attr = this.cube3d.attributes;
    cube3d.updateAttributes();
    // model view transformation
    let mvMatrix = this.mvMatrix;

    // draw center parts
    for (let i = 0; i < cube3d.centerCount; i++) {
      if (!attr.isPartVisible(cube3d.centerOffset + i))
        continue;
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.centerOffset + i].transform(mvMatrix);
      let cparts = attr.partsFillColor[cube3d.centerOffset + i];
      this.drawObject(cube3d.centerObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.centerOffset + i]);
    }

    // draw side parts
    for (let i = 0; i < cube3d.sideCount; i++) {
      if (!attr.isPartVisible(cube3d.sideOffset + i))
        continue;
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.sideOffset + i].transform(mvMatrix);
      let cparts = attr.partsFillColor[cube3d.sideOffset + i];
      this.drawObject(cube3d.sideObjs[i], mvMatrix, cparts, attr.partsPhong[this.cube3d.sideOffset + i]);
      let si = cube3d.getStickerIndexForPartIndex(cube3d.sideOffset + i, 0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix,
        attr.stickersFillColor[si],
        attr.stickersPhong[si]);
    }
    // draw edge parts
    for (let i = 0; i < cube3d.edgeCount; i++) {
      if (!attr.isPartVisible(cube3d.edgeOffset + i))
        continue;
      mvMatrix.makeIdentity();
      this.cube3d.parts[cube3d.edgeOffset + i].transform(mvMatrix);
      let cparts = attr.partsFillColor[cube3d.edgeOffset + i];
      this.drawObject(cube3d.edgeObjs[i], mvMatrix, cparts, attr.partsPhong[this.cube3d.edgeOffset + i]);
      let si = cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset + i, 0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix,
        attr.stickersFillColor[si],
        attr.stickersPhong[si]);
      si = cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset + i, 1);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix,
        attr.stickersFillColor[si],
        attr.stickersPhong[si]);
    }
    // draw corner parts
    for (let i = 0; i < cube3d.cornerCount; i++) {
      if (!attr.isPartVisible(cube3d.cornerOffset + i))
        continue;
      mvMatrix.makeIdentity();
      this.cube3d.parts[cube3d.cornerOffset + i].transform(mvMatrix);
      let cparts = attr.partsFillColor[cube3d.cornerOffset + i];
      this.drawObject(cube3d.cornerObjs[i], mvMatrix, cparts, attr.partsPhong[this.cube3d.cornerOffset + i], this.forceColorUpdate);
      let si = cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset + i, 1);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si], this.forceColorUpdate);
      si = cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset + i, 0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si], this.forceColorUpdate);
      si = cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset + i, 2);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si], this.forceColorUpdate);
    }
    this.flushCanvas();
    this.forceColorUpdate = false;
  }

  /** Draws the scene. */
  drawTwoPass(cube3d) {
    if (!this.camPos)
      return;
    this.reshape();
    this.updateMatrices();
    let self = this;
    this.clearCanvas();
    //let cube3d=this.cube3d;
    cube3d.repainter = this;
    cube3d.validateAttributes();
    let attr = cube3d.attributes;
    // part colors
    let ccenter = attr.partsFillColor[cube3d.centerOffset];
    let cparts = attr.partsFillColor[cube3d.cornerOffset];
    // model view transformation
    let mvMatrix = this.mvMatrix;
    {
      // draw center parts
      for (let i = 0; i < this.cube3d.centerCount; i++) {
        mvMatrix.makeIdentity();
        cube3d.parts[cube3d.centerOffset + i].transform(mvMatrix);
        this.drawObject(cube3d.centerObj, mvMatrix, ccenter, attr.partsPhong[cube3d.centerOffset + i]);
      }
      // draw side parts
      for (let i = 0; i < cube3d.sideCount; i++) {
        mvMatrix.makeIdentity();
        cube3d.parts[cube3d.sideOffset + i].transform(mvMatrix);
        this.drawObject(cube3d.sideObjs[i], mvMatrix, cparts, attr.partsPhong[cube3d.sideOffset + i]);
      }
      // draw edge parts
      for (let i = 0; i < cube3d.edgeCount; i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.edgeOffset + i].transform(mvMatrix);
        this.drawObject(cube3d.edgeObjs[i], mvMatrix, cparts, attr.partsPhong[this.cube3d.edgeOffset + i]);
      }
      // draw corner parts
      for (let i = 0; i < cube3d.cornerCount; i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.cornerOffset + i].transform(mvMatrix);
        this.drawObject(cube3d.cornerObjs[i], mvMatrix, cparts, attr.partsPhong[this.cube3d.cornerOffset + i], this.forceColorUpdate);
      }
      this.flushCanvas();
    }
    if (true) {
      // draw side stickers
      for (let i = 0; i < cube3d.sideCount; i++) {
        mvMatrix.makeIdentity();
        cube3d.parts[cube3d.sideOffset + i].transform(mvMatrix);
        let si = cube3d.getStickerIndexForPartIndex(cube3d.sideOffset + i, 0);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix,
          attr.stickersFillColor[si],
          attr.stickersPhong[si]);
      }
      // draw edge stickers
      for (let i = 0; i < cube3d.edgeCount; i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.edgeOffset + i].transform(mvMatrix);
        let si = cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset + i, 0);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix,
          attr.stickersFillColor[si],
          attr.stickersPhong[si]);
        si = cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset + i, 1);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix,
          attr.stickersFillColor[si],
          attr.stickersPhong[si]);
      }
      // draw corner stickers
      for (let i = 0; i < cube3d.cornerCount; i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.cornerOffset + i].transform(mvMatrix);
        let si = cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset + i, 1);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si], this.forceColorUpdate);
        si = cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset + i, 0);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si], this.forceColorUpdate);
        si = cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset + i, 2);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si], this.forceColorUpdate);
      }

      this.flushCanvas();
      this.forceColorUpdate = false;
    }
  }

  /**
   * Returns true if the script type is "solver",
   * false otherwise. When false, the script type is
   * assumed to be "generator".
   */
  isSolver() {
    return this.parameters.scripttype == "solver";
  }

  reset(initialReset=false) {
    this.currentAngle = 0;
    this.xRot = this.cube3d.attributes.xRot;
    this.yRot = this.cube3d.attributes.yRot;
    this.rotationMatrix.makeIdentity();
    this.smoothRotationFunction = null;
    let self = this;
    let f = function () {
      // Cancel all other lengthy operations
      self.cube.cancel = true;
      // Wait until cube3d has finished twisting
      if (self.cube3d.isTwisting) {
        self.repaint(f); // busy wait
        return;
      }
      // remove repainter needed for animation
      self.cube3d.repainter = null;
      // Reset cube
      self.resetPlayback(initialReset?self.isSolver():true);

      // reinstall repainter needed for animation
      self.cube3d.repainter = this;
      // Other lenghty operations are go now
      self.cube.cancel = false;
    };
    this.repaint(f);
    return;
  }
  /**
   * Pushes a move for undoing.
   * @param move twistNode.
   * */
  pushMoveOnUndoList(move) {
    if (this.redoIndex < this.undoList.length) {
      this.undoList = this.undoList.splice(0, this.redoIndex);
    }

    this.undoList.push(move);
    this.redoIndex = this.undoList.length;
  }

  undo() {
    if (this.redoIndex > 0) {
      let move = this.undoList[--this.redoIndex];
      move.applyTo(this.cube, true);
      if (this.cube.isSolved()) {
        this.wobble();
      }
    }
  }
  redo() {
    if (this.redoIndex < this.undoList.length) {
      let move = this.undoList[this.redoIndex++];
      move.applyTo(this.cube);
      if (this.cube.isSolved()) {
        this.wobble();
      }
    }
  }
  clearUndoRedo() {
    this.undoList = [];
    this.redoIndex = 0;
  }

  getEndPosition() {
    return this.scriptSequence == null ? 0 : this.scriptSequence.length;
  }
  getCurrentPosition() {
    return this.playIndex;
  }
  setCurrentPosition(newValue) {
    // FIXME we must adjust the state of the player!
    this.setPlayIndex(newValue);
  }

  /** Plays the script.
   * Plays the entire script if the playIndex is at the start or the end
   * of the script. Plays the remainder of the script otherwise.
   */
  play() {
     if (this.script == null) {
       return;
     }
     if (this.stopPlayback()) {
       return;
     }

     let moves;
     if (this.playIndex < this.scriptSequence.length) {
      moves = this.scriptSequence.slice(this.playIndex);
     } else {
       this.resetPlayback(true);
       moves = this.scriptSequence;
     }
     this.clearUndoRedo();
    this.setPlayIndex(this.scriptSequence.length);
    this.playMoves(moves, true, this.cube3d.attributes.getUserTwistDuration());
  }

  /* This is a private method.
   * The public method is setCurrentPosition().
   */
  setPlayIndex(newValue) {
    this.playIndex=newValue;
    this.updateScriptDiv();
  }

  /* This is a private method.
   */
  setCurrentMove(newValue) {
    this.currentMove=newValue;
    this.updateScriptDiv();
  }

  /** This is a private method.
   * Shows the script and highlights the current move or the playback index.
   */
  updateScriptDiv() {
     if(this.scriptElement==null) {
        return;
     }
     let elem = this.scriptElement;
     while (elem.firstChild) {
        elem.removeChild(elem.lastChild);
     }

    let moveNode= (this.currentMove!=null)?this.currentMove :
                  this.playIndex>=0&&this.playIndex<this.scriptSequence.length? this.scriptSequence[this.playIndex] : null;

    if (moveNode==null||moveNode.startPosition==null) {
         elem.append(document.createTextNode(this.scriptString));
         return;
     }
     let startPos=moveNode.startPosition;
     let endPos=moveNode.endPosition;
     elem.append(document.createTextNode(this.scriptString.substring(0,startPos)));
     let spanElem = document.createElement("span");
     spanElem.setAttribute("class",moveNode==this.currentMove?"currentMove":"nextMove");
     elem.append(spanElem);
     spanElem.append(document.createTextNode(this.scriptString.substring(startPos,endPos)));
     elem.append(document.createTextNode(this.scriptString.substring(endPos,this.scriptString.length)));
  }


  stopPlayback() {
    let isPlaying = this.playToken != null;
    this.playToken = null;
    return isPlaying;
  }

  isPlaying() {
    return this.playToken != null;
  }

  /**
   * Resets the playback header.
   * @param {type} forward if true resets to start of sequence,
   * if false resets to end of sequence
   */
  resetPlayback(forward=false) {
       this.cube3d.setRepainter(null);
       this.cube.reset();
       if (this.initScript != null) {
         this.initScript.applyTo(this.cube);
       }
       if (this.script != null) {
           if (forward) {
             if (this.isSolver()) {
              this.script.applyTo(this.cube, true);
             }
             this.setPlayIndex(0);
           } else {
             if (!this.isSolver()) {
              this.script.applyTo(this.cube, false);
             }
             this.setPlayIndex(this.scriptSequence.length);
           }
       }
       this.cube3d.setRepainter(this);
       this.repaint();
  }

  /** Plays the next step of the script.
   */
  stepForward() {
     if (this.script == null) {
       return;
     }
     if (this.stopPlayback()) {
       return;
     }

     this.clearUndoRedo();
     if (this.playIndex < this.scriptSequence.length) {
       let nextMove = this.scriptSequence[this.playIndex];
       let moves = [nextMove];
       this.playMoves(moves, true, this.cube3d.attributes.getUserTwistDuration());
       this.setPlayIndex(this.playIndex+1);
     } else {
       this.resetPlayback(true);
     }
  }

  /** Plays the previous step of the script.
   */
  stepBackward() {
     if (this.script == null) {
       return;
     }
     if (this.stopPlayback()) {
       return;
     }

     this.clearUndoRedo();
     if (this.playIndex > 0) {
       let nextMove = this.scriptSequence[this.playIndex-1].clone();
       nextMove.invert();
       let moves = [nextMove];
       this.playMoves(moves, true, this.cube3d.attributes.getUserTwistDuration());
       this.setPlayIndex(this.playIndex-1);
     } else {
       this.resetPlayback();
       this.setPlayIndex(this.scriptSequence.length);
     }
  }

  playMoves(moves, animate, twistDuration=1000) {
    let self=this;

    if (!animate) {
      let f = function () {
        // Cancel all other lengthy operations
        self.cube.cancel = true;
        // Wait until cube3d has finished twisting
        if (self.cube3d.isTwisting) {
          self.repaint(f); // busy wait!!!
          return;
        }

        self.cube3d.setRepainter(null);
        for (let i = 0; i < moves.length; i++) {
          moves[i].applyTo(self.cube);
        }
        self.cube3d.setRepainter(self);
        self.cube3d.repaint();

        // Cancelling done - we can now create new lengthy operations
        self.cube.cancel = false;
      };
      this.repaint(f);
      self.setCurrentMove(null);
      return;
    }

    let next = 0; // next twist to be performed
    self.setCurrentMove(moves[next]);
    let owner = new Object();
    this.playToken = owner;
    let f = function () {
      // Wait until we can lock the cube. This prevents that multiple
      // scramble operations run concurrently.
      if (!self.cube.lock(owner)) {
        self.repaint(f);
        return;
      }
      // Playback has been aborted
      if (self.playToken != owner) {
        self.cube.unlock(owner);
        return;
      }

      // Wait until cube3d has finished twisting
      if (self.cube3d.isTwisting) {
        self.repaint(f);// busy loop
        return;
      }

      if (next == 0) {
        // => First move: Speed the cube up
        self.cube3d.attributes.setTwistDuration(twistDuration);
      }

      if (self.cube.cancel) {
        // => cancel? gently stop
        next = moves.length;
      }

      // Initiate the next move
      if (next < moves.length) {
        self.setCurrentMove(moves[next]);
        moves[next].applyTo(self.cube);
        next++;
        self.repaint(f);
      } else {
        // => We are done: Restore the speed
        self.cube3d.attributes.setTwistDuration(self.cube3d.attributes.getUserTwistDuration());
        // Unlock the cube
        self.cube.unlock(owner);
        self.setCurrentMove(null);
        self.playToken = null;
      }

    };
    this.repaint(f);
  }

  /** Scrambles the cube.
   * @param scrambleCount Number > 1.
   * @param animate     Boolean. Whether to animate to cube or just snap
   *                 into scrambled position.
   */
  scramble(scrambleCount, animate) {
    if (scrambleCount == null)
      scrambleCount = 16;
    if (animate == null)
      animate = true;

    // => Clear undo/redo list
    this.clearUndoRedo();
    // Create random moves
    let layerCount = this.cube3d.cube.layerCount;
    let scrambleNodes = createRandomScript(layerCount, scrambleCount);
    this.playMoves(scrambleNodes, animate,this.cube3d.attributes.getScrambleTwistDuration());
  }

  /**
   * Enables/disables autorotation.
   *
   * @param newValue A boolean.
   */
  setAutorotate(newValue) {
    if (newValue != this.autorotate) {
      this.autorotate = newValue;
      if (newValue) {
        let self = this;
        let start = new Date().getTime();
        let anglePerSecond = 20;
        let prev = start;
        let startAngle = this.currentAngle;
        this.autorotateFunction = function () {
          if (self.autorotate)
            self.repaint(self.autorotateFunction);
          let now = new Date().getTime();
          let elapsed = now - start;
          self.currentAngle = (startAngle + elapsed * anglePerSecond / 1000) % 360;
        };
        this.repaint(this.autorotateFunction);
      }
    }
  }
  /**
   * Rotates the cube by the given amount.
   *
   * @param dx Degrees 360° on X-axis.
   * @param dy Degrees 360° on Y-axis.
   */
  rotate(dx, dy) {
    let rm = new J3DIMath.J3DIMatrix4();
    rm.rotate(dy, 0, 1, 0);
    rm.rotate(dx, 1, 0, 0);
    rm.multiply(this.rotationMatrix); // FIXME - Numerically unstable
    this.rotationMatrix.load(rm);
    this.repaint();
  }
  /**
   * Wobbles the cube.
   *
   * @param newValue A boolean.
   */
  wobble(amount, duration) {
    if (amount == null)
      amount = 0.3;
    if (duration == null)
      duration = 500;
    let self = this;
    let start = new Date().getTime();
    let f = function () {
      let now = new Date().getTime();
      let elapsed = now - start;
      let x = elapsed / duration;
      if (x < 1) {
        self.repaint(f);
        //  self.cube3d.attributes.scaleFactor=1+0.3*Math.sin(Math.PI*x);
        self.cube3d.attributes.scaleFactor = 1 + amount * Math.pow(1 - Math.pow(x * 2 - 1, 2), 4);
      } else {
        self.cube3d.attributes.scaleFactor = 1;
      }
    };
    this.repaint(f);
  }
  /**
   * Explodes the cube.
   *
   * @param newValue A boolean.
   */
  explode(amount, duration) {
    if (amount == null)
      amount = 2;
    if (duration == null)
      duration = 2000;
    let self = this;
    let start = new Date().getTime();
    let f = function () {
      let now = new Date().getTime();
      let elapsed = now - start;
      let x = elapsed / duration;
      if (x < 1) {
        self.repaint(f);
        self.cube3d.attributes.explosionFactor = amount * Math.pow(1 - Math.pow(x * 2 - 1, 2), 4);
        self.cube3d.updateExplosionFactor();
      } else {
        self.cube3d.attributes.explosionFactor = 0;
        self.cube3d.updateExplosionFactor();
      }
    };
    this.repaint(f);
  }

  stateChanged(event) {
    this.repaint();
  }

  getCubeAttributes() {
    return this.cube3d.attributes;
  }
  setCubeAttributes(attr) {
    this.cube3d.attributes = attr;
    this.forceColorUpdate = true;
    let gl = this.gl;
    gl.clearColor(attr.backgroundColor[0] / 255.0, attr.backgroundColor[1] / 255.0,
      attr.backgroundColor[2] / 255.0, attr.backgroundColor[3] / 255.0);
  }

  /**
   * Hit test for mouse events.
   */
  mouseIntersectionTest(event) {
    // point in raster coordinates
    let rect = this.canvas.getBoundingClientRect();
    let pRaster = new J3DIMath.J3DIVector3(event.clientX - rect.left, event.clientY - rect.top, 0);
    // point in camera coordinates
    let pCamera = new J3DIMath.J3DIVector3((pRaster[0] - this.width / 2) / this.width * 2, (pRaster[1] - this.height / 2) / -this.height * 2, 0);
    // point in world coordinates
    let pWorld = new J3DIMath.J3DIVector3(pCamera);
    pWorld.multVecMatrix(this.rasterToCameraMatrix);
    // Inverse model-world matrix
    let wmMatrix = new J3DIMath.J3DIMatrix4(this.world.matrix);
    wmMatrix.multiply(this.cube3d.matrix);
    wmMatrix.invert();
    // point in model coordinates
    let pModel = new J3DIMath.J3DIVector3(pWorld);
    pModel.multVecMatrix(wmMatrix);
    // camera ray in model coordinates
    let ray = {point: new J3DIMath.J3DIVector3(), dir: new J3DIMath.J3DIVector3()};
    ray.point.load(this.camPos);
    ray.point.multVecMatrix(wmMatrix);
    ray.dir.load(pModel);
    ray.dir.subtract(ray.point);
    ray.dir.normalize();
    let isect = this.cube3d.intersect(ray);
    return isect;
  }

  /** Reads the parameters and applies them to the provided cube 3d.
   *
   * Note:
   * cube3d.validateAttributes() must be called after this method has been invoked.
   */
  readParameters(cube3d) {
    this.readOrientationParameters(cube3d);
    this.readColorParameters(cube3d);
    this.readPartParameters(cube3d);
    this.readScriptParameters(cube3d);
  }

  /** Reads the color parameters and applies them to the provided cube 3d.
   *
   * Note:
   * cube3d.validateAttributes() must be called after this method has been invoked.
   */
  readColorParameters(cube3d) {
    let a = cube3d.attributes;
    let p = this.parameters;
    let deprecatedFaceIndices = ["2", "0", "3", "5", "4", "1"]; // maps FRDBLU to RUFLDB

    // parse default colorMap
    // --------------
    let deprecatedColorMap = new Map(); //parseColorMap("r=#ff4600,u=#ffd200,f=#003373,l=#8c000f,d=#f8f8f8,b=#00732f");
    let colorMap = parseColorMap("r=#ffd200,u=#003373,f=#8c000f,l=#f8f8f8,d=#00732f,b=#ff4600");
    for (let k of colorMap.keys()) {
      if (k >= 0 && k <= colorMap.size) {
        deprecatedColorMap.set(k, colorMap.get(""+deprecatedFaceIndices[k]));
      } else {
        deprecatedColorMap.set(k, colorMap.get(k));
      }
    }

    // parse colorMap from parameter "colorTable"
    // this parameter is deprecated but still supported
    // note: in RubikPlayerApplet the colorTable is defined FRDBLU
    //     in VirtualRubikApplet the colorTable is defined RUFDLB
    //     we use the RubikPlayerApplet definition

    if (p.colortable != null) {
      logger.log('.readParameters colortable:' + p.colortable);
      logger.warning('the parameter "colorTable" is deprecated, use "colorList" instead.');
      let parsedColorMap = parseColorMap(p.colortable);
      for (let [k,v] of parsedColorMap.entries()) {
        if (0 <= k && k < deprecatedFaceIndices.length) {
          colorMap.set(deprecatedFaceIndices[k], v);
        } else {
          colorMap.set(k, v);
        }
      }
      deprecatedColorMap = colorMap;
    }

    // parse colorMap from parameter "colorList"
    if (p.colorlist != null) {
      logger.log('.readParameters colorlist:' + p.colorlist);
      colorMap = parseColorMap(this.parameters.colorlist);
      deprecatedColorMap = colorMap;
    }

    // parse default faceIndices
    // ---------------
    let faceIndices = [];
    let currentColorMap = colorMap;
    for (let i = 0; i < a.getFaceCount(); i++) {
      faceIndices[i] = i;
    }

    // parse faceIndices from faces
    if (p.faces != null) {
      logger.log('.readParameters faces:' + p.faces);
      logger.warning('the parameter "faces" is deprecated, please use "faceList" instead.');
      let parsedIndices = parseCommaOrSpaceSeparatedList(p.faces);
      for (let i in parsedIndices) {
        faceIndices[deprecatedFaceIndices[i]] = parsedIndices[i];
      }
      currentColorMap = deprecatedColorMap;
    }
    // parse faceIndices from faceList
    if (p.facelist != null) {
      logger.log('.readParameters facelist:' + p.facelist);
      faceIndices = parseCommaOrSpaceSeparatedList(p.facelist);
    }

    // apply face indices
    for (let i = 0; i < a.getFaceCount(); i++) {
      let color = currentColorMap.get(""+faceIndices[i]);
      if (color != null) {
        let face = i;
        let offset = a.getStickerOffset(face);
        for (let j = 0; j < a.getStickerCount(face); j++) {
          a.stickersFillColor[offset + j] = color;
        }
      }
    }

    // Set the colors for each sticker on each side of the cube.
    // XXX - This does only work correctly with 6-faced cubes
    let deprecatedParameterNames = [
      "stickersfront", "stickersright", "stickersleft",
      "stickersback", "stickersdown", "stickersup"
    ];
    let parameterNames = [
      "stickersrightlist", "stickersuplist", "stickersfrontlist",
      "stickersleftlist", "stickersdownlist", "stickersbacklist"
    ];
    for (let i = 0, n = Math.min(deprecatedParameterNames.length, a.getFaceCount()); i < n; i++) {
      let value = p[deprecatedParameterNames[i]];
      let keys = parseCommaOrSpaceSeparatedList(value);
      if (keys != null && keys.length != 0) {
        logger.warning("Parameter \"" +deprecatedParameterNames[i]+ "\" is deprecated, use \"" + parameterNames[i] + "\" instead.");
        if (keys.length != a.getStickerCount(i)) {
          logger.error(
              "The Applet parameter \"" + deprecatedParameterNames[i]
              + "\" has " + keys.length + " items instead of "
              + a.getStickerCount(i) + " items.",
              deprecatedParameterNames[i], value);
          return;
        }
        let face = deprecatedFaceMap[i];
        let offset = a.getStickerOffset(face);
        for (let j = 0, m = a.getStickerCount(face); j < m; j++) {
          if (!deprecatedColorTable.has(keys[j])) {
            logger.error("AbstractPlayerApplet error in deprecatedColorTable:" + deprecatedColorTable
                +"\n"+
                deprecatedParameterNames[i]+","+ value+","+
                value.indexOf(keys[j])+","+
                value.indexOf(keys[j]) + keys[j].length() - 1);
            return;
          }
          a.setStickerFillColor(
              a.getStickerOffset(face) + j,
              deprecatedColorTable.get(keys[j]));
        }
      }
    }
    for (let i = 0, n = Math.min(parameterNames.length, a.getFaceCount()); i < n; i++) {
      let value = p[parameterNames[i]];
      let keys = parseCommaOrSpaceSeparatedList(value);
      if (keys != null && keys.length != 0) {
        if (keys.length != a.getStickerCount(i)) {
          logger.error(
              "The Applet parameter \"" + parameterNames[i]
              + "\" has " + keys.length + " items instead of "
              + a.getStickerCount(i) + " items.",
              parameterNames[i], value);
          return;
        }
        let face = i;
        let offset = a.getStickerOffset(face);
        for (let j = 0, m = a.getStickerCount(face); j < m; j++) {
          if (!colorMap.has(keys[j])) {
            logger.error(
                parameterNames[i]+","+ value+","+
                value.indexOf(keys[j])+","+
                value.indexOf(keys[j]) + keys[j].length());
             return;
          }
          a.setStickerFillColor(
              a.getStickerOffset(face) + j,
              colorMap.get(keys[j]));
        }
      }
    }
  }

  getScript() {
    return this.parameters.script;
  }

  setScript(script) {
    this.parameters.script = script;
    this.readScriptParameters(this.cube3d);
  }

  /** Reads the script parameters and applies them to the provided cube 3d.
   *
   * Note:
   * cube3d.validateAttributes() must be called after this method has been invoked.
   */
  readScriptParameters(cube3d) {
    let a = cube3d.attributes;
    let p = this.parameters;

    this.scriptElement = p["scriptelement"];

    let notation = p.scriptNotationObject != null
      ? p.scriptNotationObject
      : new ScriptNotation.DefaultNotation(cube3d.getCube().getLayerCount());

    // parse scriptmacros
    // --------------
    if (p.scriptmacros != null) {
      logger.log('.readParameters scriptmacros:' + p.scriptmacros);
      try {
        this.macros = parseMacroDefinitions(p.scriptmacros);
        logger.log('.readParameters scriptmacros: %o', this.macros);
      } catch (e) {
        logger.error(e);
        logger.error("illegal scriptmacros:\"" + p.scriptmacros + '"');
      }
    }
    // parse script
    // --------------
    this.scriptString = p.script;
    if (p.script != null) {
      logger.log('.readParameters script:' + p.script);
      let parser = new ScriptParser.ScriptParser(notation);
      try {
        this.script = parser.parse(p.script);
      } catch (e) {
        logger.error(e);
        logger.error("illegal script:%s", p.script);
      }
    }
    if (this.script != null) {
      this.scriptSequence = Array.from(this.script.resolvedIterable());
    } else {
      this.scriptSequence = [];
    }

    // parse initscript
    // --------------
    if (p.initscript != null) {
      logger.log('.readParameters initscript:' + p.initscript);
      let parser = new ScriptParser.ScriptParser(notation);
      try {
        this.initScript = parser.parse(p.initscript);
      } catch (e) {
        logger.error(e);
        logger.error("illegal initscript:\"" + p.initscript + '"');
      }
    }
    // parse scriptProgress
    // --------------------
    this.scriptProgress = parseInt(p.scriptprogress);
    logger.log('.readParameters scriptprogress: "'+p.scriptprogress+'" interpreted as '+this.scriptProgress);

    this.updateScriptDiv();
  }

  /** Reads the orientation parameters and applies them to the provided cube 3d.
   *
   * Note:
   * cube3d.validateAttributes() must be called after this method has been invoked.
   */
  readOrientationParameters(cube3d) {
    let a = cube3d.attributes;
    let p = this.parameters;
    // parse alpha and beta
    // --------------
    if (p.alpha != null) {
      logger.log('.readParameters alpha:' + p.alpha);
      cube3d.attributes.xRot = parseFloat(p.alpha);
    }
    if (p.beta != null) {
      logger.log('.readParameters beta:' + p.beta);
      cube3d.attributes.yRot = -parseFloat(p.beta);
    }
  }
  /** Reads the part parameters and applies them to the provided cube 3d.
   *
   * Note:
   * cube3d.validateAttributes() must be called after this method has been invoked.
   */
  readPartParameters(cube3d) {
    let a = cube3d.attributes;
    let p = this.parameters;
    let cube = cube3d.getCube();
    // parse alpha and beta
    // --------------
    if (p.partlist != null) {
      logger.log('.readParameters partlist:' + p.partlist);
      let str = p.partlist;
      let tokens = str.split(/[ ,\n]+/);
      for (let i = 0; i < a.getPartCount(); i++) {
        a.setPartVisible(i, false);
      }


      let isError = false;
      for (let i = 0; i < tokens.length; i++) {
        let partName = tokens[i];
        let partIndex = cube.NAME_PART_MAP[partName];
        if (partIndex == null) {
          logger.error('illegal part:"' + partName + '" in partlist');
          isError = true;
        }
        a.setPartVisible(partIndex, true);
      }
      if (isError) {
        logger.error("illegal partlist:\"" + p.partlist + '"');
      }
    }
  }
}

// ------------------
// Input Handler
// ------------------
class Cube3DHandler extends AbstractCanvas.AbstractHandler {
  constructor(abstractCanvas) {
    super();
    this.canvas = abstractCanvas;
    this.mouseDownX = undefined;
    this.mouseDownY = undefined;
    this.mousePrevX = undefined;
    this.mousePrevY = undefined;
    this.mousePrevTimestamp = undefined;
  }

  /**
   * Touch handler for the canvas object.
   * Forwards everything to the mouse handler.
   */
  onTouchStart(event) {
    if (event.touches.length == 1) {
      event.preventDefault();
      event.clientX = event.touches[0].clientX;
      event.clientY = event.touches[0].clientY;
      this.onMouseDown(event);

      this.mouseDownX = this.mousePrevX = event.touches[0].clientX;
      this.mouseDownY = this.mousePrevY = event.touches[0].clientY;
      this.mousePrevTimeStamp = event.timeStamp;
      this.isMouseDrag = true;
      let isect = this.canvas.mouseIntersectionTest(event);
      this.mouseDownIsect = isect;
      this.isCubeSwipe = isect != null;
    } else {
      this.isMouseDrag = false;
    }
  }
  onTouchEnd(event) {
    event.clientX = this.mousePrevX;
    event.clientY = this.mousePrevY;
    this.onMouseUp(event);
  }
  onTouchMove(event) {
    event.clientX = event.touches[0].clientX;
    event.clientY = event.touches[0].clientY;
    this.onMouseMove(event);
  }
  /**
   * Mouse handler for the canvas object.
   */
  onMouseDown(event) {
    this.mouseDownX = this.mousePrevX = event.clientX;
    this.mouseDownY = this.mousePrevY = event.clientY;
    this.mousePrevTimeStamp = event.timeStamp;
    this.isMouseDrag = event.button == 0;
    let isect = this.canvas.mouseIntersectionTest(event);
    this.mouseDownIsect = isect;
    this.isCubeSwipe = isect != null;
  }
  onMouseMove(event) {
    if (this.isMouseDrag) {
      let x = event.clientX;
      let y = event.clientY;
      let dx2d = (this.mousePrevY - y);
      let dy2d = (this.mousePrevX - x);
      let dx = dx2d * (360 / Math.min(this.canvas.width, this.canvas.height));
      let dy = dy2d * (360 / Math.min(this.canvas.width, this.canvas.height));
      let mouseTimestep = (event.timeStamp - this.mousePrevTimeStamp) / 1000;
      if (this.isCubeSwipe) {
        let cube3d = this.canvas.cube3d;
        let sqrDist = dx2d * dx2d + dy2d * dy2d;
        if (/*!cube3d.isTwisting &&*/ sqrDist > 16) { // min swipe-distance: 4 pixels
          let isect = this.canvas.mouseIntersectionTest(event);
          if (isect != null && isect.face == this.mouseDownIsect.face) {

            let u = Math.floor(isect.uv[0] * cube3d.cube.layerCount);
            let v = Math.floor(isect.uv[1] * cube3d.cube.layerCount);
            let du = isect.uv[0] - this.mouseDownIsect.uv[0];
            let dv = isect.uv[1] - this.mouseDownIsect.uv[1];
            let swipeAngle = Math.atan2(dv, du) * 180 / Math.PI + 180;
            let swipeDirection = Math.round((swipeAngle) / 90) % 4;
            let face = isect.face;
            let axis = cube3d.boxSwipeToAxisMap[face][swipeDirection];
            let layerMask = cube3d.boxSwipeToLayerMap[face][u][v][swipeDirection];
            let angle = cube3d.boxSwipeToAngleMap[face][swipeDirection];
            //this.log('virtualrubik face,u,v,s:'+face+' '+u+' '+v+' '+swipeDirection);
            //this.log('virtualrubik ax,l,an   :'+axis+' '+layerMask+' '+angle);
            if (event.shiftKey || event.metaKey) {
              angle = 2 * angle;
            }
            let cube = cube3d.getCube();
            let move = new ScriptAST.MoveNode(cube.getLayerCount(), axis, layerMask, angle);
            this.canvas.pushMoveOnUndoList(move);
            move.applyTo(this.canvas.cube);
            if (this.canvas.cube.isSolved()) {
              this.canvas.wobble();
            }

            this.isCubeSwipe = false;
            this.isMouseDrag = false;
          }
        }
      } else {
        let rm = new J3DIMath.J3DIMatrix4();
        rm.rotate(dy, 0, 1, 0);
        rm.rotate(dx, 1, 0, 0);
        let v = rm.loghat().divide(Math.max(0.1, mouseTimestep));
        rm.multiply(this.canvas.rotationMatrix); // FIXME - Numerically unstable
        this.canvas.rotationMatrix.load(rm);
        let self = this;
        let start = new Date().getTime();
        let damping = 1;
        let f = function () {
          if (self.canvas.smoothRotationFunction != f)
            return;
          let now = new Date().getTime();
          let h = (now - start) / 1000;
          // Euler Step for 2nd Order ODE
          // ODE:
          //   x'(t) = v(t)
          //   v'(t) = F(t) - ( damping * v(t) ) / m
          // Compute:
          //   x(t0+h) := x(t0) + h * x'(t0)
          //       := x(t0) + h * v(t0);
          //   v(t0+h) := v(t0) + h * v'(t0)
          //       := v(t0) + h * (F(t0)-damping*v(t0))/m
          if (Math.abs(v.norm()) < 0.1) {
            self.canvas.smoothRotationFunction = null;
          } else {
            let rm = new J3DIMath.J3DIVector3(v).multiply(h).exphat();
            rm.multiply(self.canvas.rotationMatrix); // FIXME - Numerically unstable
            self.canvas.rotationMatrix.load(rm);
            let vv = new J3DIMath.J3DIVector3(v);
            if (h * damping < 1) {
              v.subtract(vv.multiply(h * damping));
            } else {
              v.load(0, 0, 0);
            }

            self.canvas.repaint(f);
          }

          start = now;
        };
        this.canvas.smoothRotationFunction = f;
        this.canvas.repaint(f);
      }

      this.mousePrevX = event.clientX;
      this.mousePrevY = event.clientY;
      this.mousePrevTimeStamp = event.timeStamp;
    }
  }
  onMouseOut(event) {
    this.isMouseDrag = false;
  }
  onMouseUp(event) {
    logger.log('AbstractPlayerApplet.onMouseUp ' + event);
    this.isMouseDrag = false;
    this.isCubeSwipe = false;

    let dx = this.mouseDownX - event.clientX;
    let dy = this.mouseDownY - event.clientY;
    let magnitude = dx * dx + dy * dy;

    if (magnitude > 4) {
      // the mouse has been moved too far between mouse down and mouse up
      return;
    }

    let cube3d = this.canvas.cube3d;
    if (cube3d != null && cube3d.isTwisting) {
      cube3d.isTwisting = false;
    }

    let isect = this.canvas.mouseIntersectionTest(event);
    logger.log('AbstractPlayerApplet.onMouseUp ' + event + ' isect: ' + isect);
    if (isect != null) {
      if (event.altKey || event.ctrlKey) {
        isect.angle *= -1;
      }
      if (event.shiftKey || event.metaKey) {
        isect.angle *= 2;
      }
      let cube = cube3d.getCube();
      let move = new ScriptAST.MoveNode(cube.getLayerCount(), isect.axis, isect.layerMask, isect.angle);
      this.canvas.pushMoveOnUndoList(move);
      move.applyTo(this.canvas.cube);
      if (this.canvas.cube.isSolved()) {
        this.canvas.wobble();
      }
    }

    // Make sure that onTouchUp can not reuse these values
    this.mousePrevX = undefined;
    this.mousePrevY = undefined;
    this.canvas.repaint();
  }
}


// ------------------
// MODULE API
// ------------------
export default {
  AbstractPlayerApplet: AbstractPlayerApplet,
  Cube3DHandler: Cube3DHandler
};

