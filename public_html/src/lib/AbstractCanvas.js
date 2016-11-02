/*
 * @(#)AbstractCanvas.js  1.0  2014-02-24
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Base class for Cube3DCanvas and AbstractCanvas.
 */
// --------------
// require.js
// --------------
define("AbstractCanvas", ["J3DI", "J3DIMath", "Node3D"],
function (J3DI, J3DIMath, Node3D
) {

  let module = {
    log: (false) // Enable or disable logging for this module.
    ? function (msg) {
      console.log('AbstractCanvas.js ' + msg);
    }
    : function () {}
  }

// ===============================
//
// AbstractCanvas
//
// ===============================

  class AbstractCanvas {
    /** Creates a new instance. */
    constructor() {
      this.canvas = null;
      this.willRepaint = false;
      this.repaintCallbacks = [];

      this.handler = {
        onTouchStart: function (event) {},
        onTouchEnd: function (event) {},
        onTouchMove: function (event) {},
        onMouseDown: function (event) {},
        onMouseUp: function (event) {},
        onMouseMove: function (event) {}
      };
      var self = this;
      this.selectStartListener = function (event) {
        return false;
      };
      this.touchStartListener = function (event) {
        return self.handler.onTouchStart(event);
      };
      this.touchEndListener = function (event) {
        return self.handler.onTouchEnd(event);
      };
      this.touchMoveListener = function (event) {
        return self.handler.onTouchMove(event);
      };
      this.mouseDownListener = function (event) {
        return self.handler.onMouseDown(event);
      };
      this.mouseUpListener = function (event) {
        return self.handler.onMouseUp(event);
      };
      this.mouseMoveListener = function (event) {
        return self.handler.onMouseMove(event);
      };

    }

    /** Sets the HTML canvas object. 
     * Calls closeCanvas() and then openCanvas().
     * Returns true, if setting the canvas was successful, false otherwise.
     */
    setCanvas(canvas) {
      if (this.canvas != null) {
        this.canvas.removeEventListener("selectstart", this.selectStartListener);
        this.canvas.removeEventListener('mousedown', this.mouseDownListener);
        document.removeEventListener('mousemove', this.mouseMoveListener);
        document.removeEventListener('mouseup', this.mouseUpListener);
        this.canvas.removeEventListener("touchstart", this.touchStartListener);
        document.removeEventListener("touchmove", this.touchMoveListener);
        document.removeEventListener("touchend", this.touchEndListener);
        this.closeCanvas();
      }
      this.canvas = canvas;
      if (this.canvas != null) {
        var success = this.openCanvas();
        if (success) {
          this.canvas.addEventListener("selectstart", this.selectStartListener, false);
          this.canvas.addEventListener("touchstart", this.touchStartListener, false);
          document.addEventListener("touchmove", this.touchMoveListener, false);
          document.addEventListener("touchend", this.touchEndListener, false);
          this.canvas.addEventListener('mousedown', this.mouseDownListener, false);
          document.addEventListener('mouseup', this.mouseUpListener, false);
          document.addEventListener('mousemove', this.mouseMoveListener, false);
        }
        return success;
      }
      return false;
    }
    /** Gets the canvas. */
    getCanvas() {
      return this.canvas;
    }

    /** Opens the canvas for rendering. Protected method. 
     *  Returns true if opening was successful, false otherwise.
     *  This method should only be called from method setCanvas.
     */
    openCanvas() {
      // subclass responsibility
      return false;
    }
    /** Closes the current canvas. Protected method. 
     *  This method should only be called from method setCanvas.
     */
    closeCanvas() {
      // subclass responsibility
    }

    /**
     * Requests a repaint. 
     *
     * Calls the provided callback-function before drawing the cube. 
     * The cube is only drawn once if multiple repaints are pending.
     * All pending callbacks are executed in fifo order.
     *
     * @param callback an optional callback function.
     */
    repaint(callback) {
      if (callback != null) {
        this.repaintCallbacks[this.repaintCallbacks.length] = callback;
      }

      if (this.willRepaint == false) {
        this.willRepaint = true;
        var self = this;
        var f = function () {
          self.willRepaint = false;
          var start = new Date().getTime();

          // invoke all callbacks
          var callbacks = self.repaintCallbacks;
          self.repaintCallbacks = [];
          for (var i = 0; i < callbacks.length; i++) {
            callbacks[i]();
          }
          var middle = new Date().getTime();

          // draw the cube
          self.draw();
          var end = new Date().getTime();
          //console.log('AbstractCanvas.draw elapsed:'+(end-start)+' m:'+(middle-start)+' cbs:'+callbacks.length+' new:'+self.repaintCallbacks.length);
        };
        J3DI.requestAnimFrame(f, this.canvas);
      }
    }

    /** @param move twistNode. */
    pushMove(move) {
      // subclass responsibility
    }

    /**
     * Hit test for mouse events.
     */
    mouseIntersectionTest(event) {
      // subclass responsibility
    }

    /** Draws an individual object of the scene. */
    drawObjectCanvas2D(obj, mvMatrix, color, phong, forceColorUpdate) {
      if (obj == null || !obj.visible)
        return;
      if (obj.polyIndexArray) {
        this.faceCount += obj.polyIndexArray.length;
      }

      if (obj.vertexArray === null)
        return;

      // Compute a new texture array
      if (obj.textureScale != null) {
        var textureArray = new Array(obj.textureArray.length);
        for (var i = 0; i < textureArray.length; i += 2) {
          textureArray[i] = (obj.textureArray[i] + obj.textureOffsetX) * obj.textureScale;
          textureArray[i + 1] = (obj.textureArray[i + 1] + obj.textureOffsetY) * obj.textureScale;
        }
        obj.textureArray = textureArray;
        obj.textureScale = null;
      }

      var g = this.g;

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

      if (obj.polyIndexArray !== undefined) {
        for (var j = 0; j < obj.polyIndexArray.length; j++) {
          var poly = obj.polyIndexArray[j];

          var i1 = poly[0];
          var i2 = poly[1];
          var i3 = poly[poly.length - 1];
          var z = mvp.rawZ(i1, i2, i3);
          if (z > 0) {
            var light = Math.max(0, mv.normal(i1, i2, i3).dot(this.lightNormal));
            var t = this.deferredFaces[this.deferredFaceCount++];
            if (t === undefined) {
              t = new Face();
              this.deferredFaces.push(t);
            }
            t.loadPoly(
            mvp,
            obj.textureArray, obj.hasTexture ? this.stickersTexture : null,
            poly);
            this.applyFillStyle(t, mv.normal(i1, i2, i3), this.lightNormal, this.observerNormal, phong, color);
          }
        }
      } else {
        for (var j in obj.groups) {
          var isQuad = obj.groups[j][1] == 6;

          if (isQuad) {
            var i = (obj.groups[j][0]);
            var i1 = obj.indexArray[i];
            var i2 = obj.indexArray[i + 1];
            var i3 = obj.indexArray[i + 2];
            var i4 = obj.indexArray[i + 3];
            var z = mvp.rawZ(i1, i2, i3);
            if (z > 0) {
              var light = Math.max(0, mv.normal(i1, i2, i3).dot(this.lightNormal));
              //g.fillStyle='rgb('+color[0]*light+','+color[1]*light+','+color[2]*light+')';
              var t = this.deferredFaces[this.deferredFaceCount++];
              if (t === undefined) {
                t = new Face();
                this.deferredFaces.push(t);
              }
              t.loadQuad(
              mvp,
              obj.textureArray, obj.hasTexture ? this.stickersTexture : null,
              i1, i2, i3, i4);
              this.applyFillStyle(t, mv.normal(i1, i2, i3), this.lightNormal, this.observerNormal, phong, color);
            }
          } else {
            for (var k = 0; k < obj.groups[j][1]; k += 3) {
              var i = (obj.groups[j][0] + k);
              var i1 = obj.indexArray[i];
              var i2 = obj.indexArray[i + 1];
              var i3 = obj.indexArray[i + 2];
              var z = mvp.rawZ(i1, i2, i3);
              if (z > 0) {
                //var light = Math.max(0,mv.normal(i1,i2,i3).dot(this.lightNormal));
                //g.fillStyle='rgb('+color[0]*light+','+color[1]*light+','+color[2]*light+')';
                var t = this.deferredFaces[this.deferredFaceCount++];
                if (t === undefined) {
                  t = new Face();
                  this.deferredFaces.push(t);
                }
                t.loadTriangle(
                mvp,
                obj.textureArray, obj.hasTexture ? this.stickersTexture : null,
                i1, i2, i3);
                this.applyFillStyle(t, mv.normal(i1, i2, i3), this.lightNormal, this.observerNormal, phong, color);
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
    applyFillStyle(triangle, n, wi, wo, phong, color) {
      //vec3 wi = normalize(lightPos - fPos.xyz); // direction to light source
      //vec3 wo = normalize(camPos - fPos.xyz); // direction to observer
      //vec3 n = normalize(fNormal.xyz);
      var specular = Math.pow(Math.max(0.0, -(new J3DIVector3(wi).reflect(n).dot(wo))), phong[3]) * phong[2];
      var diffuse = Math.max(0.0, wi.dot(n)) * phong[1];
      var ambient = phong[0];
      var newColor = new Array(3);
      var fs = 'rgb(';
      for (var i = 0; i < 3; i++) {
        if (i != 0)
          fs += ',';
        fs += Math.round(color[i] * (diffuse + ambient) + 255 * specular);
      }
      fs += ')';
      triangle.fillStyle = fs;

      var brightness = (diffuse + ambient) + specular;
      if (brightness >= 1.0) {
        fs = 'rgba(255,255,255,' + (brightness - 1) + ')';
      } else {
        fs = 'rgba(0,0,0,' + (1 - brightness) + ')';
      }
      triangle.lightStyle = fs;
    }
  }


// ------------------
// Input Handler
// ------------------
  class AbstractHandler {
    constructor(abstractCanvas) {
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
    }
    onMouseMove(event) {
    }
    onMouseOut(event) {
    }
    onMouseUp(event) {
    }
  }
// ------------------
// Face used for rendering with canvas 2D context
// ------------------
  class Face {
    constructor() {
      this.length = 0;
      this.vertices = new Array(10);
      this.txCoords = new Array(10);
      this.txImage = null;
      this.fillStyle = 'rgb(0,0,0)';
      this.lightStyle = 'rgba(0,0,0,255)';
      this.depth = 0;
    }

    loadTriangle(v, txc, txi, i1, i2, i3) {
      this.length = 6;
      this.vertices[0] = v[i1 * 3];
      this.vertices[1] = v[i1 * 3 + 1];
      this.vertices[2] = v[i2 * 3];
      this.vertices[3] = v[i2 * 3 + 1];
      this.vertices[4] = v[i3 * 3];
      this.vertices[5] = v[i3 * 3 + 1];
      this.txCoords[0] = txc[i1 * 2];
      this.txCoords[1] = txc[i1 * 2 + 1];
      this.txCoords[2] = txc[i2 * 2];
      this.txCoords[3] = txc[i2 * 2 + 1];
      this.txCoords[4] = txc[i3 * 2];
      this.txCoords[5] = txc[i3 * 2 + 1];

      this.txImage = txi;

      this.depth = (v[i1 * 3 + 2] + v[i2 * 3 + 2] + v[i3 * 3 + 2]) / 3;
    }
    loadQuad(v, txc, txi, i1, i2, i3, i4) {
      this.length = 8;
      this.vertices[0] = v[i1 * 3];
      this.vertices[1] = v[i1 * 3 + 1];
      this.vertices[2] = v[i2 * 3];
      this.vertices[3] = v[i2 * 3 + 1];
      this.vertices[4] = v[i3 * 3];
      this.vertices[5] = v[i3 * 3 + 1];
      this.vertices[6] = v[i4 * 3];
      this.vertices[7] = v[i4 * 3 + 1];
      this.txCoords[0] = txc[i1 * 2];
      this.txCoords[1] = txc[i1 * 2 + 1];
      this.txCoords[2] = txc[i2 * 2];
      this.txCoords[3] = txc[i2 * 2 + 1];
      this.txCoords[4] = txc[i3 * 2];
      this.txCoords[5] = txc[i3 * 2 + 1];
      this.txCoords[6] = txc[i4 * 2];
      this.txCoords[7] = txc[i4 * 2 + 1];
      this.txImage = txi;

      this.depth = (v[i1 * 3 + 2] + v[i2 * 3 + 2] + v[i3 * 3 + 2] + v[i4 * 3 + 2]) / 4;
    }
    loadPoly(v, txc, txi, indices) {
      this.length = indices.length * 2;
      this.depth = 0;
      for (var i = 0; i < indices.length; i++) {
        this.vertices[i * 2] = v[indices[i] * 3];
        this.vertices[i * 2 + 1] = v[indices[i] * 3 + 1];
        this.depth += v[indices[i] * 3 + 2];
        this.txCoords[i * 2] = txc[indices[i] * 2];
        this.txCoords[i * 2 + 1] = txc[indices[i] * 2 + 1];
      }
      this.txImage = txi;
      this.depth /= indices.length;
    }

    /** Draws by extending the polygon by 0.5 pixels.
     *
     *              /+-----+\
     *  +----+      +       +
     *  |    |  =>  |       |
     *  +----+      +       +
     *              \+-----+/
     */
    draw(g) {
      if (this.txImage != null) {
        this.drawTexturedFaceTriangulated(g);
      } else {
        this.drawColoredFace(g);
      }
    }
    drawTexturedFaceTriangulated(g) {
      var v = this.vertices;
      var t = this.txCoords;
      for (var i = 5; i < this.length; i += 2) {
        this.drawTexturedTriangle(g, this.txImage.image,
        v[0], v[1], v[i - 3], v[i - 2], v[i - 1], v[i],
        t[0], t[1], t[i - 3], t[i - 2], t[i - 1], t[i]);
      }
      this.applyExtendedPath(g);
      g.fillStyle = this.lightStyle;
      g.fill();
    }
    drawColoredFace(g) {
      this.applyExtendedPath(g);
      g.fillStyle = this.fillStyle;
      g.fill();
    }
    applyExtendedPath(g) {
      var v = this.vertices;
      var extra = -0.25;
      g.beginPath();
      for (var i = 0; i < this.length; i += 2) {
        var j = (i - 2 + this.length) % this.length; // vector j points from previous point to i
        var k = (i + 2) % this.length; // vector k points from next point to i
        var jx = v[i] - v[j];
        var jy = v[i + 1] - v[j + 1];
        var jlen = Math.sqrt(jx * jx + jy * jy);

        var kx = v[i] - v[k];
        var ky = v[i + 1] - v[k + 1];
        var klen = Math.sqrt(kx * kx + ky * ky);

        if (i == 0) {
          g.moveTo(v[i] + jy * extra / jlen, v[i + 1] - jx * extra / jlen);
          g.lineTo(v[i] - ky * extra / klen, v[i + 1] + kx * extra / klen);
        } else {
          g.lineTo(v[i] + jy * extra / jlen, v[i + 1] - jx * extra / jlen);
          g.lineTo(v[i] - ky * extra / klen, v[i + 1] + kx * extra / klen);
        }
      }
    }
    applySimplePath(g) {
      var v = this.vertices;
      g.beginPath();
      g.moveTo(v[0], v[1]);
      for (var i = 2; i < this.length; i += 2) {
        g.lineTo(v[i], v[i + 1]);
      }
    }
    /** Simpler and faster drawing method, produces cracks between faces due
     to antialias renderer of canvas2d.
     */
    drawColoredFaceSimple(g) {
      var v = this.vertices;
      g.fillStyle = this.fillStyle;
      g.beginPath();
      g.moveTo(v[0], v[1]);
      for (var i = 2; i < this.length; i += 2) {
        g.lineTo(v[i], v[i + 1]);
      }
      //g.closePath();
      g.fill();
      //g.stroke();
    }
    /**
     * uses affine texture mapping to draw a textured triangle
     * at screen coordinates [x0, y0], [x1, y1], [x2, y2] from
     * img *pixel* coordinates [u0, v0], [u1, v1], [u2, v2]
     *
     * Copyright 2010 Brendan Kenny
     * 
     * Licensed under the Apache License, Version 2.0 (the "License"); you may not
     * use this file except in compliance with the License. You may obtain a copy of
     * the License at
     * 
     * http://www.apache.org/licenses/LICENSE-2.0
     * 
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
     * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
     * License for the specific language governing permissions and limitations under
     * the License.
     */
    drawTexturedTriangle(g, img, x0, y0, x1, y1, x2, y2,
    u0, v0, u1, v1, u2, v2) {

      // abort if one of the variables is NaN
      if (x0 != x0 || y0 != y0 || x1 != x1 || y1 != y1 || x2 != x2 || y2 != y2)
        return;
      if (u0 != u0 || v0 != v0 || u1 != u1 || v1 != v1 || u2 != u2 || v2 != v2)
        return;

      // store clipping coordinates
      var cx0 = x0, cy0 = y0, cx1 = x1, cy1 = y1, cx2 = x2, cy2 = y2;
      // store texture coordinates
      var cu0 = u0, cv0 = v0, cu1 = u1, cv1 = v1, cu2 = u2, cv2 = v2;

      // scale u,v coordinates
      u0 *= img.width;
      v0 *= img.height;
      u1 *= img.width;
      v1 *= img.height;
      u2 *= img.width;
      v2 *= img.height;


      x1 -= x0;
      y1 -= y0;
      x2 -= x0;
      y2 -= y0;

      u1 -= u0;
      v1 -= v0;
      u2 -= u0;
      v2 -= v0;

      var det = 1 / (u1 * v2 - u2 * v1),
      // linear transformation
      a = (v2 * x1 - v1 * x2) * det,
      b = (v2 * y1 - v1 * y2) * det,
      c = (u1 * x2 - u2 * x1) * det,
      d = (u1 * y2 - u2 * y1) * det,
      // translation
      e = x0 - a * u0 - c * v0,
      f = y0 - b * u0 - d * v0;
      /*   
       if (det != det) {
       return;
       }*/


      // SIMPLE
      /*
       g.beginPath();
       g.moveTo(cx0, cy0);
       g.lineTo(cx1, cy1);
       g.lineTo(cx2, cy2);
       g.closePath();
       */

      // FATTER
      var v = [cx0, cy0, cx1, cy1, cx2, cy2];
      var extra = -0.3;
      var len = 6;
      g.beginPath();
      for (var i = 0; i < len; i += 2) {
        var j = (i - 2 + len) % len; // vector j points from previous point to i
        var k = (i + 2) % len; // vector k points from next point to i
        var jx = v[i] - v[j];
        var jy = v[i + 1] - v[j + 1];
        var jlen = Math.sqrt(jx * jx + jy * jy);

        var kx = v[i] - v[k];
        var ky = v[i + 1] - v[k + 1];
        var klen = Math.sqrt(kx * kx + ky * ky);

        if (i == 0) {
          g.moveTo(v[i] + jy * extra / jlen, v[i + 1] - jx * extra / jlen);
          g.lineTo(v[i] - ky * extra / klen, v[i + 1] + kx * extra / klen);
        } else {
          g.lineTo(v[i] + jy * extra / jlen, v[i + 1] - jx * extra / jlen);
          g.lineTo(v[i] - ky * extra / klen, v[i + 1] + kx * extra / klen);
        }
      }
      g.closePath();

      g.save();
      g.transform(a, b, c, d, e, f);
      g.clip();
      g.drawImage(img, 0, 0);
      /*
       g.fillStyle=this.lightStyle;
       g.fillRect(0,0,img.width,img.height);
       */
      g.restore();
    }
  }
// ------------------
// MODULE API    
// ------------------
  return {
    AbstractCanvas: AbstractCanvas,
    AbstractHandler: AbstractHandler,
    Face: Face
  };
});
