/* @(#)WebglPlayerApplet.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

import AbstractPlayerApplet from './AbstractPlayerApplet.mjs';
import Node3D from './Node3D.mjs';
import J3DI from './J3DI.mjs';
import PreloadWebglShaders from './PreloadWebglShaders.mjs';


/** Renders a Cube3D into an HTML 5 canvas 
 using its WebGL 3D context. 
 */

let module = {
    log: (false && console != null && console.log != null) ? console.log : () => {
    },
    info: (true && console != null && console.info != null) ? console.info : () => {
    },
    warning: (true && console != null && console.warn != null) ? console.warn : () => {
    },
    error: (true && console != null && console.error != null) ? console.error : () => {
    }
}


// ===============================
//
// WebglPlayerApplet
//
// ===============================

const TEXTURE_PROGRAM = 0;
const PHONG_PROGRAM = 1;

/** Creates a WebglPlayerApplet. 
 Subclasses must call initWebGLCube3DCanvas(). */
class WebglPlayerApplet extends AbstractPlayerApplet.AbstractPlayerApplet {
    constructor() {
        super();
        this.gl = null;
    }


/** Opens the canvas for rendering. Protected method. */
openCanvas() {
    let self = this;
    let container = this.canvas.parentNode;
    module.log('baseurl: %s', this.parameters.baseurl);
    this.gl = J3DI.initWebGL(
      this.canvas, // id of the canvas element
      [this.parameters.baseurl + "/shaders/texture.vert", this.parameters.baseurl + "/shaders/phong.vert"], // id of the vertex shader
      [this.parameters.baseurl + "/shaders/texture.frag", this.parameters.baseurl + "/shaders/phong.frag"], // id of the fragment shader
      ["vPos", "vNormal", "vColor", "vTexture"], // attribute names
      ["camPos", "lightPos", "mvMatrix", "mvNormalMatrix", "mvpMatrix", "mPhong", "mTexture", "mHasTexture"], // uniform names
      [0, 0, 0, 0], // clear color rgba
      10000, // clear depth
      {antialias: true},
      function (gl) { // success callback function
          self.gl = gl;
          self.checkGLError("initWebGLCallback");

          // Enable all of the vertex attribute arrays.
          self.checkGLError("beforeInitScene");
          let prg = gl.programs[PHONG_PROGRAM];
          gl.useProgram(prg);
          self.initScene();
          let attr = self.cube3d.attributes;
          gl.clearColor(attr.backgroundColor[0], attr.backgroundColor[1], attr.backgroundColor[2], attr.backgroundColor[3]);
          self.checkGLError("afterInitScene");

          if (self.initCallback != null) {
              self.initCallback(self);
          }
          self.draw();
      },
      function (msg) { // failure callback function
          //module.log(msg);
          self.gl = null;
          /*
           if (container) {
           let altImageURL=self.canvas.getAttribute('altImage');
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
closeCanvas() {
    // empty
}



/**
 * This function is called before we draw.
 * It adjusts the perspective matrix to the dimensions of the canvas.
 */
reshape() {
    let gl = this.gl;
    let canvas = this.canvas;

    this.drawingBufferWidth = canvas.clientWidth;
    this.drawingBufferHeight = canvas.clientHeight;
    if (this.drawingBufferWidth == this.width && this.drawingBufferHeight == this.height) {
        return;
    }

    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    gl.viewport(0, 0, this.drawingBufferWidth, this.drawingBufferHeight);
    this.checkGLError('reshape');
}

clearCanvas() {
    let gl = this.gl;
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
    for (let i = 0; i < gl.programs.length; i++) {
        let prg = gl.programs[i];
        if (i == TEXTURE_PROGRAM && this.stickersTexture == null) {
            continue;
        }
        if (prg == null) {
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
}
flushCanvas() {
    let gl = this.gl;
    gl.flush();
}



/** Draws an individual object of the scene. */
drawObject(obj, mvMatrix, color, phong, forceColorUpdate) {
    if (obj == null || !obj.visible)
        return;

    if (!obj.loaded)
        return;


    let gl = this.gl;
    let prg = gl.programs[this.stickersTexture != null ? TEXTURE_PROGRAM : PHONG_PROGRAM];
    obj.bindGL(gl);

    gl.useProgram(prg);

    // Compute a new texture array
    if (obj.textureScale != null) {
        let textureArray = new Array(obj.textureArray.length);
        for (let i = 0; i < textureArray.length; i += 2) {
            textureArray[i] = (obj.textureArray[i] + obj.textureOffsetX) * obj.textureScale;
            textureArray[i + 1] = (obj.textureArray[i + 1] + obj.textureOffsetY) * obj.textureScale;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureArray), gl.STATIC_DRAW);
        obj.textureScale = null;
    }

    // generate vertex colors.
    if (obj.colorBuffer == null || forceColorUpdate) {
        //if (obj.colorBuffer == null) {  

        let colors = Array(obj.numIndices * 4);
        for (let i = 0; i < obj.numIndices; i++) {
            if (color == null) {
                colors[i * 4] = Math.random() * 255;
                colors[i * 4 + 1] = Math.random() * 255;
                colors[i * 4 + 2] = Math.random() * 255;
                colors[i * 4 + 3] = 255.0; // alpha
            } else {
                colors[i * 4] = color[0];
                colors[i * 4 + 1] = color[1];
                colors[i * 4 + 2] = color[2];
                colors[i * 4 + 3] = color[3]; // alpha
            }
        }
        colors = new Float32Array(colors);
        //colors = new Uint8Array(colors);
        // Set up the vertex buffer for the colors
        if (obj.colorBuffer == null) {
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

    if (this.stickersTexture != null) {
        if (prg.uniforms['mTexture']) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.stickersTexture);
            gl.uniform1i(prg.uniforms['mTexture'], 0);
            this.checkGLError('mTexture');
        }
    }

    if (prg.uniforms['mHasTexture']) {
        gl.uniform1i(prg.uniforms['mHasTexture'], obj.hasTexture ? 1 : 0);
        this.checkGLError('drawObject mHasTexture');
    }

    // Draw the object
    if (prg.attribs["vPos"] >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.vertexBuffer);
        gl.enableVertexAttribArray(prg.attribs["vPos"]);
        gl.vertexAttribPointer(prg.attribs["vPos"], 3, gl.FLOAT, false, 0, 0);
        this.checkGLError('drawObject vPos');
    }

    if (prg.attribs["vNormal"] >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.normalBuffer);
        gl.enableVertexAttribArray(prg.attribs["vNormal"]);
        gl.vertexAttribPointer(prg.attribs["vNormal"], 3, gl.FLOAT, false, 0, 0);
        this.checkGLError('drawObject vNormal');
    }

    if (prg.attribs["vColor"] >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.colorBuffer);
        gl.enableVertexAttribArray(prg.attribs["vColor"]);
        gl.vertexAttribPointer(prg.attribs["vColor"], 4, gl.FLOAT, false, 0, 0);
        //gl.vertexAttribPointer(prg.attribs["vColor"], 4,gl.UNSIGNED_BYTE, false, 0, 0);
        this.checkGLError('drawObject vColor');
    }

    if (prg.attribs["vTexture"] >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, obj.textureBuffer);
        gl.enableVertexAttribArray(prg.attribs["vTexture"]);
        gl.vertexAttribPointer(prg.attribs["vTexture"], 2, gl.FLOAT, false, 0, 0);
        this.checkGLError('drawObject vTexture');
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
    gl.drawElements(gl.TRIANGLES, obj.numIndices, gl.UNSIGNED_SHORT, 0);

    this.checkGLError('drawObject.drawElements vshader=' + prg.vshaderId + " fshader=" + prg.fshaderId);
}

checkGLError(msg) {
    if (this.checkForErrors) {
        let gl = this.gl;
        let error = gl.getError();

        if (error != gl.NO_ERROR) {
            let str = "GL Error: " + error + (msg == null ? "" : " " + msg);
            module.log(str);
            gl.hasError = true;
            //throw str;  => Don't throw error, maybe we can still render something
        }
    }
}
clearGLError(msg) {
    let gl = this.gl;
    let error = gl.getError();
    gl.hasError = false;
}
}


// ------------------
// MODULE API    
// ------------------
export default {
    WebglPlayerApplet: WebglPlayerApplet
};


