/*
 * @(#)AbstractPlayerApplet.js  3.0  2016-09-16
 * Copyright (c) 2013 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

/** Base class for objects which can render a Cube3D into an HTML 5 canvas 
 using one of its contexts (3D or 2D context). And which can handle
 input events and forward them to the Cube3D.
 */
/** Renders a Cube3D into an HTML 5 canvas 
 using its WebGL 3D context. 
 */
// --------------
// require.js
// --------------
define("AbstractPlayerApplet", ["AbstractCanvas", "Node3D", "J3DI", "J3DIMath", "Notation",
  "ScriptAST", "ScriptParser", "Tokenizer",

  "RubiksCubeS1Cube3D",
  "RubiksCubeS4Cube3D",
  "RubiksCubeS5Cube3D",

  "PocketCubeS1Cube3D",
  "PocketCubeS4Cube3D",
  "PocketCubeS5Cube3D"
],
  function (AbstractCanvas, Node3D, J3DI, J3DIMath, Notation,
    AST, ScriptParser, Tokenizer,
    RubiksCubeS1Cube3D,
    RubiksCubeS4Cube3D,
    RubiksCubeS5Cube3D,
    PocketCubeS1Cube3D,
    PocketCubeS4Cube3D,
    PocketCubeS5Cube3D
    ) {

    let module = {
      log: (false) ? console.log : ()=>{},
      info: (true) ? console.info : ()=>{},
      warning: (true) ? console.warning : ()=>{},
      error: (true) ? console.error : ()=>{}
    }
// 
// ===============================
//
// Module functions
//
// ===============================


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
      let map = [];
      if (str == null)
        return map;

      let tokens = str.split(/([ =,\n]+)/);
      let elementIndex = 0;
      for (let i = 0; i < tokens.length; ) {
        let key = null;
        if (i < tokens.length - 1 && tokens[i + 1].indexOf('=') != -1) {
          // found a key
          if (!tokens[i].match(/^\w+$/)) {
            module.error('illegal key:"' + key + '" in map:"' + str + '"');
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
            map[key] = rgbaValue;
          }
          map[elementIndex] = rgbaValue;

          i++; // consume value
          elementIndex++; // increase element index
        } else if (tokens[i].match(/^[ ,]+$/)) {
          // found a separator
          i++; // consume separator
        } else {
          module.error('illegal token:"' + tokens[i] + '" in map:"' + str + '"');
          break;
        }
      }
      return map;
    }
    /** Parses a word list into an array.
     *
     *  EBNF: (|)=choice, []=optional, {}=zero or more, (* *)=comment
     * 
     *  list = value, { [','] , {' '} , value } ;
     *  value = (* word *) ;
     */
    let parseWordList = function (str) {
      let map = [];
      if (str == null)
        return map;

      let tokens = str.split(/([ ,]+)/);
      let elementIndex = 0;
      for (let i = 0; i < tokens.length; ) {
        if (tokens[i].match(/^[ ,]+$/)) {
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
    let parserMacroDefinitions = function (str) {
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
          throw new ScriptParser.ParseException("= expected, ch:" + equal, t.getPosition() - 1, t.getPosition())
        t.skipWhitespace();
        quote = t.read();
        if (quote == null)
          throw new ScriptParser.ParseException("quote around value expected, ch:" + ch, t.getPosition() - 1, t.getPosition())
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
        this.rotationMatrix = new J3DIMatrix4();
        this.smoothRotationFunction = null;
        this.spin = new J3DIVector3();
        this.useFullModel = true;
        this.moves = [];
        this.undoList = [];
        this.redoIndex = 0;

        // applet parameters
        // FIXME some parameters are read from here, and others are read
        // directly from the canvas
        this.parameters = {
          // note: all parameters delivered from html are lowercase!
          baseurl: 'lib/',
          colortable: null, //frdblu (deprecated)
          colorlist: null, //rufldb
        };
      }

      createCube3D() {
        this.debugFPS = this.canvas.getAttribute("debug").indexOf("fps") != -1;
        let c = this.canvas.getAttribute("kind");
        let cname = c == null || c == "null" ? "" : c.trim();
        if (cname.length == 0) {
          cname = "RubiksCube";
        }
        let isParts = (cname.lastIndexOf(" parts") == cname.length - 6);
        if (isParts) {
          cname = cname.substring(0, cname.length - 6);
        }
        let isSpecificModel = (cname.lastIndexOf(" s") == cname.length - 3);
        if (!isSpecificModel) {
          if (this.useFullModel) {
            cname = cname + ' s4';
          } else {
            cname = cname + ' s2';
          }
        }

        let c3d = null;
        switch (cname) {
          case "RubiksCube s1" :
          case "RubiksCube s2" :
            c3d = new RubiksCubeS1Cube3D.Cube3D();
            break;
          case "RubiksCube s3" :
          case "RubiksCube s4" :
            c3d = new RubiksCubeS4Cube3D.Cube3D();
            break;
          case "RubiksCube s5" :
            c3d = new RubiksCubeS5Cube3D.Cube3D();
            break;

          case "PocketCube s1" :
          case "PocketCube s2" :
            c3d = new PocketCubeS1Cube3D.Cube3D();
            break;
          case "PocketCube s3" :
          case "PocketCube s4" :
            c3d = new PocketCubeS4Cube3D.Cube3D();
            break;
          case "PocketCube s5" :
            c3d = new PocketCubeS5Cube3D.Cube3D();
            break;



          default :
            module.error('illegal cube attribute :' + cname);
            if (this.useFullModel) {
              c3d = new RubiksCubeS4Cube3D.Cube3D();
            } else {
              c3d = new RubiksCubeS1Cube3D.Cube3D();
            }
        }
        if (c3d != null) {
          c3d.baseUrl = this.parameters.baseurl;
          c3d.loadGeometry();

          if (isParts) {
            let a = c3d.attributes;
            for (let i = 0; i < a.stickersFillColor.length; i++) {
              a.stickersFillColor[i] = a.partsFillColor[0];
              a.stickersPhong[i] = a.partsPhong[0];
            }
          }
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
        this.readParameters(this.cube3d);
        this.cube3d.repaintFunction = fRepaint;
        this.cubeSize = this.cube3d.partSize * this.cube3d.cube.layerCount; // size of a cube side in centimeters
        this.world.add(this.cube3d);
        this.cube = this.cube3d.cube;
        this.cube3d.addChangeListener(this);
        let attr = this.cube3d.attributes;

        this.cubeSize = this.cube3d.partSize * this.cube3d.cube.layerCount; // size of a cube side in centimeters
        this.currentAngle = 0;
        this.xRot = attr.xRot;
        this.yRot = attr.yRot;
        this.camPos = new J3DIVector3(0, 0, -this.cubeSize * 1.35);
        this.lookAtPos = new J3DIVector3(0, 0, 0);
        this.up = new J3DIVector3(0, 1, 0);
        this.lightPos = new J3DIVector3(4, -4, 8);
        this.lightNormal = new J3DIVector3(-4, 4, -8).normalize();
        this.observerNormal = new J3DIVector3(this.camPos).normalize();

        let stickersImageURL = this.canvas.getAttribute('stickersImage');
        if (stickersImageURL != null && stickersImageURL != 'null') {
          attr.stickersImageURL = stickersImageURL;
        }

        if (attr.stickersImageURL) {
          J3DI.loadImageTexture(this.gl, attr.stickersImageURL, (texture)=>{
            this.stickersTexture=texture;
            fRepaint();
          });
        }
        this.cube3d.validateAttributes();


        this.mvMatrix = new J3DIMatrix4();
        this.perspectiveMatrix = new J3DIMatrix4();
        this.mvpMatrix = new J3DIMatrix4();
        this.mvNormalMatrix = new J3DIMatrix4();
        this.invCameraMatrix = new J3DIMatrix4();
        this.cameraMatrix = new J3DIMatrix4();
        this.rotationMatrix = new J3DIMatrix4();
        this.viewportMatrix = new J3DIMatrix4();

        this.forceColorUpdate = false;

        this.reset();
      }

      updateMatrices() {
        // Update the perspective matrix
        this.cameraMatrix.makeIdentity();
        this.cameraMatrix.lookat(
          this.camPos[0], this.camPos[1], this.camPos[2],
          this.lookAtPos[0], this.lookAtPos[1], this.lookAtPos[2],
          this.up[0], this.up[1], this.up[2]
          );

        let flip = new J3DIMatrix4();
        flip.scale(1, 1, -1);
        flip.multiply(this.cameraMatrix);
        this.cameraMatrix.load(flip);

        this.perspectiveMatrix.makeIdentity();
        this.perspectiveMatrix.perspective(30, this.width / this.height, 1, 12);
        this.perspectiveMatrix.multiply(this.cameraMatrix);
        //    this.perspectiveMatrix.scale(1,1,1);

        this.invCameraMatrix.load(this.cameraMatrix);
        this.invCameraMatrix.invert();
        this.rasterToCameraMatrix = new J3DIMatrix4(this.perspectiveMatrix);
        this.rasterToCameraMatrix.invert();

        // world-view transformation
        let attr = this.cube3d.attributes;
        let wvMatrix = this.world.matrix;
        wvMatrix.makeIdentity();
        wvMatrix.multiply(this.rotationMatrix);
        wvMatrix.rotate(attr.xRot, 1, 0, 0);
        wvMatrix.rotate(attr.yRot, 0, -1, 0);
        wvMatrix.rotate(this.currentAngle, 1, 1, 1);
        let scaleFactor = 0.4 * attr.scaleFactor;
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
        //this.clearGLError('draw...');

        //if (!this.camPos) return;

        //   this.reshape();
        //   this.updateMatrices();
        let self = this;

        //  this.clearCanvas();

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
          this.drawObject(cube3d.sideObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.sideOffset + i]);

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
          this.drawObject(cube3d.edgeObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.edgeOffset + i]);

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
          this.drawObject(cube3d.cornerObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.cornerOffset + i], this.forceColorUpdate);
          let si = cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset + i, 1);
          this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si], this.forceColorUpdate);
          si = cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset + i, 0);
          this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si], this.forceColorUpdate);
          si = cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset + i, 2);
          this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si], this.forceColorUpdate);
        }
        this.flushCanvas();
        this.forceColorUpdate = false;
        //this.checkGLError('...draw');

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
            this.drawObject(cube3d.sideObj, mvMatrix, cparts, attr.partsPhong[cube3d.sideOffset + i]);
          }
          // draw edge parts
          for (let i = 0; i < cube3d.edgeCount; i++) {
            mvMatrix.makeIdentity();
            this.cube3d.parts[cube3d.edgeOffset + i].transform(mvMatrix);
            this.drawObject(cube3d.edgeObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.edgeOffset + i]);
          }
          // draw corner parts
          for (let i = 0; i < cube3d.cornerCount; i++) {
            mvMatrix.makeIdentity();
            this.cube3d.parts[cube3d.cornerOffset + i].transform(mvMatrix);
            this.drawObject(cube3d.cornerObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.cornerOffset + i], this.forceColorUpdate);
          }
          /*
           // The steps above only collect triangles
           // we sort them by depth, and draw them
           let tri = this.deferredFaces.splice(0,this.deferredFaceCount);
           tri.sort(function(a,b){return b.depth - a.depth});
           for (let i=0;i<tri.length;i++) {
           tri[i].draw(g);
           }*/
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
        /*
         //gl.flush();
         this.forceColorUpdate=false;
         // The steps above only collect triangles
         // we sort them by depth, and draw them
         let tri = this.deferredFaces.splice(0,this.deferredFaceCount);
         tri.sort(function(a,b){return b.depth - a.depth});
         for (let i=0;i<tri.length;i++) {
         tri[i].draw(g);
         }*/
      }

      reset() {
        this.currentAngle = 0;
        this.xRot = this.cube3d.attributes.xRot;
        this.yRot = this.cube3d.attributes.yRot;
        this.rotationMatrix.makeIdentity();
        this.smoothRotationFunction = null;
        this.moves = [];

        let self = this;
        let f = function () {
          // Cancel all other lenghty operations
          self.cube.cancel = true;

          // Wait until cube3d has finished twisting
          if (self.cube3d.isTwisting) {
            self.repaint(f);// busy wait
            return;
          }
          // remove repainter needed for animation
          self.cube3d.repainter = null;

          // Reset cube
          self.cube.reset();
          if (self.initscript != null) {
            self.initscript.applyTo(self.cube);
          }

          self.clearUndoRedo();

          // reinstall repainter needed for animation
          self.cube3d.repainter = this;
          // Other lenghty operations are go now
          self.cube.cancel = false;
        };
        this.repaint(f);
        return;
      }
      /** @param move twistNode. */
      pushMove(move) {
        // subclass responsibility
        this.moves.push(move);

        if (this.redoIndex < this.undoList.length) {
          this.undoList = this.undoList.splice(0, this.redoIndex);
        }

        this.undoList.push(move);
        this.redoIndex = this.undoList.length;
      }

      /** FIXME Does not update this.moves ! */
      undo() {
        if (this.redoIndex > 0) {
          let move = this.undoList[--this.redoIndex];
          move.applyInverseTo(this.cube);
          if (this.cube.isSolved()) {
            this.wobble();
          }
        }
      }
      /** FIXME Does not update this.moves ! */
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

      /** Play. Scrambles or solves the cube.
       */
      play() {
        if (this.cube.isSolved()) {
          this.scramble();
        } else {
          this.solve();
        }
      }
      /** Play. Scrambles or solves the cube.
       */
      solveStep() {
        // Wait until we can lock the cube. This prevents that multiple
        // twist operations run concurrently.
        let owner = new Object();
        if (!this.cube.lock(owner)) {
          return false;
        }
        this.cube.unlock(owner);

        return this.doSolveStep();
      }
      /** Protected method. */
      doSolveStep() {
        if (this.cube.isSolved()) {
          this.moves = [];
          return true;
        } else if (this.moves.length == 0) {
          this.reset();
          return true;
        } else {
          let move = this.moves.pop();
          move.applyInverseTo(this.cube);
          if (this.cube.isSolved()) {
            this.moves = [];
            this.wobble();
            return true;
          }
          return false;
        }
      }
      /** Solves the cube.
       */
      solve() {
        let self = this;
        let owner = new Object();
        let f = function () {
          // Wait until we can lock the cube. This prevents that multiple
          // scramble operations run concurrently.
          if (!self.cube.lock(owner)) {
            self.repaint(f);
            return;
          }
          // Wait until cube3d has finished twisting
          if (self.cube3d.isTwisting) {
            self.repaint(f);
            return;
          }
          // => First move: Speed the cube up 
          self.cube3d.attributes.twistDuration = self.cube3d.attributes.scrambleTwistDuration;

          if (!self.cube.cancel) {
            // => not cancelled? solve one step
            if (!self.doSolveStep()) {
              // => not solved? go again
              self.repaint(f);
              return;
            }
          }

          // => We are done: Restore the speed
          self.cube3d.attributes.twistDuration = self.cube3d.attributes.userTwistDuration;

          // => Clear undo/redo list
          self.clearUndoRedo();

          // Unlock the cube
          self.cube.unlock(owner);
        };
        this.repaint(f);
      }

      /** Scrambles the cube.
       * @param scrambleCount Number > 1.
       * @param animate       Boolean. Whether to animate to cube or just snap
       *                               into scrambled position.
       */
      scramble(scrambleCount, animate) {
        if (scrambleCount == null)
          scrambleCount = 16;
        if (animate == null)
          animate = true;

        let self = this;

        // => Clear undo/redo list
        this.clearUndoRedo();


        // Create random moves
        let layerCount = this.cube3d.cube.layerCount;
        let scrambleNodes = ScriptParser.createRandomScript(layerCount, scrambleCount);
        this.moves = this.moves.concat(scrambleNodes);

        // Perform the scrambling moves
        if (!animate) {
          let f = function () {
            // Cancel all other lenghty operations
            self.cube.cancel = true;

            // Wait until cube3d has finished twisting
            if (self.cube3d.isTwisting) {
              self.repaint(f);// busy wait!!!
              return;
            }

            // Scramble the cube
            for (let i = 0; i < scrambleNodes.length; i++) {
              scrambleNodes[i].applyTo(self.cube);
            }

            // Other lenghty operations are go now
            self.cube.cancel = false;
          };
          this.repaint(f);
          return;
        }

        let next = 0; // next twist to be performed
        let owner = new Object();
        let f = function () {
          // Wait until we can lock the cube. This prevents that multiple
          // scramble operations run concurrently.
          if (!self.cube.lock(owner)) {
            self.repaint(f);
            return;
          }
          // Wait until cube3d has finished twisting
          if (self.cube3d.isTwisting) {
            self.repaint(f);
            return;
          }

          if (next == 0) {
            // => First move: Speed the cube up 
            self.cube3d.attributes.twistDuration = self.cube3d.attributes.scrambleTwistDuration;
          }

          if (self.cube.cancel) {
            // => cancel? gently stop scrambling
            next = scrambleNodes.length;
          }

          // Initiate the next move
          if (next < scrambleNodes.length) {
            scrambleNodes[next].applyTo(self.cube);
            next++;
            self.repaint(f);
          } else {
            // => We are done: Restore the speed
            self.cube3d.attributes.twistDuration = self.cube3d.attributes.userTwistDuration;

            // Unlock the cube
            self.cube.unlock(owner);
          }

        };
        this.repaint(f);
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
        let rm = new J3DIMatrix4();
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
            //    self.cube3d.attributes.scaleFactor=1+0.3*Math.sin(Math.PI*x);
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
      /**
       * Hit test for mouse events.
       */
      mouseIntersectionTest(event) {
        // point in raster coordinates
        let rect = this.canvas.getBoundingClientRect();
        let pRaster = new J3DIVector3(event.clientX - rect.left, event.clientY - rect.top, 0);

        // point in camera coordinates
        let pCamera = new J3DIVector3((pRaster[0] - this.width / 2) / this.width * 2, (pRaster[1] - this.height / 2) / -this.height * 2, 0);

        // point in world coordinates
        let pWorld = new J3DIVector3(pCamera);
        pWorld.multVecMatrix(this.rasterToCameraMatrix);

        // Inverse model-world matrix
        let wmMatrix = new J3DIMatrix4(this.world.matrix);
        wmMatrix.multiply(this.cube3d.matrix);
        wmMatrix.invert();

        // point in model coordinates
        let pModel = new J3DIVector3(pWorld);
        pModel.multVecMatrix(wmMatrix);

        // camera ray in model coordinates
        let ray = {point: new J3DIVector3(), dir: new J3DIVector3()};
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

        let deprecatedFaceIndices = [2, 0, 3, 5, 4, 1]; // maps FRDBLU to RUFLDB

        // parse default colorMap
        // --------------
        let deprecatedColorMap = {};//parseColorMap("r=#ff4600,u=#ffd200,f=#003373,l=#8c000f,d=#f8f8f8,b=#00732f");
        let colorMap = parseColorMap("r=#ffd200,u=#003373,f=#8c000f,l=#f8f8f8,d=#00732f,b=#ff4600");
        for (let k in colorMap) {
          if (k >= 0 && k <= colorMap.length) {
            deprecatedColorMap[k] = colorMap[deprecatedFaceIndices[k]];
          } else {
            deprecatedColorMap[k] = colorMap[k];
          }
        }

        // parse colorMap from parameter "colorTable"
        // this parameter is deprecated but still supported
        // note: in RubikPlayerApplet the colorTable is defined FRDBLU
        //       in VirtualRubikApplet the colorTable is defined RUFDLB
        //       we use the RubikPlayerApplet definition

        if (p.colortable != null) {
          module.log('.readParameters colortable:' + p.colortable);
          module.warning('the parameter "colorTable" is deprecated, use "colorList" instead.');
          let parsedColorMap = parseColorMap(p.colortable);

          for (let k in parsedColorMap) {
            if (0 <= k && k < deprecatedFaceIndices.length) {
              colorMap[deprecatedFaceIndices[k]] = parsedColorMap[k];
            } else {
              colorMap[k] = parsedColorMap[k];
            }
          }
          deprecatedColorMap = colorMap;
        }

        // parse colorMap from parameter "colorList"
        if (p.colorlist != null) {
          module.log('.readParameters colorlist:' + p.colorlist);
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
          module.log('.readParameters faces:' + p.faces);
          module.warning('the parameter "faces" is deprecated, please use "faceList" instead.');
          let parsedIndices = parseWordList(p.faces);
          for (let i in parsedIndices) {
            faceIndices[deprecatedFaceIndices[i]] = parsedIndices[i];
          }
          currentColorMap = deprecatedColorMap;
        }
        // parse faceIndices from faceList
        if (p.facelist != null) {
          module.log('.readParameters facelist:' + p.facelist);
          faceIndices = parseWordList(p.facelist);
        }

        // apply face indices
        for (let i = 0; i < a.getFaceCount(); i++) {
          let color = currentColorMap[faceIndices[i]];
          if (color != null) {
            let face = i;
            let offset = a.getStickerOffset(face);
            for (let j = 0; j < a.getStickerCount(face); j++) {
              a.stickersFillColor[offset + j] = color;
            }
          }
        }
      }
      /** Reads the script parameters and applies them to the provided cube 3d.
       *
       * Note:
       * cube3d.validateAttributes() must be called after this method has been invoked.
       */
      readScriptParameters(cube3d) {
        let a = cube3d.attributes;
        let p = this.parameters;

        // parse resourceFile
        // --------------
        if (p.resourcefile != null) {
          module.log('.readParameters resourcefile:' + p.resourcefile);
          // FIXME implement me
        }

        // FIXME parse notation
        // ----------
        let notation = new Notation.DefaultNotation();

        // parse scriptmacros
        // --------------
        if (p.scriptmacros != null) {
          module.log('.readParameters scriptmacros:' + p.scriptmacros);
          try {
            this.macros = parserMacroDefinitions(p.scriptmacros);
            module.log('.readParameters scriptmacros: %o', this.macros);
          } catch (e) {
            module.error(e);
            module.error("illegal scriptmacros:\"" + p.scriptmacros + '"');
          }
        }
        // parse script
        // --------------
        if (p.script != null) {
          module.log('.readParameters script:' + p.script);
          let parser = new ScriptParser.ScriptParser(notation);
          try {
            this.script = parser.parse(p.script);
          } catch (e) {
            module.error(e);
            module.error("illegal script:%s" , p.script);
          }
        }
        // parse initscript
        // --------------
        if (p.initscript != null) {
          module.log('.readParameters initscript:' + p.initscript);
          let notation = new Notation.DefaultNotation();
          let parser = new ScriptParser.ScriptParser(notation);
          try {
            this.initscript = parser.parse(p.initscript);
          } catch (e) {
            module.error(e);
            module.error("illegal initscript:\"" + p.initscript + '"');
          }
        }
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
          module.log('.readParameters alpha:' + p.alpha);
          cube3d.attributes.xRot = parseFloat(p.alpha);
        }
        if (p.beta != null) {
          module.log('.readParameters beta:' + p.beta);
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
          module.log('.readParameters partlist:' + p.partlist);
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
              module.error('illegal part:"' + partName + '" in partlist');
              isError = true;
            }
            a.setPartVisible(partIndex, true);
          }
          if (isError) {
            module.error("illegal partlist:\"" + p.partlist + '"');
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
        this.mouseDownX = event.clientX;
        this.mouseDownY = event.clientY;
        this.mousePrevX = event.clientX;
        this.mousePrevY = event.clientY;
        this.mousePrevTimeStamp = event.timeStamp;
        this.isMouseDrag = true;
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
          let dx = dx2d * (360 / this.canvas.width);
          let dy = dy2d * (360 / this.canvas.height);
          let mouseTimestep = (event.timeStamp - this.mousePrevTimeStamp) / 1000;

          if (this.isCubeSwipe) {
            let cube3d = this.canvas.cube3d;
            let sqrDist = dx2d * dx2d + dy2d * dy2d;
            if (!cube3d.isTwisting && sqrDist > 16) { // min swipe-distance: 4 pixels
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
                let move = new AST.MoveNode(cube.getLayerCount(), axis, layerMask, angle);
                this.canvas.pushMove(move);
                move.applyTo(this.canvas.cube);
                if (this.canvas.cube.isSolved()) {
                  this.canvas.wobble();
                }

                this.isCubeSwipe = false;
                this.isMouseDrag = false;
              }
            }
          } else {
            let rm = new J3DIMatrix4();
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
              //           := x(t0) + h * v(t0);
              //   v(t0+h) := v(t0) + h * v'(t0)
              //           := v(t0) + h * (F(t0)-dampings*v(t0))/m
              if (Math.abs(v.norm()) < 0.1) {
                self.canvas.smoothRotationFunction = null;
              } else {
                let rm = new J3DIVector3(v).multiply(h).exphat();
                rm.multiply(self.canvas.rotationMatrix); // FIXME - Numerically unstable
                self.canvas.rotationMatrix.load(rm);

                let vv = new J3DIVector3(v);
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
        this.isMouseDrag = false;
        this.isCubeSwipe = false;


        if (this.mouseDownX != event.clientX || this.mouseDownY != event.clientY) {
          // the mouse has been moved between mouse down and mouse up
          return;
        }

        let cube3d = this.canvas.cube3d;
        if (cube3d != null && cube3d.isTwisting) {
          return;
        }

        let isect = this.canvas.mouseIntersectionTest(event);

        if (isect != null) {
          if (event.altKey || event.ctrlKey) {
            isect.angle *= -1;
          }
          if (event.shiftKey || event.metaKey) {
            isect.angle *= 2;
          }
          let cube = cube3d.getCube();
          let move = new AST.MoveNode(cube.getLayerCount(), isect.axis, isect.layerMask, isect.angle);
          this.canvas.pushMove(move);
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
    return {
      AbstractPlayerApplet: AbstractPlayerApplet,
      Cube3DHandler: Cube3DHandler
    };
  }
);
