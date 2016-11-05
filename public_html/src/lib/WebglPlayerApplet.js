/*
 * @(#)WebglPlayerApplet.js  2.0  2014-01-05
 * Copyright (c) 2013 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

/** Renders a Cube3D into an HTML 5 canvas 
    using its WebGL 3D context. 
*/
// --------------
// require.js
// --------------
define("WebglPlayerApplet",["AbstractPlayerApplet","Node3D","J3DI","PreloadWebglShaders"], 
function (AbstractPlayerApplet,Node3D,J3DI,PreloadWebglShaders) {
  
    let module = {
      log: (false) ? console.log : ()=>{},
      info: (true) ? console.info : ()=>{},
      warning: (true) ? console.warning : ()=>{},
      error: (true) ? console.error : ()=>{}
    }

// ===============================
//
// WebglPlayerApplet
//
// ===============================

/** Creates a WebglPlayerApplet. 
    Subclasses must call initWebGLCube3DCanvas(). */
class WebglPlayerApplet extends AbstractPlayerApplet.AbstractPlayerApplet {
  constructor() {
    super();
    this.gl = null;
  }
}

/** Opens the canvas for rendering. Protected method. */
WebglPlayerApplet.prototype.openCanvas = function() {
	var self=this;
  var container = this.canvas.parentNode;
module.log('WebglPlayerApplet '+this.parameters.baseurl);	
  this.gl=J3DI.initWebGL(
		this.canvas, // id of the canvas element
		[this.parameters.baseurl+"/shaders/texture.vert"], // id of the vertex shader
	  [this.parameters.baseurl+"/shaders/texture.frag"], // id of the fragment shader
		["vPos","vNormal","vColor","vTexture"], // attribute names
		["camPos","lightPos","mvMatrix","mvNormalMatrix","mvpMatrix","mPhong","mTexture","mHasTexture"], // uniform names
		[0, 0, 0, 0], // clear color rgba
		10000, // clear depth
		{antialias:true},
		
		function(gl) { // success callback function
		  self.gl = gl;
		  self.checkGLError("initWebGLCallback");
		  
     // Enable all of the vertex attribute arrays.
      self.checkGLError("beforeInitScene");
      var gl=self.gl;
      var prg=gl.programs[0];
      gl.useProgram(prg);  
      self.initScene();
      var attr=self.cube3d.attributes;
      gl.clearColor(attr.backgroundColor[0], attr.backgroundColor[1], attr.backgroundColor[2], attr.backgroundColor[3]);
      self.checkGLError("afterInitScene");
      
      if (self.initCallback != null) {
        self.initCallback(self);
      }
        self.draw();
      },
      
      function(msg) { // failure callback function
       //module.log(msg);
        self.gl=null;
        /*
              if (container) {
                var altImageURL=self.canvas.getAttribute('altImage');
                if (altImageURL==null) {
                  altImageURL = "images/webgl-rubikscube.png";
                }
                      container.innerHTML = '<img src="'+altImageURL+'" width="462" height="462" title="'+msg+'">';
              }*/
        
      }
      );	
  return this.gl != null;
}
/** Closes the current canvas. Protected method. */
WebglPlayerApplet.prototype.closeCanvas = function() {
	// empty
}



/**
 * This function is called before we draw.
 * It adjusts the perspective matrix to the dimensions of the canvas.
 */
WebglPlayerApplet.prototype.reshape = function() {
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
/** Draws the scene. * /
WebglPlayerApplet.prototype.draw = function() {
  this.clearGLError('draw...');
  
  if (!this.camPos) return;
  
    this.reshape();
    this.updateMatrices();
    var self=this;
	
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

    var cube3d=this.cube3d;
    cube3d.repainter=this;
    var attr=this.cube3d.attributes;
    cube3d.updateAttributes();

    // part colors
    var ccenter=attr.partsFillColor[cube3d.centerOffset];
    var cparts=attr.partsFillColor[cube3d.cornerOffset];
    //var phongparts=[0.5,0.6,0.4,16.0];//ambient, diffuse, specular, shininess
    //var phongstickers=[0.8,0.2,0.1,8.0];//ambient, diffuse, specular, shininess
  
    //  this.log('  center w==c3d.p          ?:'+(this.world===this.cube3d.parent));
    //  this.log('  center c3d==c3d.parts[0].p?:'+(this.cube3d===this.cube3d.parts[0].parent));
    //	this.world.add(this.cube3d); 
	
  // model view transformation
  var mvMatrix=this.mvMatrix;

  
  // draw center parts
  for (var i=0;i<cube3d.centerCount;i++) {
    mvMatrix.makeIdentity();
    cube3d.parts[cube3d.centerOffset+i].transform(mvMatrix);
    this.drawObject(cube3d.centerObj, mvMatrix, ccenter,attr.partsPhong[this.cube3d.centerOffset+i]);  
  }
 
  // draw side parts
  for (var i=0;i<cube3d.sideCount;i++) {
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.sideOffset+i].transform(mvMatrix);
      this.drawObject(cube3d.sideObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.sideOffset+i]);  

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
	gl.flush();
	this.forceColorUpdate=false;
  this.checkGLError('...draw');
	
}*/

WebglPlayerApplet.prototype.clearCanvas = function() {
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
  if (prg==null) {
    module.log('.clearCanvas **warning** vertex shader not loaded (yet)');
    return;
  }
  
  gl.useProgram(prg);
  this.checkGLError('draw useProgram');
  
  gl.uniform3f(prg.uniforms["camPos"], this.camPos[0], this.camPos[1], this.camPos[2]);
  this.checkGLError('draw camPos');
  gl.uniform3f(prg.uniforms["lightPos"], this.lightPos[0], this.lightPos[1], this.lightPos[2]);
  this.checkGLError('draw lightPos');
}
WebglPlayerApplet.prototype.flushCanvas = function() {
  var gl=this.gl;
  gl.flush();
}



/** Draws an individual object of the scene. */
WebglPlayerApplet.prototype.drawObject = function(obj, mvMatrix, color, phong, forceColorUpdate) {
  if (obj==null||!obj.visible) return;

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

WebglPlayerApplet.prototype.checkGLError = function(msg) {
  if (this.checkForErrors) {
    var gl=this.gl;
    var error = gl.getError();
    
    if (error != gl.NO_ERROR) {
      var str = "GL Error: " + error+(msg==null?"":" "+msg);
        module.log(str);
        gl.hasError=true;
        //throw str;  => Don't throw error, maybe we can still render something
    }
  }
}
WebglPlayerApplet.prototype.clearGLError = function(msg) {
    var gl=this.gl;
    var error = gl.getError();
    gl.hasError=false;
}



// ------------------
// MODULE API    
// ------------------
return {
	WebglPlayerApplet : WebglPlayerApplet
};
});

