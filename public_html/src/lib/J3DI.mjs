/* @(#)J3DI.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 *
 * Portions of this script (as marked) have been taken from the following sources:
 *
 *   David Roe
 *   http://stackoverflow.com/questions/4878145/javascript-and-webgl-external-scripts
 *
 *   Apple Inc.
 *   The J3DI.js file as linked from:
 *   https://cvs.khronos.org/svn/repos/registry/trunk/public/webgl/sdk/demos/webkit/SpinningBox.html
 *
 *     Copyright (C) 2009 Apple Inc. All Rights Reserved.
 *
 *     Redistribution and use in source and binary forms, with or without
 *     modification, are permitted provided that the following conditions
 *     are met:
 *     1. Redistributions of source code must retain the above copyright
 *        notice, this list of conditions and the following disclaimer.
 *     2. Redistributions in binary form must reproduce the above copyright
 *        notice, this list of conditions and the following disclaimer in the
 *        documentation and/or other materials provided with the distribution.
 *
 *     This software is provided by apple inc. ``as is'' and any
 *     express or implied warranties, including, but not limited to, the
 *     implied warranties of merchantability and fitness for a particular
 *     purpose are disclaimed.  in no event shall apple inc. or
 *     contributors be liable for any direct, indirect, incidental, special,
 *     exemplary, or consequential damages (including, but not limited to,
 *     procurement of substitute goods or services; loss of use, data, or
 *     profits; or business interruption) however caused and on any theory
 *     of liability, whether in contract, strict liability, or tort
 *     (including negligence or otherwise) arising in any way out of the use
 *     of this software, even if advised of the possibility of such damage.
 *
 *
 *   Google Inc.
 *   The easywebgl.js file as linked from:
 *   https://cvs.khronos.org/svn/repos/registry/trunk/public/webgl/sdk/demos/webkit/SpinningBox.html
 * 
 *     Copyright 2010, Google Inc.
 *     All rights reserved.
 *
 *     Redistribution and use in source and binary forms, with or without
 *     modification, are permitted provided that the following conditions are
 *     met:
 *
 *         * Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *         * Redistributions in binary form must reproduce the above
 *     copyright notice, this list of conditions and the following disclaimer
 *     in the documentation and/or other materials provided with the
 *     distribution.
 *         * Neither the name of Google Inc. nor the names of its
 *     contributors may be used to endorse or promote products derived from
 *     this software without specific prior written permission.
 *
 *     This software is provided by the copyright holders and contributors
 *     "as is" and any express or implied warranties, including, but not
 *     limited to, the implied warranties of merchantability and fitness for
 *     a particular purpose are disclaimed. in no event shall the copyright
 *     owner or contributors be liable for any direct, indirect, incidental,
 *     special, exemplary, or consequential damages (including, but not
 *     limited to, procurement of substitute goods or services; loss of use,
 *     data, or profits; or business interruption) however caused and on any
 *     theory of liability, whether in contract, strict liability, or tort
 *     (including negligence or otherwise) arising in any way out of the use
 *     of this software, even if advised of the possibility of such damage.
 */

import J3DIMath from './J3DIMath.mjs';

let module = {
    log: (false) ? console.log : () => {
    },
    info: (true) ? console.info : () => {
    },
    warning: (true) ? console.warning : () => {
    },
    error: (true) ? console.error : () => {
    }
}

/**
 * Provides requestAnimationFrame in a cross browser way.
 */
let requestAnimFrame = (function () {
    return function (/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
        window.setTimeout(callback, 1000 / 60);
    };
    /*         
     return window.requestAnimationFrame ||
     window.webkitRequestAnimationFrame ||
     window.mozRequestAnimationFrame ||
     window.oRequestAnimationFrame ||
     window.msRequestAnimationFrame ||
     function(/* function FrameRequestCallback * / callback, /* DOMElement Element * / element) {
     window.setTimeout(callback, 1000/60);
     };*/
})();

class J3DIObj {
    constructor() {
        this.loaded = false;
        this.gl = null;
        this.url = null;
        this.normalArray = null;
        this.textureArray = null;
        this.vertexArray = null;
        this.numIndices = null;
        this.indexArray = null;
        this.groups = null;
        this.normalBuffer = null;
        this.textureBuffer = null;
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.textureOffsetX = 0;
        this.textureOffsetY = 0;
        this.textureScale = 1;
        this.visible = true;
    }

    /** References all data from that object by this.
     * Returns this.
     */
    setTo(that) {
        this.url = that.url;
        this.loaded = that.loaded;
        this.normalArray = that.normalArray;
        this.textureArray = that.textureArray;
        this.vertexArray = that.vertexArray;
        this.numIndices = that.numIndices;
        this.indexArray = that.indexArray;
        this.polyIndexArray = that.polyIndexArray;
        this.groups = that.groups;
    }
    clone() {
        let that = new J3DIObj();
        that.setTo(this);
        return that;
    }
    /** Binds this object to the given WebGL context.
     * Has no effect if the object is not loaded yet.
     */
    bindGL(gl) {
        if (!this.loaded)
            return;

        if (this.gl != gl) {
            this.gl = gl;
            this.normalBuffer = null;
            this.textureBuffer = null;
            this.vertexBuffer = null;
            this.indexBuffer = null;

            this.updateGL();
        }
    }
    /** Updates the WebGL context. */
    updateGL() {
        let gl = this.gl;
        if (gl == null || !this.loaded)
            return;

        if (this.normalBuffer == null) {
            this.normalBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normalArray), gl.STATIC_DRAW);

        if (this.textureBuffer == null) {
            this.textureBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.textureArray), gl.STATIC_DRAW);

        if (this.vertexBuffer == null) {
            this.vertexBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexArray), gl.STATIC_DRAW);

        if (this.indexBuffer == null) {
            this.indexBuffer = gl.createBuffer();
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indexArray), gl.STREAM_DRAW);
    }
    flipTexture(u, v) {
        for (let i = 0; i < this.textureArray.length; i += 2) {
            if (u)
                this.textureArray[i] = 1 - this.textureArray[i];
            if (v)
                this.textureArray[i + 1] = 1 - this.textureArray[i + 1];
        }
    }
    /** Rotates the texture in 90 degree steps. 
     * The WebGL context must be updated afterwards.
     */
    rotateTexture(degree) {
        if (!this.loaded)
            return;

        // clone the texture array
        this.textureArray = this.textureArray.slice(0);

        switch (degree % 360) {
            case 0:
                break;

            default:
            case 90:
                for (let i = 0; i < this.textureArray.length; i += 2) {
                    let t = this.textureArray[i];
                    this.textureArray[i] = this.textureArray[i + 1];
                    this.textureArray[i + 1] = 1 - t;
                }
                break;

            case 180:
                for (let i = 0; i < this.textureArray.length; i += 2) {
                    this.textureArray[i] = 1 - this.textureArray[i];
                    this.textureArray[i + 1] = 1 - this.textureArray[i + 1];
                }
                break;

            case 270:
                for (let i = 0; i < this.textureArray.length; i += 2) {
                    let t = this.textureArray[i];
                    this.textureArray[i] = 1 - this.textureArray[i + 1];
                    this.textureArray[i + 1] = t;
                }
                break;
        }
    }
}
//-------


/*
 * initWebGL
 *
 * Initialize the Canvas element with the passed name as a WebGL object and return the
 * WebGLRenderingContext.
 * Instead of passing a name, you can pass the element directly.
 *
 * Load shaders with the passed names and create a program with them. Return this program
 * in the 'program' property of the returned context.
 *
 * For each string in the passed attribs array, bind an attrib with that name at that index.
 * Once the attribs are bound, link the program and then use it.
 *
 * Set the clear color to the passed array (4 values) and set the clear depth to the passed value.
 * Enable depth testing and blending with a blend func of (SRC_ALPHA, ONE_MINUS_SRC_ALPHA)
 *
 * A console function is added to the context: console(string). This can be replaced
 * by the caller. By default, it maps to the window.console() function on WebKit and to
 * an empty function on other browsers.
 *
 * The callback function is called when the shaders have been loaded.
 *
 * @param canvasName If this is a string, specifies the id of a canvas element.
 *                   If this is an element, specifies the desired canvas element.
 * @param vshader    Specifies the id of a script-element with type="x-shader/x-vertex". 
 *                   Can be an array with multiple ids.
 * @param fshader    Specifies the id of a script-element with type="x-shader/x-fragment". 
 *                   Can be an array with multiple ids. Must have the same array length as vshader.
 * @param attribs
 * @param uniforms
 * @param clearColor
 * @param clearDepth
 * @param optAttribs
 * @param callback   On success, this function is called with callback(gl).
 * @param errorCallback
 *
 * Original code by Apple Inc.
 */
let initWebGL = function (canvasName, vshader, fshader, attribs, uniforms, clearColor, clearDepth, optAttribs, callback, errorCallback) {
    let canvas;
    if (typeof (canvasName) == 'string') {
        canvas = document.getElementById(canvasName);
    } else {
        canvas = canvasName;
    }
    let gl = setupWebGL(canvas, optAttribs, errorCallback == null);
    if (gl == null || typeof (gl) == 'string' || (gl instanceof String)) {
        if (errorCallback) {
            errorCallback(gl);
        }
        return null;
    }
    checkGLError(gl, 'easywebgl.initWebGL setupWebGL');

    // load the shaders asynchronously
    if (gl.programs == null) {
        gl.programs = Array();
    }

    let files = [];
    if (typeof vshader != 'object' || !("length" in vshader)) {
        vshader = [vshader];
    }
    if (typeof fshader != 'object' || !("length" in fshader)) {
        fshader = [fshader];
    }
    files = vshader.concat(fshader);
    module.log('loading files: %o', files);
    checkGLError(gl, 'easywebgl.initWebGL before loadFiles');

    loadFiles(files,
      function (shaderText) {
          checkGLError(gl, 'easywebgl.initWebGL loadFiles callback');
          let programCount = shaderText.length / 2;
          for (let programIndex = 0; programIndex < programCount; programIndex++) {
              // create our shaders
              checkGLError(gl, 'easywebgl.initWebGL before loadShader ' + programIndex);
              let vertexShader = loadShader(gl, vshader[programIndex], shaderText[programIndex], gl.VERTEX_SHADER);
              let fragmentShader = loadShader(gl, fshader[programIndex], shaderText[programIndex + programCount], gl.FRAGMENT_SHADER);
              if (!vertexShader || !fragmentShader) {
                  if (errorCallback)
                      errorCallback("Error compiling shaders.");
                  else
                      module.log("Error compiling shaders.");
                  return null;
              }

              // Create the program object
              gl.programs[programIndex] = gl.createProgram();
              checkGLError(gl, 'easywebgl.initWebGL createProgram ' + programIndex);

              let prg = gl.programs[programIndex];
              prg.vshaderId = vshader[programIndex];
              prg.fshaderId = fshader[programIndex];

              if (!prg)
                  return null;

              // Attach our two shaders to the program
              gl.attachShader(prg, vertexShader);
              checkGLError(gl, 'easywebgl.initWebGL attach vertex shader');
              gl.attachShader(prg, fragmentShader);
              checkGLError(gl, 'easywebgl.initWebGL attach fragment shader');

              // Link the program
              gl.linkProgram(prg);
              checkGLError(gl, 'easywebgl.initWebGL linkProgram');

              // Check the link status
              let linked = gl.getProgramParameter(prg, gl.LINK_STATUS);
              if (!linked) {
                  // something went wrong with the link
                  let error = gl.getProgramInfoLog(prg);
                  module.log("Error in program linking:" + error);

                  gl.deleteProgram(prg);
                  gl.deleteShader(fragmentShader);
                  gl.deleteShader(vertexShader);

                  return null;
              }
              // Bind attributes
              prg.attribs = [];
              for (let i = 0; i < attribs.length; ++i) {
                  prg.attribs[attribs[i]] = gl.getAttribLocation(prg, attribs[i]);
                  if (prg.attribs[attribs[i]] != -1) {
                      //gl.enableVertexAttribArray(prg.attribs[attribs[i]]);
                  }
                  //  gl.bindAttribLocation (gl.programs[programIndex], i, attribs[i]);
              }

              // Bind uniforms
              prg.uniforms = [];
              for (let i = 0; i < uniforms.length; ++i) {
                  prg.uniforms[uniforms[i]] = gl.getUniformLocation(prg, uniforms[i]);
                  module.log('.initWebGL ' + prg.vshaderId + ' prg.uniform[' + uniforms[i] + ']=' + prg.uniforms[uniforms[i]]);
              }

              gl.useProgram(gl.programs[programIndex]);
              checkGLError(gl, 'easywebgl.initWebGL useProgram ' + prg.vshaderId + ',' + prg.fshaderId);
          }
          if (callback)
              callback(gl);
      },
      function (url) {
          if (errorCallback)
              errorCallback(url);
          else
              module.log('Failed to download "' + url + '"');
      }
    );



    checkGLError(gl, 'easywebgl.initWebGL before clear');

    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clearDepth(clearDepth);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    checkGLError(gl, 'easywebgl.initWebGL after clear');

    return gl;
};

let checkGLError = function (gl, msg) {
    let error = gl.getError();

    if (error != gl.NO_ERROR) {
        let str = "GL Error: " + error + (msg == null ? "" : " " + msg);
        module.log(str);
    }
};

/**
 * loadShader
 *
 * Original code by Apple Inc.
 */
let loadShader = function (ctx, shaderId, shaderScript, shaderType) {
    module.log('.loadShader(' + ctx + ',' + shaderId + ',' + (shaderScript == null ? null : shaderScript.substring(0, Math.min(shaderScript.length, 10))) + ',' + shaderType);

    // Create the shader object
    checkGLError(ctx, 'easywebgl.loadShader before createShader ' + shaderType);
    let shader = ctx.createShader(shaderType);
    checkGLError(ctx, 'easywebgl.loadShader createShader ' + shaderType);
    if (shader == null) {
        module.error("*** Error: unable to create shader '" + shaderId + "' error:" + ctx.getError());
        return null;
    }

    // Load the shader source
    ctx.shaderSource(shader, shaderScript);

    // Compile the shader
    ctx.compileShader(shader);

    // Check the compile status
    let compiled = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);
    if (!compiled) {
        // Something went wrong during compilation; get the error
        let error = ctx.getShaderInfoLog(shader);
        module.error("*** Error compiling shader '" + shaderId + "':" + error);
        ctx.deleteShader(shader);
        return null;
    }
    return shader;
};

let fileData = {}; // associative array

/** Sets file data.
 * If file data is set for a specify URL, function loadFile() will
 * use it instead of performing a network request.
 *
 * @param url The file url.
 * @param data The file data. Specify null to delete the file data.
 */
let setFileData = function (url, data) {
    module.log('.setFileData ' + url);
    if (data === null) {
        delete fileData[url];
    } else {
        fileData[url] = data;
    }
}

/**
 * Loads a text file.
 * 
 * @param url     The URL of the text file or the Id of a script element.
 * @param data    Data to be passed to the callback function.
 * @param callback On success, the callback function is called with callback(text,data).
 * @param errorCallback On failure, the callback function is called with 
 *                 errorCallback(msg).
 *
 * Original code by David Roe.
 */
let loadFile = function (url, data, callback, errorCallback) {
    for (let key in fileData) {
        if (url.endsWith(key)) {
            module.log('.loadFile url:' + url + ' using preloaded data');
            if (callback) {
                let f = function () {
                    callback(fileData[key], data);
                }
                requestAnimFrame(f);
            }
            return;
        }
    }

    let scriptElem = document.getElementById(url);
    // instead of an URL we also accept the id of a script element
    if (scriptElem) {
        if (scriptElem.text) {
            module.log('.loadFile url:' + url + ' using data from script element');
            if (callback) {
                let f = function () {
                    callback(scriptElem.text, data);
                };
                requestAnimFrame(f);
            }
            return;
        } else {
            url = scriptElem.src;
        }
    }
    module.log('.loadFile url:' + url + ' requesting data...');

    // Set up an asynchronous request
    let request = new XMLHttpRequest();
    request.open('GET', url, true);

    // Hook the event that gets called as the request progresses
    request.onreadystatechange = function () {
        // If the request is "DONE" (completed or failed)
        if (request.readyState == 4) {
            // If we got HTTP status 200 (OK) or file status 0 (OK)
            if (request.status == 200 || request.status == 0) {
                module.log('.loadFile url:' + url + ' done, request.status:' + request.status);
                if (callback) {
                    callback(request.responseText, data)
                }
            } else { // Failed
                module.log('.loadFile url:' + url + ' failed, request.status:' + request.status);
                if (errorCallback) {
                    errorCallback(url);
                }
            }
        }
    };

    request.send(null);
}
/**
 * Loads a XML file.
 * 
 * @param url     The URL of the text file or the Id of a script element.
 * @param data    Data to be passed to the callback function.
 * @param callback On success, the callback function is called with callback(text, data).
 * @param errorCallback On failure, the callback function is called with 
 *                 errorCallback(urlOrId, data).
 *
 * Original code by David Roe.
 */
let loadXML = function (url, data, callback, errorCallback) {
    let scriptElem = document.getElementById(url);
    // instead of an URL we also accept the id of a script element
    if (scriptElem) {
        if (scriptElem.text) {
            callback(scriptElem.text, data);
            return;
        } else {
            url = scriptElem.src;
        }
    }
    module.log(".loadXML url=" + url);

    // Set up an asynchronous request
    let request = new XMLHttpRequest();
    request.open('GET', url, true);

    // Hook the event that gets called as the request progresses
    request.onreadystatechange = function () {
        // If the request is "DONE" (completed or failed)
        if (request.readyState == 4) {
            // If we got HTTP status 200 (OK)
            if (request.status == 200) {
                callback(request.responseXML, data)
            } else { // Failed
                errorCallback(url);
            }
        }
    };

    request.send(null);
};

/**
 * Original code by David Roe.
 */
let loadFiles = function (urls, callback, errorCallback) {
    let numUrls = urls.length;
    let numComplete = 0;
    let result = [];

    // Callback for a single file
    function partialCallback(text, urlIndex) {
        result[urlIndex] = text;
        numComplete++;

        // When all files have downloaded
        if (numComplete == numUrls) {
            callback(result);
        }
    }

    for (let i = 0; i < numUrls; i++) {
        loadFile(urls[i], i, partialCallback, errorCallback);
    }
};


/**
 // makeBox
 //
 // Create a box with vertices, normals and texCoords. Create VBOs for each as well as the index array.
 // Return an object with the following properties:
 //
 //  normalBuffer        WebGLBuffer object for normals
 //  texCoordObject      WebGLBuffer object for texCoords
 //  vertexBuffer        WebGLBuffer object for vertices
 //  indexBuffer         WebGLBuffer object for indices
 //  numIndices          The number of indices in the indexBuffer
 //
 *
 * Original code by Apple Inc.
 */
let makeBox = function (ctx, bmin, bmax) {
    if (bmin == null)
        bmin = new J3DIMath.J3DIVector3(-1, -1, -1);
    if (bmax == null)
        bmax = new J3DIMath.J3DIVector3(1, 1, 1);

    // box
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    //
    // vertex coords array
    let vertices = new Float32Array(
      [bmax[0], bmax[1], bmax[2], bmin[0], bmax[1], bmax[2], bmin[0], bmin[1], bmax[2], bmax[0], bmin[1], bmax[2], // v0-v1-v2-v3 front
          bmax[0], bmax[1], bmax[2], bmax[0], bmin[1], bmax[2], bmax[0], bmin[1], bmin[2], bmax[0], bmax[1], bmin[2], // v0-v3-v4-v5 right
          bmax[0], bmax[1], bmax[2], bmax[0], bmax[1], bmin[2], bmin[0], bmax[1], bmin[2], bmin[0], bmax[1], bmax[2], // v0-v5-v6-v1 top
          bmin[0], bmax[1], bmax[2], bmin[0], bmax[1], bmin[2], bmin[0], bmin[1], bmin[2], bmin[0], bmin[1], bmax[2], // v1-v6-v7-v2 left
          bmin[0], bmin[1], bmin[2], bmax[0], bmin[1], bmin[2], bmax[0], bmin[1], bmax[2], bmin[0], bmin[1], bmax[2], // v7-v4-v3-v2 bottom
          bmax[0], bmin[1], bmin[2], bmin[0], bmin[1], bmin[2], bmin[0], bmax[1], bmin[2], bmax[0], bmax[1], bmin[2]]   // v4-v7-v6-v5 back
      );

    // normal array
    let normals = new Float32Array(
      [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, // v0-v1-v2-v3 front
          1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, // v0-v3-v4-v5 right
          0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, // v0-v5-v6-v1 top
          -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, // v1-v6-v7-v2 left
          0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, // v7-v4-v3-v2 bottom
          0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]    // v4-v7-v6-v5 back
      );


    // texCoord array
    let texCoords = new Float32Array(
      [1, 1, 0, 1, 0, 0, 1, 0, // v0-v1-v2-v3 front
          0, 1, 0, 0, 1, 0, 1, 1, // v0-v3-v4-v5 right
          1, 0, 1, 1, 0, 1, 0, 0, // v0-v5-v6-v1 top
          1, 1, 0, 1, 0, 0, 1, 0, // v1-v6-v7-v2 left
          0, 0, 1, 0, 1, 1, 0, 1, // v7-v4-v3-v2 bottom
          0, 0, 1, 0, 1, 1, 0, 1]   // v4-v7-v6-v5 back
      );

    // index array
    let indices = new Uint16Array(
      [0, 2, 1, 0, 3, 2, // front
          4, 6, 5, 4, 7, 6, // right
          8, 10, 9, 8, 11, 10, // top
          12, 14, 13, 12, 15, 14, // left
          16, 18, 17, 16, 19, 18, // bottom
          20, 22, 21, 20, 23, 22]   // back
      );

    let retval = {};

    retval.normalBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, retval.normalBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, normals, ctx.STATIC_DRAW);

    retval.texCoordObject = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, retval.texCoordObject);
    ctx.bufferData(ctx.ARRAY_BUFFER, texCoords, ctx.STATIC_DRAW);

    retval.vertexBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, retval.vertexBuffer);
    ctx.bufferData(ctx.ARRAY_BUFFER, vertices, ctx.STATIC_DRAW);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, null);

    retval.indexBuffer = ctx.createBuffer();
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, retval.indexBuffer);
    ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, indices, ctx.STATIC_DRAW);
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null);

    retval.numIndices = indices.length;

    retval.loaded = true;

    return retval;
};

/**
 // makeSphere
 //
 // Create a sphere with the passed number of latitude and longitude bands and the passed radius.
 // Sphere has vertices, normals and texCoords. Create VBOs for each as well as the index array.
 // Return an object with the following properties:
 //
 //  normalBuffer        WebGLBuffer object for normals
 //  texCoordObject      WebGLBuffer object for texCoords
 //  vertexBuffer        WebGLBuffer object for vertices
 //  indexBuffer         WebGLBuffer object for indices
 //  numIndices          The number of indices in the indexBuffer
 //
 *
 * Original code by Apple Inc.
 */
let makeSphere = function (ctx, radius, lats, longs) {
    let geometryData = [];
    let normalData = [];
    let texCoordData = [];
    let indexData = [];

    for (let latNumber = 0; latNumber <= lats; ++latNumber) {
        for (let longNumber = 0; longNumber <= longs; ++longNumber) {
            let theta = latNumber * Math.PI / lats;
            let phi = longNumber * 2 * Math.PI / longs;
            let sinTheta = Math.sin(theta);
            let sinPhi = Math.sin(phi);
            let cosTheta = Math.cos(theta);
            let cosPhi = Math.cos(phi);

            let x = cosPhi * sinTheta;
            let y = cosTheta;
            let z = sinPhi * sinTheta;
            let u = 1 - (longNumber / longs);
            let v = latNumber / lats;

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            texCoordData.push(u);
            texCoordData.push(v);
            geometryData.push(radius * x);
            geometryData.push(radius * y);
            geometryData.push(radius * z);
        }
    }

    for (let latNumber = 0; latNumber < lats; ++latNumber) {
        for (let longNumber = 0; longNumber < longs; ++longNumber) {
            let first = (latNumber * (longs + 1)) + longNumber;
            let second = first + longs + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);
        }
    }

    let retval = {};

    if (ctx === null) {
        retval.normalArray = normalData;
        retval.textureArray = texCoordData;
        retval.vertexArray = geometryData;
        retval.numIndices = indexData.length;
        retval.indexArray = indexData;
        retval.loaded = true;
    } else {
        retval.normalBuffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, retval.normalBuffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(normalData), ctx.STATIC_DRAW);

        retval.texCoordObject = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, retval.texCoordObject);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(texCoordData), ctx.STATIC_DRAW);

        retval.vertexBuffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER, retval.vertexBuffer);
        ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(geometryData), ctx.STATIC_DRAW);

        retval.numIndices = indexData.length;
        retval.indexBuffer = ctx.createBuffer();
        ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, retval.indexBuffer);
        ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), ctx.STREAM_DRAW);

        retval.loaded = true;
    }
    return retval;
};

/**
 // loadObj
 //
 // Load a .obj file from the passed URL. Return an object with a 'loaded' property set to false.
 // When the object load is complete, the 'loaded' property becomes true and the following
 // properties are set:
 //
 //  normalBuffer        WebGLBuffer object for normals
 //  texCoordObject      WebGLBuffer object for texCoords
 //  vertexBuffer        WebGLBuffer object for vertices
 //  indexBuffer         WebGLBuffer object for indices
 //  numIndices          The number of indices in the indexBuffer
 //
 *
 * Original code by Apple Inc.
 */
let loadObj = function (ctx, url, callback, errorCallback) {

    let obj = new J3DIObj();
    obj.gl = ctx;
    obj.url = url;

    let f = function (responseText, obj) {
        if (responseText == null) {
            module.log('.loadObj error no text for url:' + url);
            if (errorCallback) {
                errorCallback();
            }
        }

        doLoadObj(obj, responseText, callback, errorCallback);
    };
    loadFile(url, obj, f, errorCallback)

    return obj;
}

/*
 * Original code by Apple Inc.
 */
let doLoadObj = function (obj, text, callback, errorCallback) {
    module.log('.doLoadObj obj:' + obj + " text:" + (text == null ? null : '"' + text.substring(0, Math.min(10, text.length)) + '..."') + ' callback:' + callback + ' errorCallback:' + errorCallback);

    if (text == null) {
        module.log('.doLoadObj error no text');
        if (errorCallback) {
            errorCallback();
        }
        return;
    }

    if (obj.gl != null) {
        checkGLError(obj.gl, 'easywebgl.doLoadObj... ' + obj.url);
    }

    let invertFaces = false;
    let vertexArray = [];
    let normalArray = [];
    let textureArray = [];
    let indexArray = [];
    let polyIndexArray = []; // two dimensional array with indices for each polygon

    let vertex = [];
    let normal = [];
    let texture = [];
    let facemap = {};
    let index = 0;
    let tempIndexArray = new Array(4);

    // This is a map which associates a range of indices with a name
    // The name comes from the 'g' tag (of the form "g NAME"). Indices
    // are part of one group until another 'g' tag is seen. If any indices
    // come before a 'g' tag, it is given the group name "_unnamed"
    // 'group' is an object whose property names are the group name and
    // whose value is a 2 element array with [<first index>, <num indices>]
    let groups = {};
    let currentGroup = [0, 0];
    groups["_unnamed"] = currentGroup;

    let recomputeNormals = false;

    let lines = text.split("\n");
    for (let lineIndex in lines) {
        let line = lines[lineIndex].replace(/[ \t]+/g, " ").replace(/\s\s*$/, "");

        // ignore comments
        if (line[0] == "#")
            continue;

        let array = line.split(" ");
        if (array[0] == "g") {
            // new group
            currentGroup = [indexArray.length, 0];
            if (array[1] in groups) {
                array[1] += ' $' + lineIndex;
            }
            groups[array[1]] = currentGroup;
        } else if (array[0] == "v") {
            // vertex
            vertex.push(parseFloat(array[1]));
            vertex.push(parseFloat(array[2]));
            vertex.push(-parseFloat(array[3]));// Wavefront format flips z-coodinate
        } else if (array[0] == "vt") {
            // texture
            texture.push(parseFloat(array[1]));
            texture.push(parseFloat(array[2]));
        } else if (array[0] == "vn") {
            // normal
            normal.push(-parseFloat(array[1]));
            normal.push(-parseFloat(array[2]));
            normal.push(parseFloat(array[3]));// Wavefront format flips z-coordinate
        } else if (array[0] == "f") {
            // face
            if (array.length < 4) {
                module.error("face '" + line + "' not handled in " + obj.url);
                continue;
            }

            for (let i = 1; i < array.length; i++) {
                if (!(array[i] in facemap)) {
                    // add a new entry to the map and arrays
                    let f = array[i].split("/");
                    let vtx, nor, tex;

                    if (f.length == 1) {
                        vtx = parseInt(f[0]) - 1;
                        nor = vtx;
                        tex = vtx;
                    } else if (f.length = 3) {
                        vtx = parseInt(f[0]) - 1;
                        tex = parseInt(f[1]) - 1;
                        nor = parseInt(f[2]) - 1;
                    } else {
                        module.error("did not understand face '" + array[i] + "' in " + obj.url);
                        return null;
                    }

                    // do the vertices
                    let x = 0;
                    let y = 0;
                    let z = 0;
                    if (vtx * 3 + 2 < vertex.length) {
                        x = vertex[vtx * 3];
                        y = vertex[vtx * 3 + 1];
                        z = vertex[vtx * 3 + 2];
                    }
                    vertexArray.push(x);
                    vertexArray.push(y);
                    vertexArray.push(z);

                    // do the textures
                    x = 0;
                    y = 0;
                    if (tex * 2 + 1 < texture.length) {
                        x = texture[tex * 2];
                        y = texture[tex * 2 + 1];
                    }
                    textureArray.push(x);
                    textureArray.push(1 - y);// Wavefront format flips y-texture

                    // do the normals
                    x = 0;
                    y = 0;
                    z = 1;
                    if (nor * 3 + 2 < normal.length) {
                        x = normal[nor * 3];
                        y = normal[nor * 3 + 1];
                        z = normal[nor * 3 + 2];
                    } else {
                        recomputeNormals = true;
                    }
                    normalArray.push(x);
                    normalArray.push(y);
                    normalArray.push(z);

                    facemap[array[i]] = index++;
                }

                tempIndexArray[i - 1] = facemap[array[i]];
                //indexArray.push(facemap[array[i]]);
                //currentGroup[1]++;
            }
            let poly = new Array(array.length - 1);
            for (let j = 0; j < array.length - 1; j++) {
                poly[j] = tempIndexArray[j];
            }
            polyIndexArray.push(poly);
            for (let j = 2; j < array.length - 1; j++) {
                indexArray.push(tempIndexArray[0]);
                indexArray.push(tempIndexArray[j - 1]);
                indexArray.push(tempIndexArray[j]);
                currentGroup[1] += 3;
            }
        }
    }

    // recompute the normals
    if (recomputeNormals) {
        module.log('recomputing normals for ' + obj.url);
        for (let i = 0; i < normalArray.length; i++) {
            normalArray[i] = 0;
        }
        let x0 = new J3DIMath.J3DIVector3();
        let x1 = new J3DIMath.J3DIVector3();
        let x2 = new J3DIMath.J3DIVector3();
        let x0tox1 = new J3DIMath.J3DIVector3();
        let x0tox2 = new J3DIMath.J3DIVector3();
        let x1tox2 = new J3DIMath.J3DIVector3();
        let x1tox0 = new J3DIMath.J3DIVector3();
        let n = new J3DIMath.J3DIVector3();

        for (let i = 0; i < indexArray.length; i += 3) {
            x0.load(vertexArray[indexArray[i] * 3],
              vertexArray[indexArray[i] * 3 + 1],
              vertexArray[indexArray[i] * 3 + 2]);
            x1.load(vertexArray[indexArray[i + 1] * 3],
              vertexArray[indexArray[i + 1] * 3 + 1],
              vertexArray[indexArray[i + 1] * 3 + 2]);
            x2.load(vertexArray[indexArray[i + 2] * 3],
              vertexArray[indexArray[i + 2] * 3 + 1],
              vertexArray[indexArray[i + 2] * 3 + 2]);
            // compute vectors x0 to x1, x0 to x2
            x0tox1.load(x1);
            x0tox1.subtract(x0);
            x0tox2.load(x2);
            x0tox2.subtract(x0);
            x1tox0.load(x0);
            x1tox0.subtract(x1);
            x1tox2.load(x2);
            x1tox2.subtract(x1);

            // n is the area weighted normal of the triangle
            // do not normalize it - this will create undesired artefacts!
            n.load(x0tox1);
            n.cross(x0tox2);
            n.multiply(0.5);
            // also weight n by the angle at x0, x1, x2
            x0tox1.normalize();
            x0tox2.normalize();
            let a0 = Math.acos(Math.abs(x0tox1.dot(x0tox2)));
            x1tox0.normalize();
            x1tox2.normalize();
            let a1 = Math.acos(Math.abs(x1tox2.dot(x1tox0)));
            let a2 = Math.PI - a1 - a0;
            normalArray[indexArray[i] * 3] += n[0] * a0;
            normalArray[indexArray[i] * 3 + 1] += n[1] * a0;
            normalArray[indexArray[i] * 3 + 2] += n[2] * a0;
            normalArray[indexArray[i + 1] * 3] += n[0] * a1;
            normalArray[indexArray[i + 1] * 3 + 1] += n[1] * a1;
            normalArray[indexArray[i + 1] * 3 + 2] += n[2] * a1;
            normalArray[indexArray[i + 2] * 3] += n[0] * a2;
            normalArray[indexArray[i + 2] * 3 + 1] += n[1] * a2;
            normalArray[indexArray[i + 2] * 3 + 2] += n[2] * a2;
        }

        // now, normalize the normals    
        for (let i = 0; i < normalArray.length; i += 3) {
            let len = Math.sqrt(
              normalArray[i] * normalArray[i]
              + normalArray[i + 1] * normalArray[i + 1]
              + normalArray[i + 2] * normalArray[i + 2]
              );
            normalArray[i] /= len;
            normalArray[i + 1] /= len;
            normalArray[i + 2] /= len;
        }
    }


    // set the VBOs
    obj.normalArray = normalArray;
    obj.textureArray = textureArray;
    obj.vertexArray = vertexArray;
    obj.numIndices = indexArray.length;
    obj.indexArray = indexArray;
    obj.polyIndexArray = polyIndexArray;
    obj.groups = groups;
    obj.loaded = true;
    obj.updateGL();

    if (callback) {
        callback(obj);
    }
};

/**
 // loadImageTexture
 //
 // Load the image at the passed url, place it in a new WebGLTexture object and return the WebGLTexture.
 //
 *
 * Original code by Apple Inc.
 */
let loadImageTexture = function (ctx, url, callback, errorCallback) {
    if (ctx == null) {
        let texture = {};
        texture.image = new Image();
        texture.image.onload = function () {
            if (callback)
                callback(texture);
        };
        texture.image.src = url;
        return texture;
    } else {
        let texture = ctx.createTexture();
        texture.image = new Image();
        texture.image.onload = function () {
            doLoadImageTexture(ctx, texture.image, texture, callback, errorCallback)
        }
        texture.image.src = url;
        return texture;
    }
};

/*
 * Original code by Apple Inc.
 */
let doLoadImageTexture = function (ctx, image, texture, callback, errorCallback) {
    ctx.bindTexture(ctx.TEXTURE_2D, texture);
    ctx.texImage2D(
      ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, image);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
    //ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
    //ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR_MIPMAP_NEAREST);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR_MIPMAP_LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.REPEAT);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.REPEAT);
    //ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    //ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    ctx.generateMipmap(ctx.TEXTURE_2D)
    ctx.bindTexture(ctx.TEXTURE_2D, null);

    if (callback)
        callback(texture);
};

/**
 * Creates the HTLM for a failure message
 * @param {string} canvasContainerId id of container of th
 *        canvas.
 * @return {string} The html.
 */
let makeFailHTML = function (msg) {
    return '' +
      '<table style="background-color: #8CE; width: 100%; height: 100%;"><tr>' +
      '<td align="center">' +
      '<div style="display: table-cell; vertical-align: middle;">' +
      '<div style="">' + msg + '</div>' +
      '</div>' +
      '</td></tr></table>';
};

/**
 * Message for getting a webgl browser
 * @type {string}
 */
let GET_A_WEBGL_BROWSER_MSG = 'This page requires a browser that supports WebGL.';
let GET_A_WEBGL_BROWSER = '' +
  GET_A_WEBGL_BROWSER_MSG + '<br/>' +
  '<a href="http://get.webgl.org">Click here to upgrade your browser.</a>';

/**
 * Message for need better hardware
 * @type {string}
 */
let OTHER_PROBLEM_MSG = "It doesn't appear your computer can support WebGL.";
let OTHER_PROBLEM = '' + OTHER_PROBLEM_MSG + "<br/>" +
  '<a href="http://get.webgl.org/troubleshooting/">Click here for more information.</a>';

/**
 * Creates a webgl context. If creation fails it will
 * change the contents of the container of the <canvas>
 * tag to an error message with the correct links for WebGL.
 * @param {Element} canvas. The canvas element to create a
 *     context from.
 * @param {WebGLContextCreationAttirbutes} opt_attribs Any
 *     creation attributes you want to pass in.
 * @return {WebGLRenderingContext} The created context or a string with an error message.
 */
let setupWebGL = function (canvas, opt_attribs, showLinkOnError) {
    function showLink(str) {
        let container = canvas.parentNode;
        if (container) {
            container.innerHTML = makeFailHTML(str);
        }
    }
    ;

    if (!window.WebGLRenderingContext) {
        if (showLinkOnError) {
            showLink(GET_A_WEBGL_BROWSER);
        }
        return GET_A_WEBGL_BROWSER_MSG;
    }

    let context = create3DContext(canvas, opt_attribs);
    if (!context) {
        if (showLinkOnError) {
            showLink(OTHER_PROBLEM);
        }
        return OTHER_PROBLEM_MSG;
    }
    return context;
};

/**
 * Creates a webgl context.
 * @param {!Canvas} canvas The canvas tag to get context
 *     from. If one is not passed in one will be created.
 * @return {!WebGLContext} The created context.
 */
let create3DContext = function (canvas, opt_attribs) {
    let names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    let context = null;
    for (let ii = 0; ii < names.length; ++ii) {
        try {
            context = canvas.getContext(names[ii], opt_attribs);
        } catch (e) {
        }
        if (context) {
            break;
        }
    }
    return context;
}



// ------------------
// MODULE API    
// ------------------
export default {
    J3DIObj: J3DIObj,
    initWebGL: initWebGL,
    checkGLError: checkGLError,
    loadShader: loadShader,
    loadFile: loadFile,
    loadXML: loadXML,
    loadFiles: loadFiles,
    makeBox: makeBox,
    makeSphere: makeSphere,
    loadObj: loadObj,
    loadImageTexture: loadImageTexture,
    create3DContext: create3DContext,
    setupWebGL: setupWebGL,
    setFileData: setFileData,
    requestAnimFrame: requestAnimFrame
};



