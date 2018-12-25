/* @(#)TwoDPlayerApplet.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

import AbstractPlayerApplet from './AbstractPlayerApplet.mjs';
import Node3D from './Node3D.mjs';
import J3DI from './J3DI.mjs'; 
import J3DIMath from './J3DIMath.mjs'; 

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



/** Initializes the TwoDPlayerApplet object. */
initTwoDCube3DCanvas() {
  this.g=null; //2d context
  this.useFullModel=false; //to prevent performance problems
  
}

/** Opens the canvas for rendering. Protected method. */
openCanvas() {
  this.g = this.canvas.getContext('2d');
  if (this.g == null) return false;
  
  // disable antialiasing
  this.g.imageSmoothingEnabled = false;
  this.g.mozImageSmoothingEnabled = false;
  this.g.webkitImageSmoothingEnabled = false;

  this.deferredFaceCount = 0;
  this.deferredFaces = [];
  this.mvVertexArray = new J3DIMath.J3DIVertexArray();
  this.mvpVertexArray = new J3DIMath.J3DIVertexArray();
  
  this.initScene();
  if (this.initCallback != null) {
    this.initCallback(this);
  }
  
  this.draw();
  return true;
}
/** Closes the current canvas. Protected method. */
closeCanvas() {
	// empty
}

/**
 * This function is called before we draw.
 * It adjusts the perspective matrix to the dimensions of the canvas.
 */
reshape() {
    let canvas = this.canvas;
    
      // support high dpi/retina displays:
      let devicePixelRatio = window.devicePixelRatio || 1;
      this.drawingBufferWidth = canvas.clientWidth*devicePixelRatio;
      this.drawingBufferHeight = canvas.clientHeight*devicePixelRatio;
      if (this.drawingBufferWidth == this.width && this.drawingBufferHeight == this.height) {
        return;
      }

      this.width = canvas.clientWidth;
      this.height = canvas.clientHeight;
     
   // gl.viewport(0, 0, this.width, this.height);
    this.viewportMatrix = new J3DIMath.J3DIMatrix4();
    this.viewportMatrix.scale(this.canvas.width*0.5,this.canvas.height*0.5);
    this.viewportMatrix.translate(1,1);
    this.viewportMatrix.scale(1,-1);
}

clearCanvas() {
  let g=this.g;
  g.clearRect(0, 0, this.canvas.width, this.canvas.height);
}
flushCanvas() {
  let g=this.g;
  
  // The steps above only collect triangles
  // we sort them by depth, and draw them
  let tri = this.deferredFaces.splice(0,this.deferredFaceCount);
  tri.sort(function(a,b){return b.depth - a.depth});
  for (let i=0;i<tri.length;i++) {
    tri[i].draw(g);
  }
  
  this.deferredFaceCount = 0;
}


/** Draws an individual object of the scene. */
drawObject(obj, mvMatrix, color, phong, forceColorUpdate) {
  this.drawObjectCanvas2D(obj,mvMatrix,color,phong,forceColorUpdate);
}
}


// ------------------
// MODULE API    
// ------------------
export default {
  TwoDPlayerApplet : TwoDPlayerApplet
};
