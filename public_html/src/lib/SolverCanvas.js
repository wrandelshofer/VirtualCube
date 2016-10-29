/*
 * @(#)SolverCanvas.js  1.0  2014-02-08
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Base class for objects which can render the user interface of a cube solver
    into an HTML 5 canvas 
    using one of its contexts (3D or 2D context). And which can handle
		input events and forward them.
*/
// --------------
// require.js
// --------------
define("SolverCanvas", ["AbstractCanvas","AbstractPlayerApplet","J3DI","J3DIMath","Node3D","ScriptParser"
    ,"SplineInterpolator",
"RubiksCubeS1Cube3D",
"RubiksCubeS4Cube3D",

"PocketCubeS1Cube3D",
"PocketCubeS4Cube3D",
], 
function(AbstractCanvas,AbstractPlayerApplet,J3DI,J3DIMath,Node3D,ScriptParser,
SplineInterpolator,

RubiksCubeS1Cube3D,
RubiksCubeS3Cube3D,

PocketCubeS1Cube3D,
PocketCubeS4Cube3D
) {

// ===============================
//
// SolverCanvas
//
// ===============================

/** Creates a SolverCanvas. 
    Subclasses must call initSolverCanvas(). */
SolverCanvas = function() {
  this.initSolverCanvas();
}
SolverCanvas.prototype=new AbstractCanvas.AbstractCanvas();

/** Initializes the SolverCanvas object. */
SolverCanvas.prototype.initSolverCanvas = function() {
  this.initAbstractCanvas();
  this.handler=new DnDHandler(this);
  
  this.canvas=null;
  this.cube3d=null;
  this.currentAngle=0;
  this.autorotate=false;
  this.autorotateFunction=null;
  this.rotateFunction=null;
  this.rotationMatrix=new J3DIMatrix4();
  this.smoothRotationFunction=null;
  this.spin=new J3DIVector3();
  this.useFullModel=true;
  this.moves = []; 
}

SolverCanvas.prototype.createCube3D = function() {
  this.debugFPS = this.canvas.getAttribute("debug").indexOf("fps") != -1;
  var c = this.canvas.getAttribute("cube");
  var cname = c;
  var isParts = (cname.lastIndexOf(" parts")==cname.length-6);
  if (isParts) {
    cname = cname.substring(0,cname.length-6);
  }
  
//  console.log('SolverCanvas.createCube3D '+c);
  
  var c3d=null;
    
  // request for optimized model
  if (this.useFullModel) {
    switch (c) {
      default:
      case "Rubik's Cube" :
        return RubiksCubeS1Cube3D.newCube3D();
      case "Pocket Cube" :
        return PocketCubeS1Cube3D.newCube3D();
    }
  } else {
    switch (c) {
      default:
      case "Rubik's Cube" :
        return RubiksCubeS4Cube3D.newCube3D();
      case "Pocket Cube" :
        return PocketCubeS4Cube3D.newCube3D();
    }
  }
}

/** Sets Cube3D object. */
SolverCanvas.prototype.setCube3D = function(cube3d) {
  this.cube3d=cube3d;
}

/** Gets Cube3D object. */
SolverCanvas.prototype.getCube3D = function() {
  return this.cube3d;
}
 /** Initializes the scene.
  * This function is called from init().
  */
SolverCanvas.prototype.initScene = function() {
  var self=this;
  var fRepaint=function() {self.repaint();};
  
  this.world=Node3D.newNode3D();
  this.cube3d=this.createCube3D();
  this.cube3d.repaintFunction=fRepaint;
  this.world.add(this.cube3d);
  this.cube=this.cube3d.cube;
  this.cube3d.addChangeListener(this);
  var attr=this.cube3d.attributes;
  
  this.cubeSize=this.cube3d.partSize*this.cube3d.cube.layerCount; // size of a cube side in centimeters
  this.currentAngle=0;
  this.xRot=attr.xRot;
  this.yRot=attr.yRot;
  
  this.camPos=new J3DIVector3(0,0,-this.cubeSize*1.35);
  this.lookAtPos=new J3DIVector3(0,0,0);
  this.up=new J3DIVector3(0,1,0);
  this.lightPos=new J3DIVector3(4,4,8);
  this.lightNormal=new J3DIVector3(this.lightPos.multiply(-1)).normalize();
  this.observerNormal=new J3DIVector3(this.camPos).normalize();
  
  var stickersImageURL=this.canvas.getAttribute('stickersImage');
  if (stickersImageURL!=null&&stickersImageURL!='null') {
    attr.stickersImageURL=stickersImageURL;
  }
  
  if (attr.stickersImageURL) {
    var txtrURL=this.baseURL+'/textures/';
    this.stickersTexture=J3DI.loadImageTexture(this.gl,attr.stickersImageURL,fRepaint);
  }
  this.cube3d.validateAttributes();
  
  this.cube3dA=this.createCube3D();
  this.world.add(this.cube3dA);
  this.cube3dA.attributes.developmentFactor = 1.0;
  var attr=this.cube3dA.attributes;
  for (var i=0;i<attr.stickersFillColor.length;i++) {
    attr.stickersFillColor[i][0]=120;
    attr.stickersFillColor[i][1]=120;
    attr.stickersFillColor[i][2]=120;
  }

  this.cube3dB=this.createCube3D();
  this.world.add(this.cube3dB);
  this.cube3dB.attributes.developmentFactor = 1.0;
  var attr=this.cube3dB.attributes;
  for (var i=0;i<attr.stickersFillColor.length;i++) {
    attr.stickersFillColor[i][0]=250;
    attr.stickersFillColor[i][1]=250;
    attr.stickersFillColor[i][2]=250;
  }
  
  this.cube3dFoldMatrix = new J3DIMatrix4();
  this.cube3dAFoldMatrix = new J3DIMatrix4();
  this.cube3dBFoldMatrix = new J3DIMatrix4();
  this.cube3dUnfoldMatrix = new J3DIMatrix4();
  this.cube3dUnfoldMatrix.translate(this.cubeSize*-1.05,this.cubeSize*1.05,this.cubeSize*7);
  this.cube3dAUnfoldMatrix = new J3DIMatrix4();
  this.cube3dAUnfoldMatrix.translate(this.cubeSize*-1.05,this.cubeSize*1.05,this.cubeSize*7+this.cubeSize*0.01);
  this.cube3dAFoldScaleFactor = 0.99;
  this.cube3dBTranslation = new J3DIVector3(this.cubeSize*1.15,this.cubeSize*-2.15,0);
  this.cube3dBUnfoldMatrix = new J3DIMatrix4( this.cube3dUnfoldMatrix);
  this.cube3dBUnfoldMatrix.translate(this.cube3dBTranslation[0],this.cube3dBTranslation[1],this.cube3dBTranslation[2]+this.cubeSize*0.01);
  this.cube3dBFoldScaleFactor = 0.1;
  
  this.mvMatrix = new J3DIMatrix4();
  this.perspectiveMatrix = new J3DIMatrix4();
  this.mvpMatrix = new J3DIMatrix4();
  this.mvNormalMatrix = new J3DIMatrix4();
  this.invCameraMatrix=new J3DIMatrix4();  
  this.cameraMatrix=new J3DIMatrix4();  
  this.rotationMatrix = new J3DIMatrix4();
  this.viewportMatrix = new J3DIMatrix4();
  
  this.forceColorUpdate=false;
  this.stickerTransitionsF={};
  this.cube3d.attributes.developmentFactor = 0;
  this.resetStickers();
  this.unfoldCube();
}

SolverCanvas.prototype.resetStickers = function() {
  var cube3d = this.cube3d;
  var cube=cube3d.cube;
  var cubeA=this.cube3dA.cube;
  var cubeB=this.cube3dB.cube;
  cubeA.stickerPos = new Array(cube3d.stickerCount);
  cubeB.stickerPos = new Array(cube3d.stickerCount);
  for (var i=0; i < cube3d.stickerCount; i++) {
    
    if (cube.getPartType(cube3d.getPartIndexForStickerIndex(i)) == cube.SIDE_PART) {
      cubeA.stickerPos[i] = -1;
      cubeB.stickerPos[i] = i;
      cube3d.stickerTranslations[i].matrix.makeIdentity();
      cube3d.stickerTranslations[i].matrix.translate(this.cube3dBTranslation);
    } else {
      cubeA.stickerPos[i] = i;
      cubeB.stickerPos[i] = -1;
      cube3d.stickerTranslations[i].matrix.makeIdentity();
    }
    
    cube3d.stickerLocations[i].matrix.load(cube3d.identityStickerLocations[i]);
    cube3d.stickerOrientations[i].matrix.makeIdentity();
  }
}

SolverCanvas.prototype.unfoldCube = function() {
  if (this.foldCubeTransitionF != null) return;
  var self=this;

  // Keep side stickers in place during transition  
  var cube3d = this.cube3d;
  var cube = cube3d.cube;
  for (var i=0; i < cube3d.stickerCount; i++) {
     cube3d.stickerTranslations[i].matrix.makeIdentity();
  }
  
  // transition effect
  var start=new Date().getTime();
  var delay1=250;
  var duration1 = 1500;
  var interpolator1 = SplineInterpolator.newSplineInterpolator(0, 0, 1, 1);
  var delay2=0;
  var duration2 = 1000;
  var interpolator2 = SplineInterpolator.newSplineInterpolator(0.25, 0, 0.75, 1);
  var delay3=1000;
  var duration3 = 1250;
  var interpolator3 = SplineInterpolator.newSplineInterpolator(0.75, 0, 1, 1);

  var key1=start;
  while (key1 in self.stickerTransitionsF) {
    key1--;
  }
  var f1=function () {
    if (! (key1 in self.stickerTransitionsF)) return;
    var now=new Date().getTime();
    var elapsed=now-start-delay1;
    var value=elapsed/duration1;
    if (value<0) {
    } else if (value<1) {
      var fraction = interpolator1.getFraction(value);
      self.cube3d.matrix.load(J3DIMath.rigidLerp(self.cube3dFoldMatrix, self.cube3dUnfoldMatrix, fraction));      
      self.cube3dA.matrix.load(J3DIMath.rigidLerp(self.cube3dAFoldMatrix, self.cube3dAUnfoldMatrix, fraction));      
      self.cube3dA.matrix.scale(self.cube3dAFoldScaleFactor*(1-fraction)+1*(fraction));      
      self.cube3dB.matrix.load(J3DIMath.rigidLerp(self.cube3dBFoldMatrix, self.cube3dBUnfoldMatrix, fraction));      
      self.cube3dB.matrix.scale(self.cube3dBFoldScaleFactor*(1-fraction)+1*(fraction));      
      self.cube3d.updateAttributes();  
    } else {
      self.cube3d.matrix.load(self.cube3dUnfoldMatrix);      
      self.cube3dA.matrix.load(self.cube3dAUnfoldMatrix);         
      self.cube3dB.matrix.load(self.cube3dBUnfoldMatrix);         
      delete self.stickerTransitionsF[key1];
    }
    self.repaint(f1);
  }
  self.stickerTransitionsF[key1] = true;
  self.repaint(f1);  
  //---
  var key2=start;
  while (key2 in self.stickerTransitionsF) {
    key2--;
  }
  var f2=function () {
    if (! (key2 in self.stickerTransitionsF)) return;
    var now=new Date().getTime();
    var elapsed=now-start-delay2;
    var value=elapsed/duration2;
    if (value<0) {
    } else if (value<1) {
      var fraction = interpolator2.getFraction(value);
      self.cube3d.attributes.developmentFactor = fraction;
      self.cube3dA.attributes.developmentFactor = fraction;
      self.cube3dB.attributes.developmentFactor = fraction;
    } else {
      self.cube3d.attributes.developmentFactor = 1;
      self.cube3dA.attributes.developmentFactor = 1;
      self.cube3dB.attributes.developmentFactor = 1;
      delete self.stickerTransitionsF[key2];
    }
    self.repaint(f2);
  }
  self.stickerTransitionsF[key2] = true;
  self.repaint(f2);  
  //---
  var key3=start;
  while (key3 in self.stickerTransitionsF) {
    key3--;
  }
  var f3=function () {
    if (! (key3 in self.stickerTransitionsF)) return;
    var now=new Date().getTime();
    var elapsed=now-start-delay3;
    var value=elapsed/duration3;
    if (value<0) {
    } else if (value<1) {
      var fraction = interpolator3.getFraction(value);
      for (var i=0; i < cube3d.stickerCount; i++) {
        if (cube.getPartType(cube3d.getPartIndexForStickerIndex(i)) == cube.SIDE_PART) {
          cube3d.stickerTranslations[i].matrix.makeIdentity();
          cube3d.stickerTranslations[i].matrix.translate(self.cube3dBTranslation[0]*fraction,
            self.cube3dBTranslation[1]*fraction,
            self.cube3dBTranslation[2]*fraction);
         }
       }
    } else {
      for (var i=0; i < cube3d.stickerCount; i++) {
        if (cube.getPartType(cube3d.getPartIndexForStickerIndex(i)) == cube.SIDE_PART) {
          cube3d.stickerTranslations[i].matrix.makeIdentity();
          cube3d.stickerTranslations[i].matrix.translate(self.cube3dBTranslation);
         }
       }
      delete self.stickerTransitionsF[key3];
    }
    self.repaint(f3);
  }
  self.stickerTransitionsF[key3] = true;
  self.repaint(f3);  
  /*
  //---
  var start=new Date().getTime();  
  var duration = 1000;
  var interpolator = SplineInterpolator.newSplineInterpolator(0, 0, 1, 1);
  var f=function () {
    if (self.foldCubeTransitionF != f) return;
    
    var now=new Date().getTime();
    var elapsed=now-start;
    var value=elapsed/duration;
    if (value<1) {
      var fraction = interpolator.getFraction(value);
      
      self.cube3d.attributes.developmentFactor = fraction;
      self.cube3d.matrix.load(J3DIMath.rigidLerp(self.cube3dFoldMatrix, self.cube3dUnfoldMatrix, fraction));      
      
      self.cube3dA.attributes.developmentFactor = fraction;
      self.cube3dA.matrix.load(J3DIMath.rigidLerp(self.cube3dAFoldMatrix, self.cube3dAUnfoldMatrix, fraction));      
      self.cube3dA.matrix.scale(self.cube3dAFoldScaleFactor*(1-fraction)+1*(fraction));      
      self.cube3dB.attributes.developmentFactor = fraction;
      self.cube3dB.matrix.load(J3DIMath.rigidLerp(self.cube3dBFoldMatrix, self.cube3dBUnfoldMatrix, fraction));      
      self.cube3dB.matrix.scale(self.cube3dBFoldScaleFactor*(1-fraction)+1*(fraction));      
      
      self.cube3d.updateAttributes();  
      self.repaint(f);
    } else {
      self.cube3d.attributes.developmentFactor = 1;
      self.cube3dA.attributes.developmentFactor = 1;
      self.cube3dB.attributes.developmentFactor = 1;
      self.cube3d.matrix.load(self.cube3dUnfoldMatrix);      
      self.cube3dA.matrix.load(self.cube3dAUnfoldMatrix);         
      self.cube3dB.matrix.load(self.cube3dBUnfoldMatrix);         
      self.cube3d.updateAttributes();  
      self.foldCubeTransitionF = null;
    }
  }
  this.foldCubeTransitionF = f;
  this.stickerTransitionsF = {};
  this.repaint(f);*/
}
SolverCanvas.prototype.foldCube = function() {
  if (this.foldCubeTransitionF != null) return;
  var self=this;
  
  this.resetStickers();
  
  // transition effect
  var start=new Date().getTime();  
  var duration = 1000;
  var interpolator = SplineInterpolator.newSplineInterpolator(0, 0, 1, 1);
  var f=function () {
    if (self.foldCubeTransitionF != f) return;
    
    var now=new Date().getTime();
    var elapsed=now-start;
    var value=elapsed/duration;
    if (value<1) {
      var fraction = interpolator.getFraction(1.0 - value);
      self.cube3d.attributes.developmentFactor = fraction;
      self.cube3d.matrix.load(J3DIMath.rigidLerp(self.cube3dFoldMatrix, self.cube3dUnfoldMatrix, fraction));      
      self.cube3dA.attributes.developmentFactor = fraction;
      self.cube3dA.matrix.load(J3DIMath.rigidLerp(self.cube3dAFoldMatrix, self.cube3dAUnfoldMatrix, fraction));      
      self.cube3dA.matrix.scale(self.cube3dAFoldScaleFactor*(1-fraction)+1*(fraction));      
      self.cube3dB.attributes.developmentFactor = fraction;
      self.cube3dB.matrix.load(J3DIMath.rigidLerp(self.cube3dBFoldMatrix, self.cube3dBUnfoldMatrix, fraction));      
      self.cube3dB.matrix.scale(self.cube3dBFoldScaleFactor*(1-fraction)+1*(fraction));      
      self.cube3d.updateAttributes();  
      self.repaint(f);
    } else {
      self.cube3d.attributes.developmentFactor = 0;
      self.cube3dA.attributes.developmentFactor = 0;
      self.cube3dB.attributes.developmentFactor = 0;
      self.cube3d.matrix.load(self.cube3dFoldMatrix);      
      self.cube3dA.matrix.load(self.cube3dAFoldMatrix);      
      self.cube3dB.matrix.load(self.cube3dBFoldMatrix);      
      self.cube3d.updateAttributes();  
      self.foldCubeTransitionF = null;
    }
  }
  this.foldCubeTransitionF = f;
  this.repaint(f);
}

SolverCanvas.prototype.updateMatrices = function() {
  var cube3d=this.cube3d;
  var aspectRatio = this.width / this.height;

  // Update the perspective matrix
  this.cameraMatrix.makeIdentity();
  this.cameraMatrix.lookat(
        this.camPos[0], this.camPos[1], this.camPos[2], 
        this.lookAtPos[0], this.lookAtPos[1], this.lookAtPos[2], 
        this.up[0], this.up[1], this.up[2]
        );
  
  
  var flip=new J3DIMatrix4();
  flip.scale(1,1,-1);
  flip.multiply(this.cameraMatrix);
  this.cameraMatrix.load(flip);    
  
  this.perspectiveMatrix.makeIdentity();
  this.perspectiveMatrix.perspective(30, aspectRatio, 1, cube3d.partSize*20);
  this.perspectiveMatrix.multiply(this.cameraMatrix);
    
  this.invCameraMatrix.load(this.cameraMatrix);
  this.invCameraMatrix.invert();
  this.rasterToCameraMatrix = new J3DIMatrix4(this.perspectiveMatrix);
  this.rasterToCameraMatrix.invert();
    
  // world-view transformation
  var attr=cube3d.attributes;
  var wvMatrix = this.world.matrix;
  wvMatrix.makeIdentity();
  if (attr.developmentFactor == 0) {
    // FIXME make a smooth transitions
    wvMatrix.multiply(this.rotationMatrix);
  }
  wvMatrix.rotate(attr.xRot*J3DIMath.clamp(1-attr.developmentFactor,0,1),1,0,0);
  wvMatrix.rotate(attr.yRot*J3DIMath.clamp(1-attr.developmentFactor,0,1),0,-1,0);
  wvMatrix.rotate(this.currentAngle, 1,1,1);
  var scaleFactor =0.4*attr.scaleFactor;  
  wvMatrix.scale(scaleFactor,scaleFactor,scaleFactor);
}


/** Draws the scene. */
SolverCanvas.prototype.draw = function() {
  if (!this.camPos) return;

  this.reshape();
  this.updateMatrices();
  this.cube3d.doValidateDevelopAttributes();
  var self=this;
  
  this.clearCanvas();

  var start = new Date().getTime();	
  this.faceCount=0;
  if (false&&this.cube3d.isDrawTwoPass) {
    if (this.cube3d.attributes.developmentFactor > 0) {
      this.drawTwoPass(this.cube3dA);
      this.drawTwoPass(this.cube3dB);
    }
    this.drawTwoPass(this.cube3d);
  } else {
    if (this.cube3d.attributes.developmentFactor > 0) {
      this.drawSinglePass(this.cube3dA);
      this.drawSinglePass(this.cube3dB);
    }
    this.drawSinglePass(this.cube3d);
  }

  if (this.debugFPS && this.g != null) {
    var end = new Date().getTime();	
    var elapsed=end-start;
    var g=this.g;
    g.fillStyle='rgb(0,0,0)';
    g.fillText("faces:"+(this.faceCount)+
      " elapsed:"+(end-start)
      ,20,20);
  }
}
SolverCanvas.prototype.drawSinglePass = function(cube3d) {
  var self=this;
  //var cube3d=this.cube3d;
  cube3d.repainter=this;
  var attr=cube3d.attributes;
  cube3d.updateAttributes();

  // part colors
  var ccenter=attr.partsFillColor[cube3d.centerOffset];
  var cparts=attr.partsFillColor[cube3d.cornerOffset];
  var mvMatrix=this.mvMatrix;

  var drawBody = attr.developmentFactor == 0;
  
  // draw center parts
  for (var i=0;i<cube3d.centerCount;i++) {
    mvMatrix.makeIdentity();
    cube3d.parts[cube3d.centerOffset+i].transform(mvMatrix);
    if (drawBody) this.drawObject(cube3d.centerObj, mvMatrix, ccenter,attr.partsPhong[this.cube3d.centerOffset+i]);  
  }
 
  // draw side parts
  for (var i=0;i<cube3d.sideCount;i++) {
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.sideOffset+i].transform(mvMatrix);
      if (drawBody) this.drawObject(cube3d.sideObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.sideOffset+i]);  
      
      var si=cube3d.getStickerIndexForPartIndex(cube3d.sideOffset+i,0);
      mvMatrix.makeIdentity();
      if (attr.developmentFactor < 1.0) {
        cube3d.currentStickerTransforms[si].transform(mvMatrix);
      } else {
        cube3d.stickers[si].transform(mvMatrix);
      }
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
  }
  
  // draw edge parts
  for (var i=0;i<cube3d.edgeCount;i++) {
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.edgeOffset+i].transform(mvMatrix);
      if (drawBody) this.drawObject(cube3d.edgeObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.edgeOffset+i]);  

      var si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,0);
      mvMatrix.makeIdentity();
      if (attr.developmentFactor < 1.0) {
        cube3d.currentStickerTransforms[si].transform(mvMatrix);
      } else {
        cube3d.stickers[si].transform(mvMatrix);
      }
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
      
      si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,1);
      mvMatrix.makeIdentity();
      if (attr.developmentFactor < 1.0) {
        cube3d.currentStickerTransforms[si].transform(mvMatrix);
      } else {
        cube3d.stickers[si].transform(mvMatrix);
      }
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
  }
  // draw corner parts
  for (var i=0;i<cube3d.cornerCount;i++) {
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.cornerOffset+i].transform(mvMatrix);
      if (drawBody) this.drawObject(cube3d.cornerObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.cornerOffset+i],this.forceColorUpdate);  
      var si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,1);
      mvMatrix.makeIdentity();
      if (attr.developmentFactor < 1.0) {
        cube3d.currentStickerTransforms[si].transform(mvMatrix);
      } else {
        cube3d.stickers[si].transform(mvMatrix);
      }
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
      si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,0);
      mvMatrix.makeIdentity();
      if (attr.developmentFactor < 1.0) {
        cube3d.currentStickerTransforms[si].transform(mvMatrix);
      } else {
        cube3d.stickers[si].transform(mvMatrix);
      }
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
      si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,2);
      mvMatrix.makeIdentity();
      if (attr.developmentFactor < 1.0) {
        cube3d.currentStickerTransforms[si].transform(mvMatrix);
      } else {
        cube3d.stickers[si].transform(mvMatrix);
      }
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
  }
  this.flushCanvas();
  this.forceColorUpdate=false;
  //this.checkGLError('...draw');
	
}
/** Draws the scene. */
SolverCanvas.prototype.drawTwoPass = function(cube3d) {
  //var cube3d=this.cube3d;
  cube3d.repainter=this;
  cube3d.validateAttributes();
  
  var attr=cube3d.attributes;

  // part colors
  var ccenter=attr.partsFillColor[cube3d.centerOffset];
  var cparts=attr.partsFillColor[cube3d.cornerOffset];
  
  // model view transformation
  var mvMatrix=this.mvMatrix;
  var drawBody = attr.developmentFactor == 0;

  if (drawBody) {
    // draw center parts
    for (var i=0;i<this.cube3d.centerCount;i++) {
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.centerOffset+i].transform(mvMatrix);
      this.drawObject(cube3d.centerObj, mvMatrix, ccenter,attr.partsPhong[cube3d.centerOffset+i]);  
    }
    // draw side parts
    for (var i=0;i<cube3d.sideCount;i++) {
        mvMatrix.makeIdentity();
        cube3d.parts[cube3d.sideOffset+i].transform(mvMatrix);
        this.drawObject(cube3d.sideObj, mvMatrix, cparts, attr.partsPhong[cube3d.sideOffset+i]);  
    }
    // draw edge parts
    for (var i=0;i<cube3d.edgeCount;i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.edgeOffset+i].transform(mvMatrix);
        this.drawObject(cube3d.edgeObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.edgeOffset+i]);  
    }
    // draw corner parts
    for (var i=0;i<cube3d.cornerCount;i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.cornerOffset+i].transform(mvMatrix);
        this.drawObject(cube3d.cornerObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.cornerOffset+i],this.forceColorUpdate);  
    }
    this.flushCanvas();
  }
  // draw side stickers
  for (var i=0;i<cube3d.sideCount;i++) {
      var si=cube3d.getStickerIndexForPartIndex(cube3d.sideOffset+i,0);
      mvMatrix.makeIdentity();
      cube3d.rotationTransforms[i].transform(mvMatrix);
      cube3d.developedStickers[si].transform(mvMatrix);
      var si=cube3d.getStickerIndexForPartIndex(cube3d.sideOffset+i,0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
  }
  // draw edge stickers
  for (var i=0;i<cube3d.edgeCount;i++) {
      var si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,0);
      mvMatrix.makeIdentity();
      cube3d.rotationTransforms[i].transform(mvMatrix);
      cube3d.developedStickers[si].transform(mvMatrix);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
      si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,1);
      mvMatrix.makeIdentity();
      cube3d.rotationTransforms[i].transform(mvMatrix);
      cube3d.developedStickers[si].transform(mvMatrix);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
  }
  // draw corner stickers
  for (var i=0;i<cube3d.cornerCount;i++) {
      this.cube3d.parts[cube3d.cornerOffset+i].transform(mvMatrix);
      var si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,1);
      mvMatrix.makeIdentity();
      cube3d.rotationTransforms[i].transform(mvMatrix);
      cube3d.developedStickers[si].transform(mvMatrix);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
      si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,0);
      mvMatrix.makeIdentity();
      cube3d.rotationTransforms[i].transform(mvMatrix);
      cube3d.developedStickers[si].transform(mvMatrix);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
      si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,2);
      mvMatrix.makeIdentity();
      cube3d.rotationTransforms[i].transform(mvMatrix);
      cube3d.developedStickers[si].transform(mvMatrix);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
  }
  //gl.flush();
  this.forceColorUpdate=false;
  this.flushCanvas();
}
/** Clears the canvas. */
SolverCanvas.prototype.clearCanvas = function() {
}
/** Ends a draw pass. */
SolverCanvas.prototype.flushCanvas = function() {
}
SolverCanvas.prototype.reset = function() {
  this.currentAngle=0;
  this.xRot=this.cube3d.attributes.xRot;
  this.yRot=this.cube3d.attributes.yRot;
  this.rotationMatrix.makeIdentity();
  this.smoothRotationFunction=null;
  this.moves = [];

  if (this.cube3d.attributes.developmentFactor == 0) {
    this.unfoldCube();  
  } else {
    this.foldCube();  
  }
}


/** Play. Scrambles or solves the cube.
 */
SolverCanvas.prototype.play = function() {
  if (this.cube.isSolved()) {
    this.scramble();
  } else {
    this.solve();
  }
}
/** Play. Scrambles or solves the cube.
 */
SolverCanvas.prototype.solveStep = function() {
  // Wait until we can lock the cube. This prevents that multiple
  // twist operations run concurrently.
  var owner=new Object();
  if (!this.cube.lock(owner)) {
    return false;
  }
  this.cube.unlock(owner);
  
  return this.doSolveStep();
}
/** Protected method. */
SolverCanvas.prototype.doSolveStep = function() {
  if (this.cube.isSolved()) {
    this.moves = [];
    return true;
  } else if (this.moves.length == 0) {
    this.reset();
    return true;
  } else {
    var move = this.moves.pop();
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
SolverCanvas.prototype.solve = function() {
  var self=this;
  var owner=new Object();
  var f=function() {
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
        self.cube3d.attributes.twistDuration=self.cube3d.attributes.scrambleTwistDuration;
        
        if (! self.cube.cancel) {
          // => not cancelled? solve one step
          if (! self.doSolveStep()) {
            // => not solved? go again
            self.repaint(f);
            return;
          }
        }
        
        // => We are done: Restore the speed
        self.cube3d.attributes.twistDuration=self.cube3d.attributes.userTwistDuration;
        
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
SolverCanvas.prototype.scramble = function(scrambleCount,animate) {
  if (scrambleCount==null) scrambleCount=16;
  if (animate==null) animate=true;
  
  var self=this;
  
    
  // Create random moves
  var parser=ScriptParser.newScriptParser();
  parser.layerCount=this.cube3d.cube.layerCount;
  var scrambleNodes=parser.createRandomScript(scrambleCount);
  this.moves = this.moves.concat(scrambleNodes);
  
  // Perform the scrambling moves
  if (! animate) {
    var f=function() {
        // Cancel all other lenghty operations
        self.cube.cancel=true;
      
        // Wait until cube3d has finished twisting
        if (self.cube3d.isTwisting) {
          self.repaint(f);
          return;
        }
        
        // Scramble the cube
        for (var i=0;i<scrambleNodes.length;i++) {
          scrambleNodes[i].applyTo(self.cube);
        }
        
        // Other lenghty operations are go now
        self.cube.cancel=false;
    };
    this.repaint(f);
    return;
  }
  
  var next=0; // next twist to be performed
  var owner=new Object();
  var f=function() {
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
    
        if (next==0) {
          // => First move: Speed the cube up 
          self.cube3d.attributes.twistDuration=self.cube3d.attributes.scrambleTwistDuration;
        }  

        if (self.cube.cancel) {
          // => cancel? gently stop scrambling
          next=scrambleNodes.length;
        }
        
        // Initiate the next move
        if (next<scrambleNodes.length) {
          scrambleNodes[next].applyTo(self.cube);
          next++;
          self.repaint(f);
        } else {
          // => We are done: Restore the speed
          self.cube3d.attributes.twistDuration=self.cube3d.attributes.userTwistDuration;
          
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
SolverCanvas.prototype.setAutorotate = function(newValue) {
  if (newValue != this.autorotate) {
    this.autorotate=newValue;
    if (newValue) {
      var self=this;
      var start=new Date().getTime();
      var anglePerSecond=20;
      var prev=start;
      var startAngle=this.currentAngle;
      this.autorotateFunction=function() {
          if (self.autorotate) self.repaint(self.autorotateFunction);
          var now=new Date().getTime();
          var elapsed=now-start;
          self.currentAngle=(startAngle+elapsed*anglePerSecond/1000)%360;
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
SolverCanvas.prototype.rotate = function(dx,dy) {
      var rm=new J3DIMatrix4();
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
SolverCanvas.prototype.wobble = function(amount, duration) {
  if (amount==null) amount=0.3;
  if (duration==null) duration=500;
  
      var self=this;
      var start=new Date().getTime();
      var f=function() {
          var now=new Date().getTime();
          var elapsed=now-start;
          var x=elapsed/duration;
          if (x<1) {
            self.repaint(f);
        //    self.cube3d.attributes.scaleFactor=1+0.3*Math.sin(Math.PI*x);
            self.cube3d.attributes.scaleFactor=1+amount*Math.pow(1-Math.pow(x*2-1,2),4);
          } else {
            self.cube3d.attributes.scaleFactor=1;
          }
      };
      this.repaint(f);
}
/**
 * Explodes the cube.
 *
 * @param newValue A boolean.
 */
SolverCanvas.prototype.explode = function(amount,duration) {
  if (amount==null) amount=2;
  if (duration==null) duration=2000;
  
      var self=this;
      var start=new Date().getTime();
      var f=function() {
          var now=new Date().getTime();
          var elapsed=now-start;
          var x=elapsed/duration;
          if (x<1) {
            self.repaint(f);
            self.cube3d.attributes.explosionFactor=amount*Math.pow(1-Math.pow(x*2-1,2),4);
            self.cube3d.updateExplosionFactor();
          } else {
            self.cube3d.attributes.explosionFactor=0;
            self.cube3d.updateExplosionFactor();
          }
      };
      this.repaint(f);
}

SolverCanvas.prototype.undo = function(event) {
  // implement me
}

SolverCanvas.prototype.stateChanged = function(event) {
  this.repaint();
}


SolverCanvas.prototype.getCubeAttributes = function() {
  return this.cube3d.attributes;
}
SolverCanvas.prototype.setCubeAttributes = function(attr) {
  this.cube3d.attributes=attr;
  this.forceColorUpdate=true;
  
  var gl=this.gl;  
  gl.clearColor(attr.backgroundColor[0]/255.0, attr.backgroundColor[1]/255.0, 
                attr.backgroundColor[2]/255.0, attr.backgroundColor[3]/255.0);
}
/**
 * Hit test for mouse events.
 */
SolverCanvas.prototype.mouseIntersectionTest = function(event) {
  // point in raster coordinates
  var rect = this.canvas.getBoundingClientRect();  
  var pRaster=new J3DIVector3(event.clientX - rect.left, event.clientY - rect.top, 0);
  
  // point in camera coordinates
  var pCamera=new J3DIVector3((pRaster[0] - this.width/2)/this.width*2, (pRaster[1] - this.height/2)/-this.height*2, 0);
  
  // point in world coordinates
  var pWorld = new J3DIVector3(pCamera);
  pWorld.multVecMatrix(this.rasterToCameraMatrix);

  // Inverse model-world matrix
  var wmMatrix = new J3DIMatrix4(this.world.matrix);
  wmMatrix.multiply(this.cube3d.matrix);
  wmMatrix.invert();
  
  // point in model coordinates
  var pModel =  new J3DIVector3(pWorld);
  pModel.multVecMatrix(wmMatrix);

  // camera ray in model coordinates
  var ray={point:new J3DIVector3(), dir:new J3DIVector3()};
  ray.point.load(this.camPos);
  ray.point.multVecMatrix(wmMatrix);
  ray.dir.load(pModel);
  ray.dir.subtract(ray.point);
  ray.dir.normalize();
  
  var isect = this.cube3d.intersect(ray);
  
  return isect;
}
/**
 * Hit test for mouse events on a developed cube.
 */
SolverCanvas.prototype.mouseIntersectionTestDeveloped = function(event, cube3d) {
  if (cube3d == null) return null;
  
  // point in raster coordinates
  var rect = this.canvas.getBoundingClientRect();  
  var pRaster=new J3DIVector3(event.clientX - rect.left, event.clientY - rect.top, 0);
  
  // point in camera coordinates
  var pCamera=new J3DIVector3((pRaster[0] - this.width/2)/this.width*2, (pRaster[1] - this.height/2)/-this.height*2, 0);
  
  // point in world coordinates
  var pWorld = new J3DIVector3(pCamera);
  pWorld.multVecMatrix(this.rasterToCameraMatrix);

  // Inverse model-world matrix
  var wmMatrix = new J3DIMatrix4(this.world.matrix);
  wmMatrix.multiply(cube3d.matrix);
  wmMatrix.invert();
  
  // point in model coordinates
  var pModel =  new J3DIVector3(pWorld);
  pModel.multVecMatrix(wmMatrix);

  // camera ray in model coordinates
  var ray={point:new J3DIVector3(), dir:new J3DIVector3()};
  ray.point.load(this.camPos);
  ray.point.multVecMatrix(wmMatrix);
  ray.dir.load(pModel);
  ray.dir.subtract(ray.point);
  ray.dir.normalize();
  
  var isect = cube3d.intersectDeveloped(ray);
  
  return isect;
}
/**
 * Hit test for mouse events on a developed cube.
 */
SolverCanvas.prototype.mouseIntersectionTestPlane = function(event, plane) {
  // point in raster coordinates
  var rect = this.canvas.getBoundingClientRect();  
  var pRaster=new J3DIVector3(event.clientX - rect.left, event.clientY - rect.top, 0);
  
  // point in camera coordinates
  var pCamera=new J3DIVector3((pRaster[0] - this.width/2)/this.width*2, (pRaster[1] - this.height/2)/-this.height*2, 0);
  
  // point in world coordinates
  var pWorld = new J3DIVector3(pCamera);
  pWorld.multVecMatrix(this.rasterToCameraMatrix);

  // Inverse model-world matrix
  var wmMatrix = new J3DIMatrix4(this.world.matrix);
  wmMatrix.multiply(this.cube3d.matrix);
  wmMatrix.invert();
  
  // point in model coordinates
  var pModel =  new J3DIVector3(pWorld);
  pModel.multVecMatrix(wmMatrix);

  // camera ray in model coordinates
  var ray={point:new J3DIVector3(), dir:new J3DIVector3()};
  ray.point.load(this.camPos);
  ray.point.multVecMatrix(wmMatrix);
  ray.dir.load(pModel);
  ray.dir.subtract(ray.point);
  ray.dir.normalize();
  
  isect = J3DIMath.intersectPlane(ray, plane);
   
  return isect;
}

// ------------------
// Input Handler
// ------------------
DnDHandler = function (abstractCanvas) {
  this.canvas = abstractCanvas;
  
  this.mouseDownX=undefined;
  this.mouseDownY=undefined;
  this.mousePrevX=undefined;
  this.mousePrevY=undefined;
  this.mousePrevTimestamp=undefined;
  this.mouseDownStickerMatrix = new J3DIMatrix4();
}

DnDHandler.prototype = new AbstractCanvas.AbstractHandler(null);

/**
 * Touch handler for the canvas object.
 * Forwards everything to the mouse handler.
 */
DnDHandler.prototype.onTouchStart = function(event) {
  if (event.touches.length == 1) {
    event.preventDefault();
    event.clientX=event.touches[0].clientX;
    event.clientY=event.touches[0].clientY;
    this.onMouseDown(event);
  } else {
    this.isMouseDrag = false;
  }
}
DnDHandler.prototype.onTouchEnd = function(event) {
  event.clientX=this.mousePrevX;
  event.clientY=this.mousePrevY;
  this.onMouseUp(event);
}
DnDHandler.prototype.onTouchMove = function(event) {
  event.clientX=event.touches[0].clientX;
  event.clientY=event.touches[0].clientY;
  this.onMouseMove(event);
}
/**
 * Mouse handler for the canvas object.
 */
DnDHandler.prototype.onMouseDown = function(event) {
  this.mouseDownX=event.clientX;
  this.mouseDownY=event.clientY;
  this.mousePrevX=event.clientX;
  this.mousePrevY=event.clientY;
  this.mousePrevTimeStamp=event.timeStamp;
  this.isMouseDrag = true;
  var cube3d = this.canvas.cube3d;
  var cube=cube3d.cube;
  var cubeA=this.canvas.cube3dA.cube;
  var cubeB=this.canvas.cube3dB.cube;
  var isect = this.canvas.mouseIntersectionTestDeveloped(event,this.canvas.cube3d);
  if (isect != null) {
    if (cubeA.stickerPos[isect.sticker] == -1) {
      isect = null;
    } else if (cube.getPartType(cube3d.getPartIndexForStickerIndex(isect.sticker)) == cube.SIDE_PART) {
      // side parts are not located on source cube
      isect = null;
    } else {
      var i = isect.sticker;
      isect.srcFacelet = isect.sticker;
      isect.sticker = cubeA.stickerPos[i];
      isect.srcCube = cubeA;
    }
  }
  if (isect == null) {
    isect = this.canvas.mouseIntersectionTestDeveloped(event,this.canvas.cube3dB);
    if (isect != null) {
      if (cubeB.stickerPos[isect.sticker] == -1) {
        isect = null;
      } else if (cube.getPartType(cube3d.getPartIndexForStickerIndex(isect.sticker)) == cube.SIDE_PART) {
        // side parts are rotated
        var cube = cube3d.cube;
        var sideIndex=cube.getTypedIndexForPartIndex(cube3d.getPartIndexForStickerIndex(isect.sticker));
        cube.sideOrient[sideIndex] = (cube.sideOrient[sideIndex]+1)%4;
        this.snapStickerDo(isect.sticker,isect.sticker,cube.sideOrient[sideIndex],200);
        isect = null;
      } else {
        var i = isect.sticker;
        isect.srcFacelet = isect.sticker;
        isect.sticker = cubeB.stickerPos[i];
        isect.srcCube = cubeB;
      }
    }
  }
  
  this.mouseDownIsect = isect;
  if (this.mouseDownIsect != null) {
   this.mouseDownStickerMatrix.load(this.canvas.cube3d.stickerTranslations[this.mouseDownIsect.sticker]);
  }
}
DnDHandler.prototype.onMouseMove = function(event) {
  if (this.isMouseDrag) {
    var x = event.clientX;
    var y = event.clientY;
    
    if (this.mouseDownIsect != null) {
      var isect0=this.mouseDownIsect;
      var isect1 = this.canvas.mouseIntersectionTestPlane(event,isect0.plane)
      var m=this.canvas.cube3d.stickerTranslations[isect0.sticker].matrix;
      m.load(this.mouseDownStickerMatrix);
      m.translate(isect1.point[0] - isect0.point[0],
                  isect1.point[1] - isect0.point[1],
                  isect1.point[2] - isect0.point[2]);
      //console.log('SolverCanvas.onMouseMove '+isect0.sticker+' translate'+new J3DIVector3(isect1.point[0]-isect0.point[0],isect1.point[1]-isect0.point[1],isect1.point[2]-isect0.point[2]));
      this.canvas.repaint();
    }
    
    this.mousePrevX=event.clientX;
    this.mousePrevY=event.clientY;
    this.mousePrevTimeStamp=event.timeStamp;
  }
}
DnDHandler.prototype.onMouseOut = function(event) {
  this.isMouseDrag=false;
  if (this.mouseDownIsect != null) {
    this.snapSticker(this.mouseDownIsect.sticker,this.mouseDownIsect.cube3d,null,null);
    this.mouseDownIsect = null;
  }
}
DnDHandler.prototype.onMouseUp = function(event) {
  this.isMouseDrag=false;
  this.isCubeSwipe=false;
  
  if (this.mouseDownIsect != null) {
    var isect=this.canvas.mouseIntersectionTestDeveloped(event,this.canvas.cube3dB);
    var cube = this.canvas.cube3d.cube;
    if (isect == null
      || cube.getPartType(isect.part) != cube.getPartType(this.mouseDownIsect.part)) {
      this.snapSticker(
        this.mouseDownIsect.sticker,
        this.mouseDownIsect.srcFacelet,this.mouseDownIsect.srcCube,
        null,null);
    } else {
      this.snapSticker(
        this.mouseDownIsect.sticker,
        this.mouseDownIsect.srcFacelet,this.mouseDownIsect.srcCube,
        isect.sticker,this.canvas.cube3dB.cube);
    }
    this.mouseDownIsect = null;
  }
    
  if (this.mouseDownX!=event.clientX || this.mouseDownY!=event.clientY) {
    // the mouse has been moved between mouse down and mouse up
    return;
  }
  
  var cube3d=this.canvas.cube3d;
  if (cube3d!=null&&cube3d.isTwisting) {
    return;
  }
  
  
  // Make sure that onTouchUp can not reuse these values
  this.mousePrevX = undefined;
  this.mousePrevY = undefined;
  
  this.canvas.repaint();
}
/** Snaps a sticker while ensuring correct model state. 
 * Snapping a single sticker may cause multiple stickers to be
 * moved.
 *
 * @param sticker The index of the sticker to be snapped
 * @param srcFacelet The facelet index (index)
 * @param srcCube The drag source cube (cube3d or cube3dB)
 * @param tgtFacelet The facelet index (index or null)
 * @param cube3dTo The drag target cube (cube3dB or null)
 */
DnDHandler.prototype.snapSticker = function(sticker,srcFacelet,srcCube,tgtFacelet,tgtCube) {
  var canvas = this.canvas;
  var cube3d = canvas.cube3d;
  var cube = cube3d.cube;
  var cubeA = canvas.cube3dA.cube;
  var cubeB = canvas.cube3dB.cube;

  var stkP = cube3d.getPartIndexForStickerIndex(sticker);
  var stkO = cube3d.getPartOrientationForStickerIndex(sticker);

  var srcP = cube3d.getPartIndexForStickerIndex(srcFacelet);
  var srcO = cube3d.getPartOrientationForStickerIndex(srcFacelet);

  var tgtP = null;
  var tgtO = null;
  
  var occSticker = -1;
  
  if (tgtFacelet != null) {
    tgtP = cube3d.getPartIndexForStickerIndex(tgtFacelet);
    tgtO = cube3d.getPartOrientationForStickerIndex(tgtFacelet);
    occSticker = tgtCube.stickerPos[tgtFacelet];
  }
  
  var longDuration = 300;
  var shortDuration = 100;
  
  // If the target is occupied by another part, the target must be moved back
  if (tgtFacelet != null && occSticker != -1 && stkP != cube3d.getPartIndexForStickerIndex(occSticker)) {
      
    // Move occupying sticker back to cubeA
    if (cube.getPartType(tgtP) == cube.EDGE_PART) {
      var tgtFacelet2 = cube3d.getStickerIndexForPartIndex(tgtP,(tgtO+1)%2);
      var occSticker2 = tgtCube.stickerPos[tgtFacelet2];
      cubeB.stickerPos[tgtFacelet]=-1;
      cubeB.stickerPos[tgtFacelet2]=-1;
      cubeA.stickerPos[occSticker]=occSticker;
      cubeA.stickerPos[occSticker2]=occSticker2;
      this.snapStickerDo(occSticker,null,null, longDuration);
      this.snapStickerDo(occSticker2,null,null, longDuration);
   } else if (cube.getPartType(tgtP) == cube.CORNER_PART) {
      var tgtFacelet2 = cube3d.getStickerIndexForPartIndex(tgtP,(tgtO+1)%3);
      var occSticker2 = tgtCube.stickerPos[tgtFacelet2];
      var tgtFacelet3 = cube3d.getStickerIndexForPartIndex(tgtP,(tgtO+2)%3);
      var occSticker3 = tgtCube.stickerPos[tgtFacelet3];
      cubeB.stickerPos[tgtFacelet]=-1;
      cubeB.stickerPos[tgtFacelet2]=-1;
      cubeB.stickerPos[tgtFacelet3]=-1;
      cubeA.stickerPos[occSticker]=occSticker;
      cubeA.stickerPos[occSticker2]=occSticker2;
      cubeA.stickerPos[occSticker3]=occSticker3;
      this.snapStickerDo(occSticker,null,null, longDuration);
      this.snapStickerDo(occSticker2,null,null, longDuration);
      this.snapStickerDo(occSticker3,null,null, longDuration);
    } else {
      cubeB.stickerPos[tgtFacelet]=-1;
      cubeA.stickerPos[occSticker]=occSticker;
      this.snapStickerDo(occSticker,null,null, longDuration);
    }
  }
  
  if (tgtFacelet != null) {
    // => Snap sticker to target
    if (cube.getPartType(srcP) == cube.EDGE_PART) {
      var sticker2 = cube3d.getStickerIndexForPartIndex(stkP,(stkO+1)%2);
      var srcFacelet2 = cube3d.getStickerIndexForPartIndex(srcP,(srcO+1)%2);
      var tgtFacelet2 = cube3d.getStickerIndexForPartIndex(tgtP,(tgtO+1)%2);
      srcCube.stickerPos[srcFacelet]=-1;
      srcCube.stickerPos[srcFacelet2]=-1;
      tgtCube.stickerPos[tgtFacelet]=sticker;
      tgtCube.stickerPos[tgtFacelet2]=sticker2;
      this.snapStickerDo(sticker,tgtFacelet,null, shortDuration);
      this.snapStickerDo(sticker2,tgtFacelet2,null, longDuration);
    } else if (cube.getPartType(srcP) == cube.CORNER_PART) {
      var sticker2 = cube3d.getStickerIndexForPartIndex(stkP,(stkO+1)%3);
      var sticker3 = cube3d.getStickerIndexForPartIndex(stkP,(stkO+2)%3);
      var srcFacelet2 = cube3d.getStickerIndexForPartIndex(srcP,(srcO+1)%3);
      var tgtFacelet2 = cube3d.getStickerIndexForPartIndex(tgtP,(tgtO+1)%3);
      var srcFacelet3 = cube3d.getStickerIndexForPartIndex(srcP,(srcO+2)%3);
      var tgtFacelet3 = cube3d.getStickerIndexForPartIndex(tgtP,(tgtO+2)%3);
      srcCube.stickerPos[srcFacelet]=-1;
      srcCube.stickerPos[srcFacelet2]=-1;
      srcCube.stickerPos[srcFacelet3]=-1;
      tgtCube.stickerPos[tgtFacelet]=sticker;
      tgtCube.stickerPos[tgtFacelet2]=sticker2;
      tgtCube.stickerPos[tgtFacelet3]=sticker3;
      this.snapStickerDo(sticker,tgtFacelet,null, shortDuration);
      this.snapStickerDo(sticker2,tgtFacelet2,null, longDuration);
      this.snapStickerDo(sticker3,tgtFacelet3,null, longDuration);
    } else {
      srcCube.stickerPos[srcFacelet]=-1;
      tgtCube.stickerPos[tgtFacelet]=sticker;
      this.snapStickerDo(sticker,tgtFacelet,null, longDuration);
    }
  } else {
    // => tgtFacelet == null
    
    // Snap sticker back to cube A
    var srcPartType = cube.getPartType(srcP);
    if (srcPartType == cube.EDGE_PART) {
      var sticker2 = cube3d.getStickerIndexForPartIndex(stkP,(stkO+1)%2);
      var srcFacelet2 = cube3d.getStickerIndexForPartIndex(srcP,(srcO+1)%2);
      srcCube.stickerPos[srcFacelet]=-1;
      srcCube.stickerPos[srcFacelet2]=-1;
      cubeA.stickerPos[sticker]=sticker;
      cubeA.stickerPos[sticker2]=sticker2;
console.log('srcCube '+srcFacelet+'=-'+sticker+','+srcFacelet2+'=-'+sticker2);      
      this.snapStickerDo(sticker,null,null, shortDuration);
      this.snapStickerDo(sticker2,null,null, longDuration);
   } else if (srcPartType == cube.CORNER_PART) {
      var sticker2 = cube3d.getStickerIndexForPartIndex(stkP,(stkO+1)%3);
      var srcFacelet2 = cube3d.getStickerIndexForPartIndex(srcP,(srcO+1)%3);
      var sticker3 = cube3d.getStickerIndexForPartIndex(stkP,(stkO+2)%3);
      var srcFacelet3 = cube3d.getStickerIndexForPartIndex(srcP,(srcO+2)%3);
console.log('srcCube '+srcFacelet+'=-'+sticker+','+srcFacelet2+'=-'+sticker2+','+srcFacelet3+'=-'+sticker3);  
      srcCube.stickerPos[srcFacelet]=-1;
      srcCube.stickerPos[srcFacelet2]=-1;
      srcCube.stickerPos[srcFacelet3]=-1;
      cubeA.stickerPos[sticker]=sticker;
      cubeA.stickerPos[sticker2]=sticker2;
      cubeA.stickerPos[sticker3]=sticker3;
      this.snapStickerDo(sticker,null,null, shortDuration);
      this.snapStickerDo(sticker2,null,null, longDuration);
      this.snapStickerDo(sticker3,null,null, longDuration);
    } else {
      srcCube.stickerPos[sticker]=sticker;
      this.snapStickerDo(sticker,null,null, shortDuration);
    }
  }
}
/** Snaps a single sticker on the view without caring about model state. */
DnDHandler.prototype.snapStickerDo = function(sticker,tgtFacelet, orientation, duration) {
  
  var canvas = this.canvas;
  
  if (canvas == null || canvas.cube3d == null || canvas.cube3d.stickerTranslations[sticker] == null) {
    console.log(new Error('canvas:'+canvas+' sticker:'+sticker));
  }
  
  // translation
  var currentT = canvas.cube3d.stickerTranslations[sticker].matrix;
  var startPosT = new J3DIMatrix4(currentT);
  var endPosT = new J3DIMatrix4();
  if (tgtFacelet != null) {
    endPosT.translate(canvas.cube3dBTranslation);
  } 
  // location 
  var currentL = canvas.cube3d.stickerLocations[sticker].matrix;
  var startPosL = new J3DIMatrix4(currentL);
  var endPosL = new J3DIMatrix4();
  endPosL.load(canvas.cube3d.identityStickerLocations[tgtFacelet!=null?tgtFacelet:sticker]);

  // orientation
  var currentO = canvas.cube3d.stickerOrientations[sticker].matrix;
  var startPosO = new J3DIMatrix4(currentO);
  var endPosO = new J3DIMatrix4();
  if (orientation != null) {
    endPosO.rotate(orientation*360/4,1,0,0);
  }
  
  // Perform the transition effect
  var start=new Date().getTime();
  //var duration = 200;
  if (duration === undefined) duration = 200;
  var interpolator = SplineInterpolator.newSplineInterpolator(0, 0, 1, 1);
  var key=start;
  while (key in canvas.stickerTransitionsF) {
    key--;
  }
  var f=function () {
    if (! (key in canvas.stickerTransitionsF)) return;
    
    var now=new Date().getTime();
    var elapsed=now-start;
    var value=elapsed/duration;
    if (value<1) {
      var fraction = interpolator.getFraction(value);
      currentT.load(J3DIMath.rigidLerp(startPosT, endPosT, fraction));      
      currentL.load(J3DIMath.rigidLerp(startPosL, endPosL, fraction));      
      currentO.load(J3DIMath.rigidLerp(startPosO, endPosO, fraction));      
    } else {
      currentT.load(endPosT);      
      currentL.load(endPosL);      
      currentO.load(endPosO);      
      delete canvas.stickerTransitionsF[key];
    }
    canvas.repaint(f);
  }
  canvas.stickerTransitionsF[key] = true;
  canvas.repaint(f);  
}

// ------------------
// MODULE API    
// ------------------
return {
  newSolverCanvas : function () { return new SolverCanvas(); },
  newDnDHandler : function () { return new DnDHandler(); }
};
});
