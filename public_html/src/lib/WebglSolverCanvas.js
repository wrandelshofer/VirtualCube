/*
 * @(#)WebglSolverCanvas.js  1.0  2014-01-08
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

/** Renders a Cube3D into an HTML 5 canvas 
    using its WebGL 3D context. 
*/
// --------------
// require.js
// --------------
define("WebglSolverCanvas",["SolverCanvas","Node3D","J3DI","PreloadWebglShaders"], 
function (SolverCanvas,Node3D,J3DI,PreloadWebglShaders) {
  

// ===============================
//
// WebGLSolverCanvas
//
// ===============================

/** Creates a WebGLSolverCanvas. 
    Subclasses must call initWebGLSolverCanvas(). */
WebGLSolverCanvas = function() {
  this.initWebGLSolverCanvas();
}
WebGLSolverCanvas.prototype=SolverCanvas.newSolverCanvas();


/** Initializes the WebGLSolverCanvas object. */
WebGLSolverCanvas.prototype.initWebGLSolverCanvas = function() {
  this.initSolverCanvas();
	this.gl = null;
}

/** Opens the canvas for rendering. Protected method. */
WebGLSolverCanvas.prototype.openCanvas = function() {
	var self=this;
  var container = this.canvas.parentNode;
	
	
  this.gl=J3DI.initWebGL(
    this.canvas, // id of the canvas element
    ["lib/shaders/texture.vert"], // id of the vertex shader
    ["lib/shaders/texture.frag"], // id of the fragment shader
    ["vPos","vNormal","vColor","vTexture"], // attribute names
    ["camPos","lightPos","mvMatrix","mvNormalMatrix","mvpMatrix","mPhong","mTexture","mHasTexture"], // uniform names
    [0, 0, 0, 0], // clear color rgba
    10000, // clear depth
    {antialias:true},
    
    function(gl) { // success callback function
      self.gl = gl;
      self.checkGLError("initWebGLCallback");
      var prg=gl.programs[0];
      gl.useProgram(prg);  
      
      // Enable all of the vertex attribute arrays.
      self.checkGLError("beforeInitScene");
      self.initScene();
      self.checkGLError("afterInitScene");
      
      var attr=self.cube3d.attributes;
      gl.clearColor(attr.backgroundColor[0], attr.backgroundColor[1], attr.backgroundColor[2], attr.backgroundColor[3]);
      
      if (self.initCallback != null) {
      self.initCallback(self);
      }
      self.draw();
      },
      
      function(msg) { // failure callback function
      //console.log(msg);
      self.gl=null;
    }
  );	
  return this.gl != null;
}
/** Closes the current canvas. Protected method. */
WebGLSolverCanvas.prototype.closeCanvas = function() {
	// empty
} 



/**
 * This function is called before we draw.
 * It adjusts the perspective matrix to the dimensions of the canvas.
 */
WebGLSolverCanvas.prototype.reshape = function() {
   var gl=this.gl;
    var canvas = this.canvas;
    if (canvas.clientWidth == this.width && canvas.clientHeight == this.height) {
        return;
    }
 
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    this.width = canvas.width;
    this.height = canvas.height;
 
    gl.viewport(0, 0, this.width, this.height);
  this.checkGLError('reshape');
    
}
WebGLSolverCanvas.prototype.clearCanvas = function() {
  var gl=this.gl;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  this.checkGLError('draw gl.clear');
  // enable blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  
  // enable back face culling
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  this.checkGLError('draw gl.cullFace');
	
  // Pass the camera and light positions
  var prg=gl.programs[0];
  gl.useProgram(prg);
  this.checkGLError('draw useProgram');
  
  gl.uniform3f(prg.uniforms["camPos"], this.camPos[0], this.camPos[1], this.camPos[2]);
  this.checkGLError('draw camPos');
  gl.uniform3f(prg.uniforms["lightPos"], this.lightPos[0], this.lightPos[1], this.lightPos[2]);
  this.checkGLError('draw lightPos');
}
WebGLSolverCanvas.prototype.flushCanvas = function() {
  var gl=this.gl;
  gl.flush();
}

/** Draws an individual object of the scene. */
WebGLSolverCanvas.prototype.drawObject = function(obj, mvMatrix, color, phong, forceColorUpdate) {
  if (obj==null) return;
  
  if (! obj.loaded) return;
  
  
  var gl=this.gl;
  var prg=gl.programs[0];
  
  obj.bindGL(gl);
  
  // Compute a new texture array
  if (obj.textureScale!=null) {
    var textureArray=new Array(obj.textureArray.length);
    for (var i=0;i<textureArray.length;i+=2) {
      textureArray[i]=(obj.textureArray[i]+obj.textureOffsetX)*obj.textureScale;
      textureArray[i+1]=(obj.textureArray[i+1]+obj.textureOffsetY)*obj.textureScale;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureArray), gl.STATIC_DRAW);
    obj.textureScale=null;
  }
  
  // generate vertex colors.
  if (obj.colorBuffer == null || forceColorUpdate) {  
  //if (obj.colorBuffer == null) {  
	
    var colors=Array(obj.numIndices*4);
    for (i=0;i<obj.numIndices;i++) {
      if (color == null) {
        colors[i*4]=Math.random()*255;
        colors[i*4+1]=Math.random()*255;
        colors[i*4+2]=Math.random()*255;
        colors[i*4+3]=255.0; // alpha
      } else {
        colors[i*4]=color[0];
        colors[i*4+1]=color[1];
        colors[i*4+2]=color[2];
        colors[i*4+3]=color[3]; // alpha
        colors[i*4+3]=255.0; // alpha
      }
    }
    colors = new Float32Array(colors);
    //colors = new Uint8Array(colors);
    // Set up the vertex buffer for the colors
    if (obj.colorBuffer==null) {
      obj.colorBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);	
  }

  // Pass the phong material attributes position
  this.checkGLError('virtualrubik.js::drawObject.before mPhong');
  gl.uniform4f(prg.uniforms["mPhong"], phong[0], phong[1], phong[2], phong[3]);
  this.checkGLError('mPhong');
  
  gl.uniformMatrix4fv(prg.uniforms["mvMatrix"], false, mvMatrix.getAsFloat32Array());
  this.checkGLError('mvMatrix');
  
  this.mvpMatrix.load(this.perspectiveMatrix);
  this.mvpMatrix.multiply(mvMatrix);
  gl.uniformMatrix4fv(prg.uniforms["mvpMatrix"], false, this.mvpMatrix.getAsFloat32Array());
  this.checkGLError('mvpMatrix');
  
  this.mvNormalMatrix.load(mvMatrix);
  this.mvNormalMatrix.invert();
  this.mvNormalMatrix.transpose();
  gl.uniformMatrix4fv(prg.uniforms["mvNormalMatrix"], false, this.mvNormalMatrix.getAsFloat32Array());
	this.checkGLError('mvNormalMatrix');
	
    var prg=gl.programs[0];
    if (this.stickersTexture != null) {
        if (prg.uniforms['mTexture']) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.stickersTexture);
      gl.uniform1i(prg.uniforms['mTexture'], 0);
      this.checkGLError('mTexture');
	  }
	}
	
	if (prg.uniforms['mHasTexture']) {
	  gl.uniform1i(prg.uniforms['mHasTexture'], obj.hasTexture?1:0);
    this.checkGLError('drawObject mHasTexture');
	}
	
	// Draw the object
  if (prg.attribs["vPos"]>=0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
    gl.enableVertexAttribArray(prg.attribs["vPos"]);
    gl.vertexAttribPointer(prg.attribs["vPos"], 3, gl.FLOAT, false, 0, 0);
    this.checkGLError('drawObject vPos');
  }
  
  if (prg.attribs["vNormal"]>=0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
    gl.enableVertexAttribArray(prg.attribs["vNormal"]);
    gl.vertexAttribPointer(prg.attribs["vNormal"], 3, gl.FLOAT, false, 0, 0);
    this.checkGLError('drawObject vNormal');
  }
  
	if (prg.attribs["vColor"]>=0) {
	  gl.bindBuffer(gl.ARRAY_BUFFER, obj.colorBuffer);
    gl.enableVertexAttribArray(prg.attribs["vColor"]);
	  gl.vertexAttribPointer(prg.attribs["vColor"], 4,gl.FLOAT, false, 0, 0);
	  //gl.vertexAttribPointer(prg.attribs["vColor"], 4,gl.UNSIGNED_BYTE, false, 0, 0);
    this.checkGLError('drawObject vColor');
	}
  
	if (prg.attribs["vTexture"]>=0) {
	  gl.bindBuffer(gl.ARRAY_BUFFER, obj.textureBuffer);
    gl.enableVertexAttribArray(prg.attribs["vTexture"]);
    gl.vertexAttribPointer(prg.attribs["vTexture"], 2, gl.FLOAT, false, 0, 0);
    this.checkGLError('drawObject vTexture');
  }
  
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
  gl.drawElements(gl.TRIANGLES, obj.numIndices, gl.UNSIGNED_SHORT, 0);
  
  this.checkGLError('drawObject.drawElements vshader='+prg.vshaderId+" fshader="+prg.fshaderId);
}

WebGLSolverCanvas.prototype.checkGLError = function(msg) {
  if (this.checkForErrors) {
    var gl=this.gl;
    var error = gl.getError();
    
    if (error != gl.NO_ERROR) {
      var str = "GL Error: " + error+(msg==null?"":" "+msg);
        gl.console.log(str);
        gl.hasError=true;
        //throw str;  => Don't throw error, maybe we can still render something
    }
  }
}
WebGLSolverCanvas.prototype.clearGLError = function(msg) {
    var gl=this.gl;
    var error = gl.getError();
    gl.hasError=false;
}



// ------------------
// MODULE API    
// ------------------
return {
	newWebGLSolverCanvas : function () { return new WebGLSolverCanvas(); }
};
});

