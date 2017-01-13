/*
 * @(#)TwoDPlayerApplet.js  1.0  2013-12-30
 * Copyright (c) 2013 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

/** Renders a Cube3D into an HTML 5 canvas 
    using its 2D context. 
*/
// --------------
// require.js
// --------------
define("TwoDPlayerApplet", ["AbstractPlayerApplet","Node3D","J3DI"], 
function (AbstractPlayerApplet,Node3D,J3DI) {



// ===============================
//
// TwoDPlayerApplet
//
// ===============================

/** Creates a TwoDPlayerApplet. 
    Subclasses must call initTwoDCube3DCanvas(). */
class TwoDPlayerApplet extends AbstractPlayerApplet.AbstractPlayerApplet {
  constructor() {
    super();
    this.initTwoDCube3DCanvas();
  }
}


/** Initializes the TwoDPlayerApplet object. */
TwoDPlayerApplet.prototype.initTwoDCube3DCanvas = function() {
  this.g=null; //2d context
  this.useFullModel=false; //to prevent performance problems
  
}

/** Opens the canvas for rendering. Protected method. */
TwoDPlayerApplet.prototype.openCanvas = function() {
  this.g = this.canvas.getContext('2d');
  if (this.g == null) return false;
  
  // disable antialiasing
  this.g.imageSmoothingEnabled = false;
  this.g.mozImageSmoothingEnabled = false;
  this.g.webkitImageSmoothingEnabled = false;

  this.deferredFaceCount = 0;
  this.deferredFaces = [];
  this.mvVertexArray = new J3DIVertexArray();
  this.mvpVertexArray = new J3DIVertexArray();
  
  this.initScene();
  if (this.initCallback != null) {
    this.initCallback(this);
  }
  
  this.draw();
  return true;
}
/** Closes the current canvas. Protected method. */
TwoDPlayerApplet.prototype.closeCanvas = function() {
	// empty
}
/**
 * This function is called before we draw.
 * It adjusts the perspective matrix to the dimensions of the canvas.
 */
TwoDPlayerApplet.prototype.reshape = function() {
    var canvas = this.canvas;
    
      // support high dpi/retina displays:
      var devicePixelRatio = window.devicePixelRatio || 1;
      this.drawingBufferWidth = canvas.clientWidth*devicePixelRatio;
      this.drawingBufferHeight = canvas.clientHeight*devicePixelRatio;
      if (this.drawingBufferWidth == this.width && this.drawingBufferHeight == this.height) {
        return;
      }

      canvas.width = this.drawingBufferWidth;
      canvas.height = this.drawingBufferHeight;
      this.width = canvas.clientWidth;
      this.height = canvas.clientHeight;
     
   // gl.viewport(0, 0, this.width, this.height);
    this.viewportMatrix = new J3DIMatrix4();
    this.viewportMatrix.scale(this.canvas.width*0.5,this.canvas.height*0.5);
    this.viewportMatrix.translate(1,1);
    this.viewportMatrix.scale(1,-1);
}

/** Draws the scene. * /
TwoDPlayerApplet.prototype.drawOFF = function() {
  var start = new Date().getTime();
  this.faceCount=0;
  if (this.cube3d.isDrawTwoPass) {
    this.drawTwoPass();
  } else {
    this.drawSinglePass();
  }
  var end = new Date().getTime();	
  var elapsed=end-start;

  if (this.debugFPS) {
    var g=this.g;
    g.fillStyle='rgb(0,0,0)';
    g.fillText("faces:"+(this.faceCount)+
      " elapsed:"+(end-start)
      ,20,20);
  }
}
*/

TwoDPlayerApplet.prototype.clearCanvas = function() {
  var g=this.g;
  g.clearRect(0, 0, this.canvas.width, this.canvas.height);
}
TwoDPlayerApplet.prototype.flushCanvas = function() {
  var g=this.g;
  
  // The steps above only collect triangles
  // we sort them by depth, and draw them
  var tri = this.deferredFaces.splice(0,this.deferredFaceCount);
  tri.sort(function(a,b){return b.depth - a.depth});
  for (var i=0;i<tri.length;i++) {
    tri[i].draw(g);
  }
  
  this.deferredFaceCount = 0;
}


/** Draws the scene. * /
TwoDPlayerApplet.prototype.drawSinglePassOFF = function() {
  if (!this.camPos) return;
  

  this.reshape();
  this.updateMatrices();
  var self=this;
  
  var g=this.g;
  g.clearRect(0, 0, this.canvas.width, this.canvas.height);
  this.deferredFaceCount = 0;
  

  var cube3d=this.cube3d;
  cube3d.repainter=this;
  cube3d.validateAttributes();
  
  var attr=cube3d.attributes;

  // part colors
  var ccenter=attr.partsFillColor[cube3d.centerOffset];
  var cparts=attr.partsFillColor[cube3d.cornerOffset];
  

	
  // model view transformation
  var mvMatrix=this.mvMatrix;
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
      var si=cube3d.getStickerIndexForPartIndex(cube3d.sideOffset+i,0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
  }
  // draw edge parts
  for (var i=0;i<cube3d.edgeCount;i++) {
      mvMatrix.makeIdentity();
      this.cube3d.parts[cube3d.edgeOffset+i].transform(mvMatrix);
      this.drawObject(cube3d.edgeObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.edgeOffset+i]);  
      var si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
      si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,1);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
  }
  // draw corner parts
  for (var i=0;i<cube3d.cornerCount;i++) {
      mvMatrix.makeIdentity();
      this.cube3d.parts[cube3d.cornerOffset+i].transform(mvMatrix);
      this.drawObject(cube3d.cornerObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.cornerOffset+i],this.forceColorUpdate);  
      var si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,1);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
      si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
      si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,2);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
  }
	//gl.flush();
	this.forceColorUpdate=false;
	// The steps above only collect triangles
	// we sort them by depth, and draw them
	var tri = this.deferredFaces.splice(0,this.deferredFaceCount);
	tri.sort(function(a,b){return b.depth - a.depth});
	for (var i=0;i<tri.length;i++) {
	  tri[i].draw(g);
	}
}
*/
/** Draws the scene. * /
TwoDPlayerApplet.prototype.drawTwoPassOFF = function() {
  if (!this.camPos) return;

  this.reshape();
  this.updateMatrices();
  var self=this;
  
  var g=this.g;
  g.clearRect(0, 0, this.canvas.width, this.canvas.height);
  this.deferredFaceCount = 0;
  

  var cube3d=this.cube3d;
  cube3d.repainter=this;
  cube3d.validateAttributes();
  
  var attr=cube3d.attributes;

  // part colors
  var ccenter=attr.partsFillColor[cube3d.centerOffset];
  var cparts=attr.partsFillColor[cube3d.cornerOffset];
  
	
  // model view transformation
  var mvMatrix=this.mvMatrix;
{
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
  // The steps above only collect triangles
  // we sort them by depth, and draw them
  var tri = this.deferredFaces.splice(0,this.deferredFaceCount);
  tri.sort(function(a,b){return b.depth - a.depth});
  for (var i=0;i<tri.length;i++) {
    tri[i].draw(g);
  }
}	
  // draw side stickers
  for (var i=0;i<cube3d.sideCount;i++) {
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.sideOffset+i].transform(mvMatrix);
      var si=cube3d.getStickerIndexForPartIndex(cube3d.sideOffset+i,0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
  }
  // draw edge stickers
  for (var i=0;i<cube3d.edgeCount;i++) {
      mvMatrix.makeIdentity();
      this.cube3d.parts[cube3d.edgeOffset+i].transform(mvMatrix);
      var si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
      si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,1);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                      attr.stickersFillColor[si], 
                      attr.stickersPhong[si]);
  }
  // draw corner stickers
  for (var i=0;i<cube3d.cornerCount;i++) {
      mvMatrix.makeIdentity();
      this.cube3d.parts[cube3d.cornerOffset+i].transform(mvMatrix);
      var si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,1);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
      si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,0);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
      si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,2);
      this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
  }
	//gl.flush();
	this.forceColorUpdate=false;
	// The steps above only collect triangles
	// we sort them by depth, and draw them
	var tri = this.deferredFaces.splice(0,this.deferredFaceCount);
	tri.sort(function(a,b){return b.depth - a.depth});
	for (var i=0;i<tri.length;i++) {
	  tri[i].draw(g);
	}
}
*/

/** Draws an individual object of the scene. */
TwoDPlayerApplet.prototype.drawObject = function(obj, mvMatrix, color, phong, forceColorUpdate) {
  this.drawObjectCanvas2D(obj,mvMatrix,color,phong,forceColorUpdate);
}



// ------------------
// MODULE API    
// ------------------
return {
  TwoDPlayerApplet : TwoDPlayerApplet
};
});

