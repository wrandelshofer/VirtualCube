/*
 * @(#)TwoDSolverCanvas.js  1.0  2014-02-08
 * Copyright (c) 2014 Werner Randelshofer, Switzerland. MIT License.
 */
"use strict";

/** Renders a Cube3D into an HTML 5 canvas 
    using its 2D context. 
*/
// --------------
// require.js
// --------------
define("TwoDSolverCanvas", ["SolverCanvas","Node3D","J3DI"], 
function (SolverCanvas,Node3D,J3DI) {


// ===============================
//
// TwoDSolverCanvas
//
// ===============================

/** Creates a TwoDSolverCanvas. 
    Subclasses must call initTwoDSolverCanvas(). */
TwoDSolverCanvas = function() {
  this.initTwoDSolverCanvas();
}
TwoDSolverCanvas.prototype=SolverCanvas.newSolverCanvas();


/** Initializes the TwoDSolverCanvas object. */
TwoDSolverCanvas.prototype.initTwoDSolverCanvas = function() {
  this.initSolverCanvas();
  this.g=null; //2d context
  this.useFullModel=false; //to prevent performance problems
  
}

/** Opens the canvas for rendering. Protected method. */
TwoDSolverCanvas.prototype.openCanvas = function() {
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
TwoDSolverCanvas.prototype.closeCanvas = function() {
	// empty
}

/**
 * This function is called before we draw.
 * It adjusts the perspective matrix to the dimensions of the canvas.
 */
TwoDSolverCanvas.prototype.reshape = function() {
    var canvas = this.canvas;
    if (canvas.clientWidth == this.width && canvas.clientHeight == this.height)
        return;
 
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.width = canvas.width;
    this.height = canvas.height;
 
   // gl.viewport(0, 0, this.width, this.height);
    this.viewportMatrix = new J3DIMatrix4();
    this.viewportMatrix.scale(this.canvas.width*0.5,this.canvas.height*0.5);
    this.viewportMatrix.translate(1,1);
    this.viewportMatrix.scale(1,-1);
}


TwoDSolverCanvas.prototype.clearCanvas = function() {
  var g=this.g;
  g.clearRect(0, 0, this.canvas.width, this.canvas.height);
}
TwoDSolverCanvas.prototype.flushCanvas = function() {
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


/** Draws an individual object of the scene. */
TwoDSolverCanvas.prototype.drawObject = function(obj, mvMatrix, color, phong, forceColorUpdate) {
    this.drawObjectCanvas2D(obj,mvMatrix,color,phong,forceColorUpdate);
return;
  if (obj==null) return;
  if (obj.polyIndexArray) {
  this.faceCount+=obj.polyIndexArray.length;
  }
  if (obj.vertexArray===null) return;

  
  // Compute a new texture array
  if (obj.textureScale!=null) {
    var textureArray=new Array(obj.textureArray.length);
    for (var i=0;i<textureArray.length;i+=2) {
      textureArray[i]=(obj.textureArray[i]+obj.textureOffsetX)*obj.textureScale;
      textureArray[i+1]=(obj.textureArray[i+1]+obj.textureOffsetY)*obj.textureScale;
    }
    obj.textureArray = textureArray;
    obj.textureScale=null;
  }
  
  var g=this.g;
  
  this.mvpMatrix.load(this.viewportMatrix);
  this.mvpMatrix.multiply(this.perspectiveMatrix);
  this.mvpMatrix.multiply(mvMatrix);
  
  // Draw the object
  var mvp = this.mvpVertexArray;
  mvp.load(obj.vertexArray); 
  mvp.multVecMatrix(this.mvpMatrix);

  var mv = this.mvVertexArray;
  mv.load(obj.vertexArray); 
  mv.multVecMatrix(this.mvMatrix);
  
  if (obj.polyIndexArray!==undefined) {
    for (var j=0;j<obj.polyIndexArray.length;j++) {
      var poly=obj.polyIndexArray[j];
      
      var i1 = poly[0];
      var i2 = poly[1];
      var i3 = poly[poly.length-1];
      var z = mvp.rawZ(i1,i2,i3);
      if (z > 0) {
        var light = Math.max(0,mv.normal(i1,i2,i3).dot(this.lightNormal));
        var t=this.deferredFaces[this.deferredFaceCount++];
        if (t === undefined) {
          t = new Face();
          this.deferredFaces.push(t);
        }
        t.loadPoly(
          mvp,
          obj.textureArray,obj.hasTexture?this.stickersTexture:null,
          poly);
        this.applyFillStyle(t,mv.normal(i1,i2,i3),this.lightNormal,this.observerNormal,phong,color);
      }
    }
  } else {
    for (var j in obj.groups) {
      var isQuad = obj.groups[j][1] == 6;
      
      if (isQuad) {
        var i=(obj.groups[j][0]);
        var i1 = obj.indexArray[i];
        var i2 = obj.indexArray[i+1];
        var i3 = obj.indexArray[i+2];
        var i4 = obj.indexArray[i+3];
        var z = mvp.rawZ(i1,i2,i3);
        if (z > 0) {
          var light = Math.max(0,mv.normal(i1,i2,i3).dot(this.lightNormal));
          //g.fillStyle='rgb('+color[0]*light+','+color[1]*light+','+color[2]*light+')';
          var t=this.deferredFaces[this.deferredFaceCount++];
          if (t === undefined) {
            t = new Face();
            this.deferredFaces.push(t);
          }
          t.loadQuad(
            mvp,
            obj.textureArray,obj.hasTexture?this.stickersTexture:null,
            i1,i2,i3,i4);
          this.applyFillStyle(t,mv.normal(i1,i2,i3),this.lightNormal,this.observerNormal,phong,color);
        }
      } else {
        for (var k=0; k<obj.groups[j][1]; k+=3 ) {
          var i=(obj.groups[j][0]+k);
          var i1 = obj.indexArray[i];
          var i2 = obj.indexArray[i+1];
          var i3 = obj.indexArray[i+2];
          var z = mvp.rawZ(i1,i2,i3);
          if (z > 0) {
            //var light = Math.max(0,mv.normal(i1,i2,i3).dot(this.lightNormal));
            //g.fillStyle='rgb('+color[0]*light+','+color[1]*light+','+color[2]*light+')';
            var t=this.deferredFaces[this.deferredFaceCount++];
            if (t === undefined) {
              t = new Face();
              this.deferredFaces.push(t);
            }
            t.loadTriangle(
              mvp,
              obj.textureArray,obj.hasTexture?this.stickersTexture:null,
              i1,i2,i3);
            this.applyFillStyle(t,mv.normal(i1,i2,i3),this.lightNormal,this.observerNormal,phong,color);
          }
        }
      }
    }
  }
}

/** @param n J3DIVec3 surface normal
 *  @param wi J3DIVec3 direction to light source (light normal)
 *  @param wo J3DIVec3 direction to observer (observer normal)
 *  @param phong Array with phong parameters: [ambient.0,diffuse.1,specular.2,specularPower.3];
 */
TwoDSolverCanvas.prototype.applyFillStyle = function (triangle, n,wi,wo,phong,color) {
  //vec3 wi = normalize(lightPos - fPos.xyz); // direction to light source
  //vec3 wo = normalize(camPos - fPos.xyz); // direction to observer
  //vec3 n = normalize(fNormal.xyz);
  var specular=Math.pow( Math.max(0.0,-(new J3DIVector3(wi).reflect(n).dot(wo))), phong[3])*phong[2];
  var diffuse=Math.max(0.0,wi.dot(n))*phong[1];
  var ambient=phong[0];
  var newColor=new Array(3);
  var fs = 'rgb(';
  for (var i=0;i<3;i++) {
    if (i!=0) fs += ',';
    fs+=Math.round(color[i]*(diffuse+ambient)+255*specular);
  }
  fs += ')';
  triangle.fillStyle=fs;
  
  var brightness = (diffuse+ambient)+specular;
  if (brightness >= 1.0) {
    fs = 'rgba(255,255,255,'+(brightness-1)+')';
  } else {
    fs = 'rgba(0,0,0,'+(1-brightness)+')';
  }
  triangle.lightStyle=fs;
}




// ------------------
// MODULE API    
// ------------------
return {
  newTwoDSolverCanvas : function () { return new TwoDSolverCanvas(); }
};
});

