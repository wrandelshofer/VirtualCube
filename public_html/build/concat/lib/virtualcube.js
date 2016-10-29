/* @(#)virtualcube.js 1.0.6 2015-09-21
* Copyright (c) 2016 Werner Randelshofer, Switzerland.
* You may not use, copy or modify this file, except in compliance with the
* accompanying license terms.
*/
{
/**
 * @license almond 0.3.3 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, http://github.com/requirejs/almond/LICENSE
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice,
        jsSuffixRegExp = /\.js$/;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap, lastIndex,
            foundI, foundStarMap, starI, i, j, part, normalizedBaseParts,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name) {
            name = name.split('/');
            lastIndex = name.length - 1;

            // If wanting node ID compatibility, strip .js from end
            // of IDs. Have to do this here, and not in nameToUrl
            // because node allows either .js or non .js to map
            // to same file.
            if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
            }

            // Starts with a '.' so need the baseName
            if (name[0].charAt(0) === '.' && baseParts) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that 'directory' and not name of the baseName's
                //module. For instance, baseName of 'one/two/three', maps to
                //'one/two/three.js', but we want the directory, 'one/two' for
                //this normalization.
                normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                name = normalizedBaseParts.concat(name);
            }

            //start trimDots
            for (i = 0; i < name.length; i++) {
                part = name[i];
                if (part === '.') {
                    name.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    // If at the start, or previous value is still ..,
                    // keep them so that when converted to a path it may
                    // still work when converted to a path, even though
                    // as an ID it is less than ideal. In larger point
                    // releases, may be better to just kick out an error.
                    if (i === 0 || (i === 1 && name[2] === '..') || name[i - 1] === '..') {
                        continue;
                    } else if (i > 0) {
                        name.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
            //end trimDots

            name = name.join('/');
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            var args = aps.call(arguments, 0);

            //If first arg is not require('string'), and there is only
            //one arg, it is the array form without a callback. Insert
            //a null so that the following concat is correct.
            if (typeof args[0] !== 'string' && args.length === 1) {
                args.push(null);
            }
            return req.apply(undef, args.concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    //Creates a parts array for a relName where first part is plugin ID,
    //second part is resource ID. Assumes relName has already been normalized.
    function makeRelParts(relName) {
        return relName ? splitPrefix(relName) : [];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relParts) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0],
            relResourceName = relParts[1];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relResourceName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relResourceName));
            } else {
                name = normalize(name, relResourceName);
            }
        } else {
            name = normalize(name, relResourceName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i, relParts,
            args = [],
            callbackType = typeof callback,
            usingExports;

        //Use name if no relName
        relName = relName || name;
        relParts = makeRelParts(relName);

        //Call the callback to define the module, if necessary.
        if (callbackType === 'undefined' || callbackType === 'function') {
            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relParts);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback ? callback.apply(defined[name], args) : undefined;

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, makeRelParts(callback)).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (config.deps) {
                req(config.deps, config.callback);
            }
            if (!callback) {
                return;
            }

            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        return req(cfg);
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {
        if (typeof name !== 'string') {
            throw new Error('See almond README: incorrect module build, no module name');
        }

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());
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
define("AbstractCanvas", ["J3DI","J3DIMath","Node3D"], 
function(J3DI,J3DIMath,Node3D
) {

// ===============================
//
// AbstractCanvas
//
// ===============================

class AbstractCanvas { 
  /** Creates a new instance. */
  constructor () {
    this.canvas=null;
    this.willRepaint=false;
    this.repaintCallbacks=[];
  
    this.handler = {
      onTouchStart: function(event) {},
      onTouchEnd: function(event) {},
      onTouchMove: function(event) {},
      onMouseDown: function(event) {},
      onMouseUp: function(event) {},
      onMouseMove: function(event) {}
    };
    var self = this;
    this.selectStartListener = function (event) {return false;};
    this.touchStartListener = function (event) {return self.handler.onTouchStart(event);};
    this.touchEndListener = function (event) {return self.handler.onTouchEnd(event);};
    this.touchMoveListener = function (event) {return self.handler.onTouchMove(event);};
    this.mouseDownListener = function(event) {return self.handler.onMouseDown(event);};
    this.mouseUpListener = function(event) {return self.handler.onMouseUp(event);};
    this.mouseMoveListener = function(event) {return self.handler.onMouseMove(event);};
    
  }
  
  
  /** Sets the HTML canvas object. 
    * Calls closeCanvas() and then openCanvas().
    * Returns true, if setting the canvas was successful, false otherwise.
    */
  setCanvas(canvas) {
    if (this.canvas != null) {
      this.canvas.removeEventListener("selectstart",this.selectStartListener);
      this.canvas.removeEventListener('mousedown',this.mouseDownListener);
      document.removeEventListener('mousemove', this.mouseMoveListener);
      document.removeEventListener('mouseup', this.mouseUpListener);
      this.canvas.removeEventListener("touchstart", this.touchStartListener);
      document.removeEventListener("touchmove", this.touchMoveListener);
      document.removeEventListener("touchend", this.touchEndListener);
      this.closeCanvas();
    }
    this.canvas=canvas;
    if (this.canvas != null) {
       var success = this.openCanvas();
       if (success) {
          this.canvas.addEventListener("selectstart",this.selectStartListener, false);
          this.canvas.addEventListener("touchstart", this.touchStartListener, false);
          document.addEventListener("touchmove", this.touchMoveListener, false);
          document.addEventListener("touchend", this.touchEndListener, false);
          this.canvas.addEventListener('mousedown',this.mouseDownListener,false);
          document.addEventListener('mouseup', this.mouseUpListener, false);
          document.addEventListener('mousemove', this.mouseMoveListener,false);
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
      this.repaintCallbacks[this.repaintCallbacks.length]=callback;
    }
    
    if (this.willRepaint == false) {
      this.willRepaint=true;
      var self=this;
      var f=function() {
        self.willRepaint=false;
        var start=new Date().getTime();
        
        // invoke all callbacks
        var callbacks=self.repaintCallbacks;
        self.repaintCallbacks=[];
        for (var i=0;i<callbacks.length;i++) {
          callbacks[i]();
        }
        var middle=new Date().getTime();
        
        // draw the cube
        self.draw();
        var end=new Date().getTime();
        //console.log('AbstractCanvas.draw elapsed:'+(end-start)+' m:'+(middle-start)+' cbs:'+callbacks.length+' new:'+self.repaintCallbacks.length);
      };
      J3DI.requestAnimFrame(f, this.canvas);
    }
  }
  
  /** Prints a log message. */
  log(msg) {
    console.log(msg);
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
  applyFillStyle (triangle, n,wi,wo,phong,color) {
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
}


// ------------------
// Input Handler
// ------------------
class AbstractHandler {
  constructor(abstractCanvas) {
    this.canvas = abstractCanvas;
    
    this.mouseDownX=undefined;
    this.mouseDownY=undefined;
    this.mousePrevX=undefined;
    this.mousePrevY=undefined;
    this.mousePrevTimestamp=undefined;
  }
  
  
  /**
   * Touch handler for the canvas object.
   * Forwards everything to the mouse handler.
   */
  onTouchStart(event) {
    if (event.touches.length == 1) {
      event.preventDefault();
      event.clientX=event.touches[0].clientX;
      event.clientY=event.touches[0].clientY;
      this.onMouseDown(event);
    } else {
      this.isMouseDrag = false;
    }
  }
  onTouchEnd(event) {
    event.clientX=this.mousePrevX;
    event.clientY=this.mousePrevY;
    this.onMouseUp(event);
  }
  onTouchMove(event) {
    event.clientX=event.touches[0].clientX;
    event.clientY=event.touches[0].clientY;
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

  loadTriangle (v,txc,txi,i1,i2,i3) {
    this.length = 6;
    this.vertices[0]=v[i1*3];
    this.vertices[1]=v[i1*3+1];
    this.vertices[2]=v[i2*3];
    this.vertices[3]=v[i2*3+1];
    this.vertices[4]=v[i3*3];
    this.vertices[5]=v[i3*3+1];
    this.txCoords[0]=txc[i1*2];
    this.txCoords[1]=txc[i1*2+1];
    this.txCoords[2]=txc[i2*2];
    this.txCoords[3]=txc[i2*2+1];
    this.txCoords[4]=txc[i3*2];
    this.txCoords[5]=txc[i3*2+1];
    
    this.txImage=txi;
    
    this.depth = (v[i1*3+2]+v[i2*3+2]+v[i3*3+2])/3;
  }
  loadQuad (v,txc,txi,i1,i2,i3,i4) {
    this.length = 8;
    this.vertices[0]=v[i1*3];
    this.vertices[1]=v[i1*3+1];
    this.vertices[2]=v[i2*3];
    this.vertices[3]=v[i2*3+1];
    this.vertices[4]=v[i3*3];
    this.vertices[5]=v[i3*3+1];
    this.vertices[6]=v[i4*3];
    this.vertices[7]=v[i4*3+1];
    this.txCoords[0]=txc[i1*2];
    this.txCoords[1]=txc[i1*2+1];
    this.txCoords[2]=txc[i2*2];
    this.txCoords[3]=txc[i2*2+1];
    this.txCoords[4]=txc[i3*2];
    this.txCoords[5]=txc[i3*2+1];
    this.txCoords[6]=txc[i4*2];
    this.txCoords[7]=txc[i4*2+1];
    this.txImage=txi;
    
    this.depth = (v[i1*3+2]+v[i2*3+2]+v[i3*3+2]+v[i4*3+2])/4;
  }
  loadPoly (v,txc,txi,indices) {
    this.length = indices.length*2;
    this.depth = 0;
    for (var i=0;i<indices.length;i++) {
      this.vertices[i*2]=v[indices[i]*3];
      this.vertices[i*2+1]=v[indices[i]*3+1];
      this.depth += v[indices[i]*3+2];
      this.txCoords[i*2]=txc[indices[i]*2];
      this.txCoords[i*2+1]=txc[indices[i]*2+1];
    }
    this.txImage=txi;
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
  draw (g) {
    if (this.txImage != null) {
      this.drawTexturedFaceTriangulated(g);
    } else {
      this.drawColoredFace(g);
    }
  }
  drawTexturedFaceTriangulated (g) {
    var v=this.vertices;
    var t=this.txCoords;
    for (var i=5;i<this.length;i+=2) {
        this.drawTexturedTriangle(g,this.txImage.image, 
          v[0], v[1], v[i-3], v[i-2], v[i-1], v[i],
          t[0], t[1], t[i-3], t[i-2], t[i-1], t[i]);
    }
    this.applyExtendedPath(g);
    g.fillStyle=this.lightStyle;
    g.fill();
  }
  drawColoredFace (g) {
    this.applyExtendedPath(g);
    g.fillStyle=this.fillStyle;
    g.fill();
  }
  applyExtendedPath (g) {
    var v=this.vertices;
    var extra=-0.25;
    g.beginPath();
    for (var i=0;i<this.length;i+=2) {
      var j=(i-2+this.length)%this.length; // vector j points from previous point to i
      var k=(i+2)%this.length; // vector k points from next point to i
      var jx=v[i]-v[j];
      var jy=v[i+1]-v[j+1];
      var jlen=Math.sqrt(jx*jx+jy*jy);
      
      var kx=v[i]-v[k];
      var ky=v[i+1]-v[k+1];
      var klen=Math.sqrt(kx*kx+ky*ky);
      
      if (i==0) {
        g.moveTo(v[i]+jy*extra/jlen,v[i+1]-jx*extra/jlen);
        g.lineTo(v[i]-ky*extra/klen,v[i+1]+kx*extra/klen);
      } else {
        g.lineTo(v[i]+jy*extra/jlen,v[i+1]-jx*extra/jlen);
        g.lineTo(v[i]-ky*extra/klen,v[i+1]+kx*extra/klen);
      }
    }
  }
  applySimplePath (g) {
    var v=this.vertices;
    g.beginPath();
    g.moveTo(v[0],v[1]);
    for (var i=2;i<this.length;i+=2) {
      g.lineTo(v[i],v[i+1]);
    }
  }
  /** Simpler and faster drawing method, produces cracks between faces due
      to antialias renderer of canvas2d.
  */
  drawColoredFaceSimple (g) {
    var v=this.vertices;
    g.fillStyle=this.fillStyle;
    g.beginPath();
    g.moveTo(v[0],v[1]);
    for (var i=2;i<this.length;i+=2) {
      g.lineTo(v[i],v[i+1]);
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
  drawTexturedTriangle (g,img, x0, y0, x1, y1, x2, y2,
                                     u0, v0, u1, v1, u2, v2) {
   
    // abort if one of the variables is NaN
    if (x0!=x0||y0!=y0||x1!=x1||y1!=y1||x2!=x2||y2!=y2) return;
    if (u0!=u0||v0!=v0||u1!=u1||v1!=v1||u2!=u2||v2!=v2) return;
    
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
   
    var det = 1 / (u1*v2 - u2*v1),
   
    // linear transformation
    a = (v2*x1 - v1*x2) * det,
    b = (v2*y1 - v1*y2) * det,
    c = (u1*x2 - u2*x1) * det,
    d = (u1*y2 - u2*y1) * det,
  
    // translation
    e = x0 - a*u0 - c*v0,
    f = y0 - b*u0 - d*v0;
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
    var v=[cx0,cy0,cx1,cy1,cx2,cy2];
    var extra=-0.3;
    var len=6;
    g.beginPath();
    for (var i=0;i<len;i+=2) {
      var j=(i-2+len)%len; // vector j points from previous point to i
      var k=(i+2)%len; // vector k points from next point to i
      var jx=v[i]-v[j];
      var jy=v[i+1]-v[j+1];
      var jlen=Math.sqrt(jx*jx+jy*jy);
      
      var kx=v[i]-v[k];
      var ky=v[i+1]-v[k+1];
      var klen=Math.sqrt(kx*kx+ky*ky);
      
      if (i==0) {
        g.moveTo(v[i]+jy*extra/jlen,v[i+1]-jx*extra/jlen);
        g.lineTo(v[i]-ky*extra/klen,v[i+1]+kx*extra/klen);
      } else {
        g.lineTo(v[i]+jy*extra/jlen,v[i+1]-jx*extra/jlen);
        g.lineTo(v[i]-ky*extra/klen,v[i+1]+kx*extra/klen);
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
  AbstractCanvas : AbstractCanvas,
  AbstractHandler : AbstractHandler,
  Face : Face
};
});
/*
 * @(#)AbstractPlayerApplet.js  3.0  2016-09-16
 *
 * Copyright (c) 2013-2016 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
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
define("AbstractPlayerApplet", ["AbstractCanvas","Node3D","J3DI","J3DIMath","ScriptParser",
    
"RubiksCubeS1Cube3D",
"RubiksCubeS4Cube3D",

"PocketCubeS1Cube3D",
"PocketCubeS4Cube3D"
], 
function(AbstractCanvas,Node3D,J3DI,J3DIMath,ScriptParser,
  
RubiksCubeS1Cube3D,
RubiksCubeS4Cube3D,

PocketCubeS1Cube3D,
PocketCubeS4Cube3D
) {

let module = {
  log: (false) // Enable or disable logging for this module.
    ? function(msg) { console.log('AbstractPlayerApplet.js '+msg); }
    : function() {}
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
let parseColorMap=function(str) {
  let map=[];
  if (str==null) return map;
  
  let tokens=str.split(/([ =,]+)/);
  let elementIndex=0;
  for (let i=0;i<tokens.length;) {
    let key = null;
    if (i<tokens.length - 1 && tokens[i+1].indexOf('=')!=-1) {
      // found a key
      if (! tokens[i].match(/^\w+$/)) {
        console.log('parseColorMap::found illegal key:"'+key+'" in map:"'+str+'"');
        break;
      } else {
        key = tokens[i];
      }
      i+=2; // consume key and '=' after key
    }
    if (tokens[i].match(/^(0x|#)[0-9a-fA-F]+$/)) { 
      // found a value
      let stringValue = tokens[i];
      let hasAlpha=false;
      if (stringValue[0]=='#') {
        stringValue = '0x'+stringValue.substring(1);
      }
      hasAlpha = stringValue.length==10;
      let intValue = parseInt(stringValue);
      let rgbaValue = [(intValue>>>16)&0xff,(intValue>>>8)&0xff,intValue&0xff,
            hasAlpha?((intValue>>>24)&0xff):0xff]

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
        console.log('parseColorMap::found illegal token:"'+tokens[i]+'" in map:"'+str+'"');
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
let parseWordList=function(str) {
  let map=[];
  if (str==null) return map;
  
  let tokens=str.split(/([ ,]+)/);
  let elementIndex=0;
  for (let i=0;i<tokens.length;) {
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
    this.handler=new Cube3DHandler(this);
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
    this.undoList = [];
    this.redoIndex = 0;
    
    // applet parameters
    // FIXME some parameters are read from here, and others are read
    // directly from the canvas
    this.parameters={
      // note: all parameters delivered from html are lowercase!
      baseurl:'lib/',
      colortable:null,//frdblu (deprecated)
      colorlist:null,//rufldb
    };
  }

  
  createCube3D() {
    this.debugFPS = this.canvas.getAttribute("debug").indexOf("fps") != -1;
    let c = this.canvas.getAttribute("kind");
    let cname = c==null?"":c.trim();
    if (cname.length == 0) {
      cname = "RubiksCube";
    }
    let isParts = (cname.lastIndexOf(" parts")==cname.length-6);
    if (isParts) {
      cname = cname.substring(0,cname.length-6);
    }
    let isSpecificModel  = (cname.lastIndexOf(" s")==cname.length-3);
    if (! isSpecificModel) {
      if (this.useFullModel) {
        cname = cname + ' s4';
      } else {
        cname = cname + ' s2';
      }
    }
    
    let c3d=null;
    switch (cname) {
      case "RubiksCube s1" :
      case "RubiksCube s2" :
        c3d = new RubiksCubeS1Cube3D.Cube3D();
        break;
      case "RubiksCube s3" :
      case "RubiksCube s4" :
        c3d = new RubiksCubeS4Cube3D.Cube3D();
        break;
        
      case "PocketCube s1" :
      case "PocketCube s2" :
        c3d = new PocketCubeS1Cube3D.Cube3D();
        break;
      case "PocketCube s3" :
      case "PocketCube s4" :
        c3d = new PocketCubeS4Cube3D.Cube3D();
        break;
        
        
        
      default :
        this.log('Error: illegal cube attribute :'+cname);
        if (this.useFullModel) {
          c3d = new RubiksCubeS4Cube3D.Cube3D();
        } else {
          c3d = new RubiksCubeS1Cube3D.Cube3D();
        }
    }
    if (c3d!=null) {
      c3d.baseUrl = this.parameters.baseurl;
      c3d.loadGeometry();
      
      if (isParts) {
        let a=c3d.attributes;
        for (let i=0;i<a.stickersFillColor.length;i++) {
          a.stickersFillColor[i] = a.partsFillColor[0];
          a.stickersPhong[i] = a.partsPhong[0];
        }
      }
      return c3d;
    }
  }
  
  /** Sets Cube3D object. */
  setCube3D(cube3d) {
    this.cube3d=cube3d;
  }
  
  /** Gets Cube3D object. */
  getCube3D() {
    return this.cube3d;
  }
  
  /** Initializes the scene.-
   * This function is called from openCanvas().
   */
  initScene() {
    let self=this;
    let fRepaint=function() {self.repaint();};
    
    
    this.world=new Node3D.Node3D();
    this.cube3d=this.createCube3D();
    this.readParameters(this.cube3d);
    this.cube3d.repaintFunction=fRepaint;
    this.cubeSize=this.cube3d.partSize*this.cube3d.cube.layerCount; // size of a cube side in centimeters
    this.world.add(this.cube3d);
    this.cube=this.cube3d.cube;
    this.cube3d.addChangeListener(this);
    let attr=this.cube3d.attributes;
    
    this.cubeSize=this.cube3d.partSize*this.cube3d.cube.layerCount; // size of a cube side in centimeters
    this.currentAngle=0;
    this.xRot=attr.xRot;
    this.yRot=attr.yRot;
    this.camPos=new J3DIVector3(0,0,-this.cubeSize*1.35);
    this.lookAtPos=new J3DIVector3(0,0,0);
    this.up=new J3DIVector3(0,1,0);
    this.lightPos=new J3DIVector3(4,-4,8);
    this.lightNormal=new J3DIVector3(-4,4,-8).normalize();
    this.observerNormal=new J3DIVector3(this.camPos).normalize();
    
    let stickersImageURL=this.canvas.getAttribute('stickersImage');
    if (stickersImageURL!=null&&stickersImageURL!='null') {
      attr.stickersImageURL=stickersImageURL;
    }
     
    if (attr.stickersImageURL) {
      this.stickersTexture=J3DI.loadImageTexture(this.gl,attr.stickersImageURL,fRepaint);
    }
    this.cube3d.validateAttributes();
    
    
    this.mvMatrix = new J3DIMatrix4();
    this.perspectiveMatrix = new J3DIMatrix4();
    this.mvpMatrix = new J3DIMatrix4();
    this.mvNormalMatrix = new J3DIMatrix4();
    this.invCameraMatrix=new J3DIMatrix4();  
    this.cameraMatrix=new J3DIMatrix4();  
    this.rotationMatrix = new J3DIMatrix4();
    this.viewportMatrix = new J3DIMatrix4();
    
    this.forceColorUpdate=false;
  }
  
  
  updateMatrices() {
    // Update the perspective matrix
    this.cameraMatrix.makeIdentity();
    this.cameraMatrix.lookat(
          this.camPos[0], this.camPos[1], this.camPos[2], 
          this.lookAtPos[0], this.lookAtPos[1], this.lookAtPos[2], 
          this.up[0], this.up[1], this.up[2]
          );
      
    let flip=new J3DIMatrix4();
    flip.scale(1,1,-1);
    flip.multiply(this.cameraMatrix);
    this.cameraMatrix.load(flip);    
    
    this.perspectiveMatrix.makeIdentity();
    this.perspectiveMatrix.perspective(30, this.width/this.height, 1, 12);
    this.perspectiveMatrix.multiply(this.cameraMatrix);
  //    this.perspectiveMatrix.scale(1,1,1);
      
    this.invCameraMatrix.load(this.cameraMatrix);
    this.invCameraMatrix.invert();
    this.rasterToCameraMatrix = new J3DIMatrix4(this.perspectiveMatrix);
    this.rasterToCameraMatrix.invert();
      
    // world-view transformation
    let attr=this.cube3d.attributes;
    let wvMatrix = this.world.matrix;
    wvMatrix.makeIdentity();
    wvMatrix.multiply(this.rotationMatrix);
    wvMatrix.rotate(attr.xRot,1,0,0);
    wvMatrix.rotate(attr.yRot,0,-1,0);
    wvMatrix.rotate(this.currentAngle, 1,1,1);
    let scaleFactor =0.4*attr.scaleFactor;  
    wvMatrix.scale(scaleFactor,scaleFactor,scaleFactor);
    
  }
  
  /** Draws the scene. */
  draw() {
    if (!this.camPos) return;
  
    this.reshape();
    this.updateMatrices();
    this.cube3d.doValidateDevelopAttributes();
    let self=this;
    
    this.clearCanvas();
  
    let start = new Date().getTime();	
    this.faceCount=0;
    if (this.cube3d.isDrawTwoPass) {
      this.drawTwoPass(this.cube3d);
    } else {
      this.drawSinglePass(this.cube3d);
    }
  
    if (this.debugFPS && this.g != null) {
      let end = new Date().getTime();	
      let elapsed=end-start;
      let g=this.g;
      g.fillStyle='rgb(0,0,0)';
      g.fillText("faces:"+(this.faceCount)+
        " elapsed:"+(end-start)
        ,20,20);
    }
  }
  drawSinglePass(cube3d) {
    //this.clearGLError('draw...');
    
    //if (!this.camPos) return;
    
   //   this.reshape();
   //   this.updateMatrices();
      let self=this;
      
    //  this.clearCanvas();
  
      //let cube3d=this.cube3d;
      cube3d.repainter=this;
      let attr=this.cube3d.attributes;
      cube3d.updateAttributes();
  
      // part colors
      let ccenter=attr.partsFillColor[cube3d.centerOffset];
      let cparts=attr.partsFillColor[cube3d.cornerOffset];
      //let phongparts=[0.5,0.6,0.4,16.0];//ambient, diffuse, specular, shininess
      //let phongstickers=[0.8,0.2,0.1,8.0];//ambient, diffuse, specular, shininess
    
      //  this.log('  center w==c3d.p          ?:'+(this.world===this.cube3d.parent));
      //  this.log('  center c3d==c3d.parts[0].p?:'+(this.cube3d===this.cube3d.parts[0].parent));
      //	this.world.add(this.cube3d); 
      
    // model view transformation
    let mvMatrix=this.mvMatrix;
  
    // draw center parts
    for (let i=0;i<cube3d.centerCount;i++) {
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.centerOffset+i].transform(mvMatrix);
      this.drawObject(cube3d.centerObj, mvMatrix, ccenter,attr.partsPhong[this.cube3d.centerOffset+i]);  
    }
   
    // draw side parts
    for (let i=0;i<cube3d.sideCount;i++) {
        mvMatrix.makeIdentity();
        cube3d.parts[cube3d.sideOffset+i].transform(mvMatrix);
        this.drawObject(cube3d.sideObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.sideOffset+i]);  
  
        let si=cube3d.getStickerIndexForPartIndex(cube3d.sideOffset+i,0);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
        attr.stickersFillColor[si], 
        attr.stickersPhong[si]);
    }
    // draw edge parts
    for (let i=0;i<cube3d.edgeCount;i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.edgeOffset+i].transform(mvMatrix);
        this.drawObject(cube3d.edgeObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.edgeOffset+i]);  
  
        let si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,0);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
          attr.stickersFillColor[si], 
          attr.stickersPhong[si]);
        si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,1);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
          attr.stickersFillColor[si], 
          attr.stickersPhong[si]);
    }
    // draw corner parts
    for (let i=0;i<cube3d.cornerCount;i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.cornerOffset+i].transform(mvMatrix);
        this.drawObject(cube3d.cornerObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.cornerOffset+i],this.forceColorUpdate);  
        let si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,1);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
        si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,0);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
        si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,2);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
    }
    this.flushCanvas();
    this.forceColorUpdate=false;
    //this.checkGLError('...draw');
      
  }
  
  /** Draws the scene. */
  drawTwoPass(cube3d) {
    if (!this.camPos) return;
  
    this.reshape();
    this.updateMatrices();
    let self=this;
    
    this.clearCanvas();
    
  
    //let cube3d=this.cube3d;
    cube3d.repainter=this;
    cube3d.validateAttributes();
    
    let attr=cube3d.attributes;
  
    // part colors
    let ccenter=attr.partsFillColor[cube3d.centerOffset];
    let cparts=attr.partsFillColor[cube3d.cornerOffset];
    
      
    // model view transformation
    let mvMatrix=this.mvMatrix;
  {
    // draw center parts
    for (let i=0;i<this.cube3d.centerCount;i++) {
      mvMatrix.makeIdentity();
      cube3d.parts[cube3d.centerOffset+i].transform(mvMatrix);
      this.drawObject(cube3d.centerObj, mvMatrix, ccenter,attr.partsPhong[cube3d.centerOffset+i]);  
    }
    // draw side parts
    for (let i=0;i<cube3d.sideCount;i++) {
        mvMatrix.makeIdentity();
        cube3d.parts[cube3d.sideOffset+i].transform(mvMatrix);
        this.drawObject(cube3d.sideObj, mvMatrix, cparts, attr.partsPhong[cube3d.sideOffset+i]);  
    }
    // draw edge parts
    for (let i=0;i<cube3d.edgeCount;i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.edgeOffset+i].transform(mvMatrix);
        this.drawObject(cube3d.edgeObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.edgeOffset+i]);  
    }
    // draw corner parts
    for (let i=0;i<cube3d.cornerCount;i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.cornerOffset+i].transform(mvMatrix);
        this.drawObject(cube3d.cornerObj, mvMatrix, cparts, attr.partsPhong[this.cube3d.cornerOffset+i],this.forceColorUpdate);  
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
    for (let i=0;i<cube3d.sideCount;i++) {
        mvMatrix.makeIdentity();
        cube3d.parts[cube3d.sideOffset+i].transform(mvMatrix);
        let si=cube3d.getStickerIndexForPartIndex(cube3d.sideOffset+i,0);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                        attr.stickersFillColor[si], 
                        attr.stickersPhong[si]);
    }
    // draw edge stickers
    for (let i=0;i<cube3d.edgeCount;i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.edgeOffset+i].transform(mvMatrix);
        let si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,0);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                        attr.stickersFillColor[si], 
                        attr.stickersPhong[si]);
        si=cube3d.getStickerIndexForPartIndex(cube3d.edgeOffset+i,1);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, 
                        attr.stickersFillColor[si], 
                        attr.stickersPhong[si]);
    }
    // draw corner stickers
    for (let i=0;i<cube3d.cornerCount;i++) {
        mvMatrix.makeIdentity();
        this.cube3d.parts[cube3d.cornerOffset+i].transform(mvMatrix);
        let si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,1);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
        si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,0);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
        si=cube3d.getStickerIndexForPartIndex(cube3d.cornerOffset+i,2);
        this.drawObject(cube3d.stickerObjs[si], mvMatrix, attr.stickersFillColor[si], attr.stickersPhong[si],this.forceColorUpdate);
    }
  
    this.flushCanvas();
    this.forceColorUpdate=false;
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
    this.currentAngle=0;
    this.xRot=this.cube3d.attributes.xRot;
    this.yRot=this.cube3d.attributes.yRot;
    this.rotationMatrix.makeIdentity();
    this.smoothRotationFunction=null;
    this.moves = [];
    
    let self=this;
    let f=function() {
        // Cancel all other lenghty operations
        self.cube.cancel=true;
        
        // Wait until cube3d has finished twisting
        if (self.cube3d.isTwisting) {
          self.repaint(f);
          return;
        }
        // Reset cube
        self.cube.reset();
        
        self.clearUndoRedo();
        
        // Other lenghty operations are go now
        self.cube.cancel=false;
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
    let owner=new Object();
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
    let self=this;
    let owner=new Object();
    let f=function() {
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
  scramble(scrambleCount,animate) {
    if (scrambleCount==null) scrambleCount=16;
    if (animate==null) animate=true;
    
    let self=this;
    
    // => Clear undo/redo list
    this.clearUndoRedo();
    
      
    // Create random moves
    let parser=ScriptParser.newScriptParser();
    parser.layerCount=this.cube3d.cube.layerCount;
    let scrambleNodes=parser.createRandomScript(scrambleCount);
    this.moves = this.moves.concat(scrambleNodes);
    
    // Perform the scrambling moves
    if (! animate) {
      let f=function() {
          // Cancel all other lenghty operations
          self.cube.cancel=true;
        
          // Wait until cube3d has finished twisting
          if (self.cube3d.isTwisting) {
            self.repaint(f);
            return;
          }
          
          // Scramble the cube
          for (let i=0;i<scrambleNodes.length;i++) {
            scrambleNodes[i].applyTo(self.cube);
          }
          
          // Other lenghty operations are go now
          self.cube.cancel=false;
      };
      this.repaint(f);
      return;
    }
    
    let next=0; // next twist to be performed
    let owner=new Object();
    let f=function() {
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
  setAutorotate(newValue) {
    if (newValue != this.autorotate) {
      this.autorotate=newValue;
      if (newValue) {
        let self=this;
        let start=new Date().getTime();
        let anglePerSecond=20;
        let prev=start;
        let startAngle=this.currentAngle;
        this.autorotateFunction=function() {
            if (self.autorotate) self.repaint(self.autorotateFunction);
            let now=new Date().getTime();
            let elapsed=now-start;
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
  rotate(dx,dy) {
        let rm=new J3DIMatrix4();
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
    if (amount==null) amount=0.3;
    if (duration==null) duration=500;
    
        let self=this;
        let start=new Date().getTime();
        let f=function() {
            let now=new Date().getTime();
            let elapsed=now-start;
            let x=elapsed/duration;
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
  explode(amount,duration) {
    if (amount==null) amount=2;
    if (duration==null) duration=2000;
    
        let self=this;
        let start=new Date().getTime();
        let f=function() {
            let now=new Date().getTime();
            let elapsed=now-start;
            let x=elapsed/duration;
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
  
  stateChanged(event) {
    this.repaint();
  }
  
  
  getCubeAttributes() {
    return this.cube3d.attributes;
  }
  setCubeAttributes(attr) {
    this.cube3d.attributes=attr;
    this.forceColorUpdate=true;
    
    let gl=this.gl;  
    gl.clearColor(attr.backgroundColor[0]/255.0, attr.backgroundColor[1]/255.0, 
                  attr.backgroundColor[2]/255.0, attr.backgroundColor[3]/255.0);
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
    let pRaster=new J3DIVector3(event.clientX - rect.left, event.clientY - rect.top, 0);
    
    // point in camera coordinates
    let pCamera=new J3DIVector3((pRaster[0] - this.width/2)/this.width*2, (pRaster[1] - this.height/2)/-this.height*2, 0);
    
    // point in world coordinates
    let pWorld = new J3DIVector3(pCamera);
    pWorld.multVecMatrix(this.rasterToCameraMatrix);
  
    // Inverse model-world matrix
    let wmMatrix = new J3DIMatrix4(this.world.matrix);
    wmMatrix.multiply(this.cube3d.matrix);
    wmMatrix.invert();
    
    // point in model coordinates
    let pModel =  new J3DIVector3(pWorld);  
    pModel.multVecMatrix(wmMatrix);
    
    // camera ray in model coordinates
    let ray={point:new J3DIVector3(), dir:new J3DIVector3()};
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
    let a=cube3d.attributes;
    let p=this.parameters;
    
     let deprecatedFaceIndices = [2, 0, 3, 5, 4, 1]; // maps FRDBLU to RUFLDB
     
     // parse default colorMap
     // --------------
     let colorMap=parseColorMap("r=#ff4600,u=#ffd200,f=#003373,l=#8c000f,d=#f8f8f8,b=#00732f");

     // parse colorMap from parameter "colorTable"
     // this parameter is deprecated but still supported
     // note: in RubikPlayerApplet the colorTable is defined FRDBLU
     //       in VirtualRubikApplet the colorTable is defined RUFDLB
     //       we use the RubikPlayerApplet definition
     
     if (p.colortable != null) {
       module.log('.readParameters colortable:'+p.colortable);
       console.log('WARNING: the parameter "colorTable" is deprecated, use "colorList" instead.');
       let deprecatedColorMap=parseColorMap(p.colortable);
       
       for (let k in deprecatedColorMap) {
         if (0<=k&&k<deprecatedFaceIndices.length) {
           colorMap[deprecatedFaceIndices[k]] = deprecatedColorMap[k];
         }else{
           colorMap[k] = deprecatedColorMap[k];
         }
       }
     }
     
     // parse colorMap from parameter "colorList"
     if (p.colorlist != null) {
       module.log('.readParameters colorlist:'+p.colorlist);
       colorMap=parseColorMap(this.parameters.colorlist);
     }

     // parse default faceIndices
     // ---------------
     let faceIndices=[];
     for (let i=0;i<a.getFaceCount();i++) {
       faceIndices[i]=i;
     }

     // parse faceIndices from faces
     if (p.faces != null) {
       module.log('.readParameters faces:'+p.faces);
       console.log('WARNING: the parameter "faces" is deprecated, use "faceList" instead.');
       faceIndices = parseWordList(p.faces);
     }
     // parse faceIndices from faceList
     if (p.facelist != null) {
       module.log('.readParameters facelist:'+p.facelist);
       faceIndices = parseWordList(p.facelist);
     }

     // apply face indices
     for (let i = 0; i < a.getFaceCount(); i++) {
      let color = colorMap[faceIndices[i]];
      if (color != null) {
          let face = i;
          let offset = a.getStickerOffset(face);
          for (let j = 0; j < a.getStickerCount(face); j++) {
              a.stickersFillColor[offset + j]=color;
          }
      }
     }
     
     // parse alpha and beta
     // --------------
     if (p.alpha != null) {
       module.log('.readParameters alpha:'+p.alpha);
       cube3d.attributes.xRot = parseFloat(p.alpha);
     }
     if (p.beta != null) {
       module.log('.readParameters beta:'+p.beta);
       cube3d.attributes.yRot = -parseFloat(p.beta);
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
    
    this.mouseDownX=undefined;
    this.mouseDownY=undefined;
    this.mousePrevX=undefined;
    this.mousePrevY=undefined;
    this.mousePrevTimestamp=undefined;
  }
}

/**
 * Touch handler for the canvas object.
 * Forwards everything to the mouse handler.
 */
Cube3DHandler.prototype.onTouchStart = function(event) {
  if (event.touches.length == 1) {
    event.preventDefault();
    event.clientX=event.touches[0].clientX;
    event.clientY=event.touches[0].clientY;
    this.onMouseDown(event);
  } else {
    this.isMouseDrag = false;
  }
}
Cube3DHandler.prototype.onTouchEnd = function(event) {
  event.clientX=this.mousePrevX;
  event.clientY=this.mousePrevY;
  this.onMouseUp(event);
}
Cube3DHandler.prototype.onTouchMove = function(event) {
  event.clientX=event.touches[0].clientX;
  event.clientY=event.touches[0].clientY;
  this.onMouseMove(event);
}
/**
 * Mouse handler for the canvas object.
 */
Cube3DHandler.prototype.onMouseDown = function(event) {
  this.mouseDownX=event.clientX;
  this.mouseDownY=event.clientY;
  this.mousePrevX=event.clientX;
  this.mousePrevY=event.clientY;
  this.mousePrevTimeStamp=event.timeStamp;
  this.isMouseDrag=true;
  let isect=this.canvas.mouseIntersectionTest(event);
  this.mouseDownIsect=isect;
  this.isCubeSwipe=isect!=null;
}
Cube3DHandler.prototype.onMouseMove = function(event) {
  if (this.isMouseDrag) {
    let x = event.clientX;
    let y = event.clientY;
  
    let dx2d = (this.mousePrevY - y);
    let dy2d = (this.mousePrevX - x);
    let dx = dx2d * (360 / this.canvas.width);
    let dy = dy2d * (360 / this.canvas.height);
    let mouseTimestep=(event.timeStamp-this.mousePrevTimeStamp)/1000;

    if (this.isCubeSwipe) {
      let cube3d = this.canvas.cube3d;
      let sqrDist=dx2d*dx2d+dy2d*dy2d;
      if (!cube3d.isTwisting && sqrDist>16) { // min swipe-distance: 4 pixels
        let isect=this.canvas.mouseIntersectionTest(event);
        if (isect != null && isect.face==this.mouseDownIsect.face) {
          
          let u=Math.floor(isect.uv[0]*cube3d.cube.layerCount);
          let v=Math.floor(isect.uv[1]*cube3d.cube.layerCount);
  
          let du=isect.uv[0]-this.mouseDownIsect.uv[0];
          let dv=isect.uv[1]-this.mouseDownIsect.uv[1];
          
          
          let swipeAngle=Math.atan2(dv,du)*180/Math.PI+180;
          let swipeDirection=Math.round((swipeAngle)/90)%4;
  
          let face=isect.face;
          let axis=cube3d.boxSwipeToAxisMap[face][swipeDirection];
          let layerMask=cube3d.boxSwipeToLayerMap[face][u][v][swipeDirection];
          let angle=cube3d.boxSwipeToAngleMap[face][swipeDirection];
          //this.log('virtualrubik face,u,v,s:'+face+' '+u+' '+v+' '+swipeDirection);
          //this.log('virtualrubik ax,l,an   :'+axis+' '+layerMask+' '+angle);
          if (event.shiftKey || event.metaKey) angle=2*angle;
          let move=ScriptParser.newTwistNode(axis,layerMask,angle);
          this.canvas.pushMove(move);
          move.applyTo(this.canvas.cube);
          if (this.canvas.cube.isSolved()) {
            this.canvas.wobble();
          }
          
          this.isCubeSwipe=false;
          this.isMouseDrag=false;
        }
      }
    } else {
      let rm=new J3DIMatrix4();
      rm.rotate(dy, 0, 1, 0);
      rm.rotate(dx, 1, 0, 0);
      let v = rm.loghat().divide(Math.max(0.1,mouseTimestep));
      rm.multiply(this.canvas.rotationMatrix); // FIXME - Numerically unstable
      this.canvas.rotationMatrix.load(rm);
      let self=this;
      let start = new Date().getTime();
      let damping=1;
      let f = function () {
          if (self.canvas.smoothRotationFunction != f) return;
          
          let now = new Date().getTime();
          let h = (now - start)/1000;

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
            
            let vv=new J3DIVector3(v);
            if (h*damping<1) {
              v.subtract(vv.multiply(h*damping));
            } else {
              v.load(0,0,0);
            }
            
            self.canvas.repaint(f);
          }
          
          start = now;
        };
        this.canvas.smoothRotationFunction = f;
        this.canvas.repaint(f);
      
    }
  
    this.mousePrevX=event.clientX;
    this.mousePrevY=event.clientY;
    this.mousePrevTimeStamp=event.timeStamp;
  }
}
Cube3DHandler.prototype.onMouseOut = function(event) {
  this.isMouseDrag=false;
}
Cube3DHandler.prototype.onMouseUp = function(event) {
  this.isMouseDrag=false;
  this.isCubeSwipe=false;
  
    
  if (this.mouseDownX!=event.clientX || this.mouseDownY!=event.clientY) {
    // the mouse has been moved between mouse down and mouse up
    return;
  }
  
  let cube3d=this.canvas.cube3d;
  if (cube3d!=null&&cube3d.isTwisting) {
    return;
  }
  
  let isect=this.canvas.mouseIntersectionTest(event);
  
  if (isect!=null) {
    if (event.altKey || event.ctrlKey) isect.angle*=-1;
    if (event.shiftKey || event.metaKey) isect.angle*=2;
          let move=ScriptParser.newTwistNode(isect.axis,isect.layerMask,isect.angle);
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


// ------------------
// MODULE API    
// ------------------
return {
  AbstractPlayerApplet : AbstractPlayerApplet,
  Cube3DHandler : Cube3DHandler
};
});
/*
 * @(#)AbstractPocketCubeCube3D.js  1.0  2014-01-17
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("AbstractPocketCubeCube3D", ["Cube3D","PocketCube","CubeAttributes","SplineInterpolator","J3DI","Node3D"], 
function(Cube3D,PocketCube,CubeAttributes,SplineInterpolator,J3DI,Node3D) { 


/** Constructor
 * Creates the 3D geometry of a Rubik's Cube.
 *  Subclasses must call initAbstractPocketCubeCube3D(). 
 */
class AbstractPocketCubeCube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super();
	
    this.cornerCount=8;
    this.edgeCount=0;
    this.sideCount=0;
    this.centerCount=0;
    this.partCount=8+0+0+0;
    this.cornerOffset=0;
    this.edgeOffset=8;
    this.sideOffset=8;
    this.centerOffset=8;
    this.stickerCount=4*6;
  
    this.cube=PocketCube.newPocketCube();
    this.cube.addCubeListener(this);
    this.attributes=this.createAttributes();
    
    this.partToStickerMap=new Array(this.partCount);  
    for (var i=0;i<this.partCount;i++) {
      this.parts[i]=new Node3D.Node3D();
      this.partOrientations[i]=new Node3D.Node3D();
      this.partExplosions[i]=new Node3D.Node3D();
      this.partLocations[i]=new Node3D.Node3D();
      
      this.partOrientations[i].add(this.parts[i]);
      this.partExplosions[i].add(this.partOrientations[i]);
      this.partLocations[i].add(this.partExplosions[i]);
      this.add(this.partLocations[i]);
      
      this.identityPartLocations[i]=new J3DIMatrix4();
      this.partToStickerMap[i]=new Array(3);
    }
  
    for (var i=0;i<this.stickerCount;i++) {
      this.partToStickerMap[this.stickerToPartMap[i]][this.stickerToFaceMap[i]]=i; 
      
      this.stickers[i]=new Node3D.Node3D();
      this.stickerOrientations[i]=new Node3D.Node3D();
      this.stickerExplosions[i]=new Node3D.Node3D();
      this.stickerLocations[i]=new Node3D.Node3D();
      this.stickerTranslations[i]=new Node3D.Node3D();
      
      this.stickerOrientations[i].add(this.stickers[i]);
      this.stickerExplosions[i].add(this.stickerOrientations[i]);
      this.stickerLocations[i].add(this.stickerExplosions[i]);
      this.stickerTranslations[i].add(this.stickerLocations[i]);
      this.add(this.stickerTranslations[i]);
      
      this.developedStickers[i]=new Node3D.Node3D();
      
      this.currentStickerTransforms[i]=new Node3D.Node3D();
      this.add(this.currentStickerTransforms[i]);
      //this.currentDevelopedMatrix[i]=new J3DIMatrix4();
      this.identityStickerLocations[i]=new J3DIMatrix4();
    }
    
    this.partSize=2.0;
    
    /*
     * Corners
     *             +---+---+---+
     *          ulb|4.0|   |2.0|ubr
     *             +---+   +---+
     *             |     1     |
     *             +---+   +---+
     *          ufl|6.0|   |0.0|urf
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
     * +---+   +---+---+   +---+---+   +---+---+   +---+
     * |     3     |     2     |     0     |     5     |
     * +---+   +---+---+   +---+---+   +---+---+   +---+
     * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *          dlf|7.0|   |1.0|dfr
     *             +---+   +---+
     *             |     4     |
     *             +---+   +---+
     *          dbl|5.0|   |3.0|drb
     *             +---+---+---+
     */
     var cornerOffset=this.cornerOffset;
       
    // Move all corner parts to up right front (= position of corner[0]). 
    // nothing to do
    
    // Rotate the corner parts into place
      
    // 0:urf
    //--no transformation---
    // 1:dfr
    this.identityPartLocations[cornerOffset + 1].rotate(180,  0, 0, 1);
    this.identityPartLocations[cornerOffset + 1].rotate( 90,  0, 1, 0);
    // 2:ubr
    this.identityPartLocations[cornerOffset + 2].rotate(270,   0, 1, 0);
    // 3:drb
    this.identityPartLocations[cornerOffset + 3].rotate(180,  0, 0, 1);
    this.identityPartLocations[cornerOffset + 3].rotate(180,  0, 1, 0);
    // 4:ulb
    this.identityPartLocations[cornerOffset + 4].rotate(180,  0, 1, 0);
    // 5:dbl
    this.identityPartLocations[cornerOffset + 5].rotate(180,  1, 0, 0);
    this.identityPartLocations[cornerOffset + 5].rotate( 90,  0, 1, 0);
    // 6:ufl
    this.identityPartLocations[cornerOffset + 6].rotate( 90,  0, 1, 0);
    // 7:dlf
    this.identityPartLocations[cornerOffset + 7].rotate(180,  0, 0, 1);
  
    // ----------------------------         
    // Reset all rotations
    for (var i=0;i<this.partCount;i++) {
      this.partLocations[i].matrix.load(this.identityPartLocations[i]);
    }
  }
  
  loadGeometry() {
    // ----------------------------         
    // Load geometry
    var self = this;
    var fRepaint = function() {self.repaint();};
    
    var modelUrl=this.getModelUrl();
  
    // parts
    this.centerObj = J3DI.loadObj(null, modelUrl+"center.obj",fRepaint);
    this.cornerObj = J3DI.loadObj(null, modelUrl+"corner.obj",fRepaint);
    
    // stickers
    this.stickerObjs = new Array(this.stickerCount);
    for (var i=0; i < this.stickerObjs.length; i++) {
      this.stickerObjs[i] = J3DI.newJ3DIObj();
    }
    this.corner_rObj = J3DI.loadObj(null, modelUrl+"corner_r.obj",function() {self.initAbstractPocketCubeCube3D_corner_r();self.repaint();});
    this.corner_uObj = J3DI.loadObj(null, modelUrl+"corner_u.obj",function() {self.initAbstractPocketCubeCube3D_corner_u();self.repaint();});
    this.corner_fObj = J3DI.loadObj(null, modelUrl+"corner_f.obj",function() {self.initAbstractPocketCubeCube3D_corner_f();self.repaint();});
  }
}

AbstractPocketCubeCube3D.prototype.validateAttributes=function() {
    if (!this.isAttributesValid) {
        this.isAttributesValid = true;

        for (var i=0; i< this.stickerObjs.length; i++) {
          this.stickerObjs[i].hasTexture=this.attributes.stickersImageURL!=null;
        }
    }
}


AbstractPocketCubeCube3D.prototype.initAbstractPocketCubeCube3D_corner_r=function() {
  var s = this.corner_rObj;
  var s180 = new J3DI.J3DIObj();
  s180.setTo(s);
  s180.rotateTexture(180);
  
  this.stickerObjs[ 0] = s.clone();
  this.stickerObjs[ 3] = s180.clone();
  this.stickerObjs[ 8] = s.clone();
  this.stickerObjs[11] = s180.clone();
  this.stickerObjs[12] = s.clone();
  this.stickerObjs[15] = s180.clone();
  this.stickerObjs[20] = s.clone();
  this.stickerObjs[23] = s180.clone();
  
  this.initAbstractPocketCubeCube3D_textureScales();
}
AbstractPocketCubeCube3D.prototype.initAbstractPocketCubeCube3D_corner_f=function() {
  var s = this.corner_fObj;
  var s180 = new J3DI.J3DIObj();
  s180.setTo(s);
  s180.rotateTexture(180);

  this.stickerObjs[ 1] = s.clone();
  this.stickerObjs[ 2] = s180.clone();
  this.stickerObjs[ 9] = s.clone();
  this.stickerObjs[10] = s180.clone();
  this.stickerObjs[13] = s.clone();
  this.stickerObjs[14] = s180.clone();
  this.stickerObjs[21] = s.clone();
  this.stickerObjs[22] = s180.clone();
  
  this.initAbstractPocketCubeCube3D_textureScales();
}
AbstractPocketCubeCube3D.prototype.initAbstractPocketCubeCube3D_corner_u=function() {
  var s = this.corner_uObj;
  var s90 = new J3DI.J3DIObj();
  s90.setTo(s);
  s90.rotateTexture(90);
  var s180 = new J3DI.J3DIObj();
  s180.setTo(s);
  s180.rotateTexture(180);
  var s270 = new J3DI.J3DIObj();
  s270.setTo(s);
  s270.rotateTexture(270);

  this.stickerObjs[ 4] = s180.clone();
  this.stickerObjs[ 5] = s90.clone();
  this.stickerObjs[ 6] = s270.clone();
  this.stickerObjs[ 7] = s.clone();
  this.stickerObjs[16] = s180.clone();
  this.stickerObjs[17] = s90.clone();
  this.stickerObjs[18] = s270.clone();
  this.stickerObjs[19] = s.clone();
  
  this.initAbstractPocketCubeCube3D_textureScales();
}
AbstractPocketCubeCube3D.prototype.initAbstractPocketCubeCube3D_textureScales=function() {
  var attr=this.attributes;
  
  for (var i=0;i<this.stickerObjs.length; i++) {
    if (! this.stickerObjs[i].loaded) continue;
    
    if (this.stickerObjs[i].isTextureScaled) continue;
    if (i*2+1<this.stickerOffsets.length) {
      this.stickerObjs[i].textureOffsetX=this.stickerOffsets[i*2];
      this.stickerObjs[i].textureOffsetY=this.stickerOffsets[i*2+1];
    }
    this.stickerObjs[i].textureScale=84/512;
    this.stickerObjs[i].isTextureScaled=true;
  }
  
  this.isAttributesValid = false;
}

/** Maps stickers to cube parts.
 * <p>
 * Sticker indices:
 * <pre>
 *         +---+---+
 *      ulb|1,0|1,1|ubr
 *         +--- ---+ 
 *  ulb ufl|1,2|1,3|urf ubr ubr ubl
 * +---+---+---+---+---+---+---+---+
 * |3,0|3,1|2,0|2,1|0,0|0,1|5,0|5,1|
 * +--- ---+--- ---+--- ---+--- ---+
 * |3,2|3,3|2,2|2,3|0,2|0,3|5,2|5,3|
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|4,0|4,1|dfr drb drb dbl
 *         +--- ---+
 *      dbl|4,2|4,3|drb
 *         +---+---+
 * </pre>
 * Sticker indices absolute values:
 * <pre>
 *         +---+---+
 *      ulb| 4 | 5 |ubr
 *         +--- ---+ 
 *  ulb ufl| 6 | 7 |urf ubr ubr ubl
 * +---+---+---+---+---+---+---+---+
 * |12 |13 | 8 | 9 | 0 | 1 |20 |21 |
 * +--- ---+--- ---+--- ---+--- ---+
 * |14 |15 |10 |11 | 2 | 3 |22 |23 |
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|16 |17 |dfr drb drb dbl
 *         +--- ---+
 *      dbl|18 |19 |drb
 *         +---+---+
 * </pre>
 * <p>
 * Part indices:
 * <pre>
 *         +---+---+
 *      ulb|4.0|2.0|ubr
 *         +--- ---+ 
 *  ulb ufl|6.0|0.0|urf ubr ubr ubl 
 * +---+---+---+---+---+---+---+---+
 * |4.1|6.2|6.1|0.2|0.1|2.2|2.1|4.2|
 * +--- ---+--- ---+--- ---+--- ---+
 * |5.2|7.1|7.2|1.1|1.2|3.1|3.2|5.1|
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|7.0|1.0|dfr drb drb dbl
 *         +--- ---+
 *      dbl|5.0|3.0|drb
 *         +---+---+
 * </pre>
 */
AbstractPocketCubeCube3D.prototype.stickerToPartMap = [
        0, 2,  1, 3, // right
        4, 2,  6, 0, // up
        6, 0,  7, 1, // front
        4, 6,  5, 7, // left
        7, 1,  5, 3, // down
        2, 4,  3, 5  // back
];
AbstractPocketCubeCube3D.prototype.getPartIndexForStickerIndex=function(stickerIndex) {
    return stickerToPartMap[stickerIndex];
}

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part. 
 * This map is filled in by the init method!!
 */
AbstractPocketCubeCube3D.prototype.partToStickerMap=null;
AbstractPocketCubeCube3D.prototype.getStickerIndexForPartIndex=function(partIndex, orientationIndex) {
  return this.partToStickerMap[partIndex][orientationIndex];
}

/**
 * Gets the face of the part which holds the indicated sticker.
 * The sticker index is interpreted according to this scheme:
 * <pre>
 *         +---+---+
 *      ulb|1,0|1,1|ubr
 *         +--- ---+ 
 *  ulb ufl|1,2|1,3|urf ubr ubr ubl
 * +---+---+---+---+---+---+---+---+
 * |3,0|3,1|2,0|2,1|0,0|0,1|5,0|5,1|
 * +--- ---+--- ---+--- ---+--- ---+
 * |3,2|3,3|2,2|2,3|0,2|0,3|5,2|5,3|
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|4,0|4,1|dfr drb drb dbl
 *         +--- ---+
 *      dbl|4,2|4,3|drb
 *         +---+---+
 * </pre>
 * The faces (or orientation of the parts) according to this scheme:
 * <pre>
 *         +---+---+
 *      ulb|4.0|2.0|ubr
 *         +--- ---+ 
 *  ulb ufl|6.0|0.0|urf ubr ubr ubl 
 * +---+---+---+---+---+---+---+---+
 * |4.1|6.2|6.1|0.2|0.1|2.2|2.1|4.2|
 * +--- ---+--- ---+--- ---+--- ---+
 * |5.2|7.1|7.2|1.1|1.2|3.1|3.2|5.1|
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|7.0|1.0|dfr drb drb dbl
 *         +--- ---+
 *      dbl|5.0|3.0|drb
 *         +---+---+
 * </pre>
 */
AbstractPocketCubeCube3D.prototype.stickerToFaceMap = [
        1, 2,  2, 1, // right
        0, 0,  0, 0, // up
        1, 2,  2, 1, // front
        1, 2,  2, 1, // left
        0, 0,  0, 0, // down
        1, 2,  2, 1 // back
];

/** Default cube attributes. */
AbstractPocketCubeCube3D.prototype.createAttributes=function() {
  var a=CubeAttributes.newCubeAttributes(this.partCount, 6*4, [4,4,4,4,4,4]);
  var partsPhong=[0.5,0.6,0.4,16.0];//shiny plastic [ambient, diffuse, specular, shininess]
  for (var i=0;i<this.partCount;i++) {
    a.partsFillColor[i]=[40,40,40,255];
    a.partsPhong[i]=partsPhong;
  }
  a.partsFillColor[this.centerOffset]=[240,240,240,255];
  
  var faceColors=[
    [255,210,  0,255],// right: yellow
    [  0, 51,115,255],// up   : blue
    [140,  0, 15,255],// front: red
    [248,248,248,255],// left : white
    [  0,115, 47,255],// down : green
    [255, 70,  0,255] // back : orange
  ];
  
  var stickersPhong=[0.8,0.2,0.1,8.0];//shiny paper [ambient, diffuse, specular, shininess]
 
  for (var i=0;i<6;i++) {
    for (var j=0;j<4;j++) {
      a.stickersFillColor[i*4+j]=faceColors[i];
      a.stickersPhong[i*4+j]=stickersPhong;
    }
  }
  
  return a;
}

AbstractPocketCubeCube3D.prototype.updateExplosionFactor=function(factor) {
  if (factor == null) {
      factor=this.attributes.explosionFactor;
  }
  var explosionShift=this.partSize*1.5;
  var baseShift = explosionShift * factor;
  var shift = 0;
  var a = this.attributes;
  for (var i = 0; i < this.cornerCount; i++) {
    var index = this.cornerOffset + i;
    shift = baseShift+a.partExplosion[index];
    this.partExplosions[index].matrix.makeIdentity();
    this.partExplosions[index].matrix.translate(shift, shift, -shift);//ruf
  }
  this.fireStateChanged();
}


AbstractPocketCubeCube3D.prototype.validateTwist=function(partIndices, locations, orientations, length, axis, angle, alpha) {
    var rotation = this.updateTwistRotation;
    rotation.makeIdentity();
    var rad = (90 * angle * (1 - alpha));
    switch (axis) {
        case 0:
            rotation.rotate(rad, -1, 0, 0);
            break;
        case 1:
            rotation.rotate(rad,  0,-1, 0);
            break;
        case 2:
            rotation.rotate(rad,  0, 0, 1);
            break;
    }

    var orientationMatrix = this.updateTwistOrientation;
    for (var i = 0; i < length; i++) {
        orientationMatrix.makeIdentity();
        if (partIndices[i] < this.edgeOffset) { //=> part is a corner
              // Base location of a corner part is urf. (= corner part 0)
            switch (orientations[i]) {
                case 0:
                    break;
                case 1:
                    orientationMatrix.rotate(90,  0, 0, 1);
                    orientationMatrix.rotate(90, -1, 0, 0);
                    break;
                case 2:
                    orientationMatrix.rotate(90,  0, 0,-1);
                    orientationMatrix.rotate(90,  0, 1, 0);
                    break;
            }
        }
        this.partOrientations[partIndices[i]].matrix.load(orientationMatrix);
        var transform = this.partLocations[partIndices[i]].matrix;
        transform.load(rotation);
        transform.multiply(this.identityPartLocations[locations[i]]);
    }
}

AbstractPocketCubeCube3D.prototype.cubeTwisted=function(evt) {
  if (this.repainter==null) {
      this.updateCube();
      return;
  }
  
  var layerMask = evt.layerMask;
  var axis = evt.axis;
  var angle = evt.angle;
  var model = this.cube;

  var partIndices = new Array(27);
  var locations =  new Array(27);
  var orientations =  new Array(27);
  var count = 0;

  var affectedParts = evt.getAffectedLocations();
  count = affectedParts.length;
  locations=affectedParts.slice(0,count);
  for (var i = 0; i < count; i++) {
      partIndices[i] = model.getPartAt(locations[i]);
      orientations[i] = model.getPartOrientation(partIndices[i]);
  }

  var finalCount=count;
  var self=this;
  var interpolator = SplineInterpolator.newSplineInterpolator(0, 0, 1, 1);
  var start=new Date().getTime();
  var duration=this.attributes.twistDuration*Math.abs(angle);
  this.isTwisting=true;
  var f=function() {
    var now=new Date().getTime();
    var elapsed=now-start;
    var value=elapsed/duration;
    if (value<1) {
      self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, interpolator.getFraction(value));
      self.repainter.repaint(f);
    } else {
      self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, 1.0);
      self.isTwisting=false;
    }
  };
  this.repainter.repaint(f);
}

AbstractPocketCubeCube3D.prototype.boxClickToAxisMap = [
  [[ 0, 0],[ 0, 0]],// right
  [[ 1, 1],[ 1, 1]],// down
  [[ 2, 2],[ 2, 2]],// front
  [[ 0, 0],[ 0, 0]],// left
  [[ 1, 1],[ 1, 1]],// up
  [[ 2, 2],[ 2, 2]],// back
];
AbstractPocketCubeCube3D.prototype.boxClickToAngleMap = [
  [[-1,-1],[-1,-1]],
  [[-1,-1],[-1,-1]],
  [[ 1, 1],[ 1, 1]],
  [[ 1, 1],[ 1, 1]],
  [[ 1, 1],[ 1, 1]],
  [[-1,-1],[-1,-1]],
];
AbstractPocketCubeCube3D.prototype.boxClickToLayerMap = [
  [[ 1, 1],[ 1, 1]],
  [[ 1, 1],[ 1, 1]],
  [[ 2, 2],[ 2, 2]],
  [[ 2, 2],[ 2, 2]],
  [[ 2, 2],[ 2, 2]],
  [[ 1, 1],[ 1, 1]],
];
AbstractPocketCubeCube3D.prototype.boxSwipeToAxisMap = [
  [ 1, 2, 1, 2],// left
  [ 2, 0, 2, 0],// down
  [ 1, 0, 1, 0],// front
  [ 1, 2, 1, 2],// right
  [ 2, 0, 2, 0],// up
  [ 1, 0, 1, 0],// back
];
AbstractPocketCubeCube3D.prototype.boxSwipeToAngleMap = [
  [-1,-1, 1, 1],// left
  [ 1, 1,-1,-1],// down
  [ 1,-1,-1, 1],// front
  [ 1, 1,-1,-1],// right
  [-1,-1, 1, 1],// up
  [-1, 1, 1,-1],// back
];
AbstractPocketCubeCube3D.prototype.boxSwipeToLayerMap = [
  [[[ 1, 2, 1, 2], [ 2, 2, 2, 2]],[[ 1, 1, 1, 1], [ 2, 1, 2, 1]]],// left
  [[[ 2, 1, 2, 1], [ 1, 1, 1, 1]],[[ 2, 2, 2, 2], [ 1, 2, 1, 2]]],// down
  [[[ 1, 1, 1, 1], [ 2, 1, 2, 1]],[[ 1, 2, 1, 2], [ 2, 2, 2, 2]]],// front
  [[[ 1, 2, 1, 2], [ 2, 2, 2, 2]],[[ 1, 1, 1, 1], [ 2, 1, 2, 1]]],// right
  [[[ 2, 1, 2, 1], [ 1, 1, 1, 1]],[[ 2, 2, 2, 2], [ 1, 2, 1, 2]]],// up
  [[[ 1, 1, 1, 1], [ 2, 1, 2, 1]],[[ 1, 2, 1, 2], [ 2, 2, 2, 2]]],// back
];
/**
 * The following properties may have different values depending on
 * the 3D model being used.
 * <pre>
 *   0 1 2 3 4 5
 *      +---+ 
 * 0    | U |
 * 1    |   |
 *  +---+---+---+
 * 2| L | F | R |
 * 3|   |   |   |
 *  +---+---+---+
 * 4    | D | B |
 * 5    |   |   |
 *      +---+---+
 * </pre>
 */
AbstractPocketCubeCube3D.prototype.stickerOffsets=[
  4,2, 5,2,//right
  4,3, 5,3,
  
  2,0, 3,0,//up
  2,1, 3,1,
  
  2,2, 3,2,//front
  2,3, 3,3,
  
  0,2, 1,2,//left
  0,3, 1,3,
  
  2,4, 3,4,//down
  2,5, 3,5,
  
  4,4, 5,4,//back
  4,5, 5,5
];


// ------------------
// MODULE API    
// ------------------
return {
  AbstractPocketCubeCube3D : AbstractPocketCubeCube3D
};
});
/*
 * @(#)AbstractRubiksCubeCube3D.js  1.0.2  2014-01-17
 *
 * Copyright (c) 2011-2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("AbstractRubiksCubeCube3D", ["Cube3D","RubiksCube","CubeAttributes","SplineInterpolator","J3DI","Node3D"], 
function(Cube3D,RubiksCube,CubeAttributes,SplineInterpolator,J3DI,Node3D) { 

/** Constructor
 * Creates the 3D geometry of a Rubik's Cube.
 *  Subclasses must call initAbstractRubiksCubeCube3D(). 
 */
class AbstractRubiksCubeCube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super();
    this.cornerCount=8;
    this.edgeCount=12;
    this.sideCount=6;
    this.centerCount=1;
    this.partCount=8+12+6+1;
    this.cornerOffset=0;
    this.edgeOffset=8;
    this.sideOffset=8+12;
    this.centerOffset=8+12+6;
    this.stickerCount=9*6;
  
    this.cube=new RubiksCube.RubiksCube();
    this.cube.addCubeListener(this);
    this.attributes=this.createAttributes();
    
    this.partToStickerMap=new Array(this.partCount);  
    for (var i=0;i<this.partCount;i++) {
      this.parts[i]=new Node3D.Node3D();
      this.partOrientations[i]=new Node3D.Node3D();
      this.partExplosions[i]=new Node3D.Node3D();
      this.partLocations[i]=new Node3D.Node3D();
      
      this.partOrientations[i].add(this.parts[i]);
      this.partExplosions[i].add(this.partOrientations[i]);
      this.partLocations[i].add(this.partExplosions[i]);
      this.add(this.partLocations[i]);
      
      this.identityPartLocations[i]=new J3DIMatrix4();
      this.partToStickerMap[i]=new Array(3);
    }
  
    for (var i=0;i<this.stickerCount;i++) {
      this.partToStickerMap[this.stickerToPartMap[i]][this.stickerToFaceMap[i]]=i;  
  
      this.stickers[i]=new Node3D.Node3D();
      this.stickerOrientations[i]=new Node3D.Node3D();
      this.stickerExplosions[i]=new Node3D.Node3D();
      this.stickerLocations[i]=new Node3D.Node3D();
      this.stickerTranslations[i]=new Node3D.Node3D();
      
      this.stickerOrientations[i].add(this.stickers[i]);
      this.stickerExplosions[i].add(this.stickerOrientations[i]);
      this.stickerLocations[i].add(this.stickerExplosions[i]);
      this.stickerTranslations[i].add(this.stickerLocations[i]);
      this.add(this.stickerTranslations[i]);
      
      this.developedStickers[i]=new Node3D.Node3D();
      
      this.currentStickerTransforms[i]=new Node3D.Node3D();
      this.add(this.currentStickerTransforms[i]);
      //this.currentDevelopedMatrix[i]=new J3DIMatrix4();
      this.identityStickerLocations[i]=new J3DIMatrix4();
    }
    this.partSize=(partSize===undefined)?2.0:partSize;
    
    /* Corners
     *             +---+---+---+
     *          ulb|4.0|   |2.0|ubr
     *             +---+   +---+
     *             |     1     |
     *             +---+   +---+
     *          ufl|6.0|   |0.0|urf
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
     * +---+   +---+---+   +---+---+   +---+---+   +---+
     * |     3     |     2     |     0     |     5     |
     * +---+   +---+---+   +---+---+   +---+---+   +---+
     * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *          dlf|7.0|   |1.0|dfr
     *             +---+   +---+
     *             |     4     |
     *             +---+   +---+
     *          dbl|5.0|   |3.0|drb
     *             +---+---+---+
     */
     var cornerOffset=this.cornerOffset;
     var ps=this.partSize;
           
    // Move all corner parts to up right front (= position of corner[0]). 
    // nothing to do
    
    // Rotate the corner parts into place
          
    // 0:urf
    //--no transformation---
    // 1:dfr
    this.identityPartLocations[cornerOffset + 1].rotate(180,  0, 0, 1);
    this.identityPartLocations[cornerOffset + 1].rotate( 90,  0, 1, 0);
    // 2:ubr
    this.identityPartLocations[cornerOffset + 2].rotate(270,   0, 1, 0);
    // 3:drb
    this.identityPartLocations[cornerOffset + 3].rotate(180,  0, 0, 1);
    this.identityPartLocations[cornerOffset + 3].rotate(180,  0, 1, 0);
    // 4:ulb
    this.identityPartLocations[cornerOffset + 4].rotate(180,  0, 1, 0);
    // 5:dbl
    this.identityPartLocations[cornerOffset + 5].rotate(180,  1, 0, 0);
    this.identityPartLocations[cornerOffset + 5].rotate( 90,  0, 1, 0);
    // 6:ufl
    this.identityPartLocations[cornerOffset + 6].rotate( 90,  0, 1, 0);
    // 7:dlf
    this.identityPartLocations[cornerOffset + 7].rotate(180,  0, 0, 1);
          
    // Move all corner stickers to 0.0 (to up at the urf corner)
    // 0:urf
    //this.stickers[17].matrix.makeIdentity();
    this.stickers[0].matrix.rotate(-90, 0, 1 ,0);
    this.stickers[0].matrix.rotate( 90, 0, 0 ,1);
    this.stickers[20].matrix.rotate( 90, 0, 1, 0);
    this.stickers[20].matrix.rotate( 90, 1, 0, 0);
    // 1:dfr
    //this.stickers[38].matrix.makeIdentity();
    this.stickers[26].matrix.rotate(-90, 0, 1 ,0);
    this.stickers[26].matrix.rotate( 90, 0, 0 ,1);
    this.stickers[ 6].matrix.rotate( 90, 0, 1, 0);
    this.stickers[ 6].matrix.rotate( 90, 1, 0, 0);
    // 2:ubr
    //this.stickers[11].matrix.makeIdentity();
    this.stickers[45].matrix.rotate(-90, 0, 1 ,0);
    this.stickers[45].matrix.rotate( 90, 0, 0 ,1);
    this.stickers[2].matrix.rotate( 90, 0, 1, 0);
    this.stickers[2].matrix.rotate( 90, 1, 0, 0);
    // 3:drb
    //this.stickers[44].matrix.makeIdentity();
    this.stickers[8].matrix.rotate(-90, 0, 1 ,0);
    this.stickers[8].matrix.rotate( 90, 0, 0 ,1);
    this.stickers[51].matrix.rotate( 90, 0, 1, 0);
    this.stickers[51].matrix.rotate( 90, 1, 0, 0);
    // 4:ulb
    //this.stickers[9].matrix.makeIdentity();
    this.stickers[27].matrix.rotate(-90, 0, 1 ,0);
    this.stickers[27].matrix.rotate( 90, 0, 0 ,1);
    this.stickers[47].matrix.rotate( 90, 0, 1, 0);
    this.stickers[47].matrix.rotate( 90, 1, 0, 0);
    // 5:dbl
    //this.stickers[42].matrix.makeIdentity();
    this.stickers[53].matrix.rotate(-90, 0, 1 ,0);
    this.stickers[53].matrix.rotate( 90, 0, 0 ,1);
    this.stickers[33].matrix.rotate( 90, 0, 1, 0);
    this.stickers[33].matrix.rotate( 90, 1, 0, 0);
    // 6:ufl
    //this.stickers[15].matrix.makeIdentity();
    this.stickers[18].matrix.rotate(-90, 0, 1 ,0);
    this.stickers[18].matrix.rotate( 90, 0, 0 ,1);
    this.stickers[29].matrix.rotate( 90, 0, 1, 0);
    this.stickers[29].matrix.rotate( 90, 1, 0, 0);
    // 7:dlf
    //this.stickers[36].matrix.makeIdentity();
    this.stickers[35].matrix.rotate(-90, 0, 1 ,0);
    this.stickers[35].matrix.rotate( 90, 0, 0 ,1);
    this.stickers[24].matrix.rotate( 90, 0, 1, 0);
    this.stickers[24].matrix.rotate( 90, 1, 0, 0);
    
    
    // Move the corner stickers into place
    // 0:urf
    this.identityStickerLocations[17].translate(0, ps*3, 0); 
    this.identityStickerLocations[17].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[ 0].translate(ps*3, 0, 0); 
    this.identityStickerLocations[ 0].rotate(180, 0, 0, 1);
    this.identityStickerLocations[ 0].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[20].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[20].rotate(-90, 0, 1, 0);
    
    // 1:dfr
    this.identityStickerLocations[38].translate(0, ps*-3, 0); 
    this.identityStickerLocations[38].rotate( 90, 0, 0, 1);
    this.identityStickerLocations[38].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[26].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[ 6].translate(ps*3, 0, 0); 
    this.identityStickerLocations[ 6].rotate(-90, 0, 0, 1);
    this.identityStickerLocations[ 6].rotate(-90, 1, 0, 0);
  
    // 2:ubr
    this.identityStickerLocations[11].translate(0, ps*3, 0); 
    this.identityStickerLocations[11].rotate( 90,  0, 0, 1);
    this.identityStickerLocations[11].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[45].translate(ps*6, 0, 0); 
    this.identityStickerLocations[45].rotate(180,  0, 0, 1);
    this.identityStickerLocations[45].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[ 2].translate(ps*3, 0, 0); 
    this.identityStickerLocations[ 2].rotate( 90,  0, 0, 1);
    this.identityStickerLocations[ 2].rotate(-90,  1, 0, 0);
    
    // 3:drb
    this.identityStickerLocations[44].translate(0, ps*-3, 0); 
    this.identityStickerLocations[44].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[ 8].translate(ps*3, 0, 0); 
    this.identityStickerLocations[ 8].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[51].translate(ps*6, 0, 0); 
    this.identityStickerLocations[51].rotate(-90,  0, 0, 1);
    this.identityStickerLocations[51].rotate(-90,  1, 0, 0);
  
    // 4:ulb
    this.identityStickerLocations[ 9].translate(0, ps*3, 0); 
    this.identityStickerLocations[ 9].rotate(180,  0, 0, 1);
    this.identityStickerLocations[ 9].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[27].translate(ps*-3, 0, 0); 
    this.identityStickerLocations[27].rotate(180,  0, 0, 1);
    this.identityStickerLocations[27].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[47].translate(ps*6, 0, 0); 
    this.identityStickerLocations[47].rotate( 90,  0, 0, 1);
    this.identityStickerLocations[47].rotate(-90,  1, 0, 0);
  
    // 5:dbl
    this.identityStickerLocations[42].translate(0, ps*-3, 0); 
    this.identityStickerLocations[42].rotate(-90,  0, 0, 1);
    this.identityStickerLocations[42].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[53].translate(ps*6, 0, 0); 
    this.identityStickerLocations[53].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[33].translate(ps*-3, 0, 0); 
    this.identityStickerLocations[33].rotate(-90,  0, 0, 1);
    this.identityStickerLocations[33].rotate(-90,  1, 0, 0);
    
    // 6:ufl
    this.identityStickerLocations[15].translate(0, ps*3, 0); 
    this.identityStickerLocations[15].rotate(-90,  0, 0, 1);
    this.identityStickerLocations[15].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[18].rotate(180,  0, 0, 1);
    this.identityStickerLocations[18].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[29].translate(ps*-3, 0, 0);
    this.identityStickerLocations[29].rotate( 90,  0, 0, 1);
    this.identityStickerLocations[29].rotate(-90,  1, 0, 0);
    
    // 7:dlf
    this.identityStickerLocations[36].translate(0, ps*-3, 0); 
    this.identityStickerLocations[36].rotate(180,  0, 0, 1);
    this.identityStickerLocations[36].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[35].translate(ps*-3, 0, 0); 
    this.identityStickerLocations[35].rotate(-90,  1, 0, 0);
    this.identityStickerLocations[24].rotate(-90,  0, 0, 1);
    this.identityStickerLocations[24].rotate(-90,  1, 0, 0);
    //
    /* Edges
     *             +---+---+---+
     *             |   |3.1|   |
     *             +--- --- ---+
     *             |6.0| u |0.0|
     *             +--- --- ---+
     *             |   |9.1|   |
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |   |6.1|   |   |9.0|   |   |0.1|   |   |3.0|   |
     * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
     * |7.0| l 10.0|10.1 f |1.1|1.0| r |4.0|4.1| b |7.1|
     * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
     * |   |8.1|   |   |11.0   |   |2.1|   |   |5.0|   |
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *             |   |11.1   |
     *             +--- --- ---+
     *             |8.0| d |2.0|
     *             +--- --- ---+
     *             |   |5.1|   |
     *             +---+---+---+
     */
    var edgeOffset=this.edgeOffset;
    
    // Move all edge parts to up right (ur) 
    // nothing to do
    
    // Rotate edge parts into place
    // ur
    //--no transformation--
    // rf
    this.identityPartLocations[edgeOffset + 1].rotate( 90,  0, 0,-1);
    this.identityPartLocations[edgeOffset + 1].rotate( 90,  0, 1, 0);
    // dr
    this.identityPartLocations[edgeOffset + 2].rotate(180,  1, 0, 0 );
    // bu
    this.identityPartLocations[edgeOffset + 3].rotate( 90,  0, 0, 1);
    this.identityPartLocations[edgeOffset + 3].rotate( 90,  1, 0, 0);
    // rb
    this.identityPartLocations[edgeOffset + 4].rotate( 90,  0, 0, -1);
    this.identityPartLocations[edgeOffset + 4].rotate( 90,  0, -1, 0);
    // bd
    this.identityPartLocations[edgeOffset + 5].rotate( 90,  1, 0, 0);
    this.identityPartLocations[edgeOffset + 5].rotate( 90,  0,-1, 0);
    // ul
    this.identityPartLocations[edgeOffset + 6].rotate(180,  0, 1, 0);
    // lb
    this.identityPartLocations[edgeOffset + 7].rotate( 90,  0, 0, 1);
    this.identityPartLocations[edgeOffset + 7].rotate( 90,  0,-1, 0);
    // dl
    this.identityPartLocations[edgeOffset + 8].rotate(180, 0, 1, 0);
    this.identityPartLocations[edgeOffset + 8].rotate(180,  1, 0, 0);
    // fu
    this.identityPartLocations[edgeOffset + 9].rotate(-90,  1, 0, 0);
    this.identityPartLocations[edgeOffset + 9].rotate( 90,  0,-1, 0);
    // lf
    this.identityPartLocations[edgeOffset + 10].rotate( 90,  0, 1, 0);
    this.identityPartLocations[edgeOffset + 10].rotate(-90,  1, 0, 0);
    // fd
    this.identityPartLocations[edgeOffset + 11].rotate( 90,  0, 0,-1);
    this.identityPartLocations[edgeOffset + 11].rotate(-90,  1, 0, 0);
          
    // Move all edge stickers to 0.0 (to up at the ur corner)
    // ur
    this.stickers[1].matrix.rotate(180, 0, 1 ,0);
    this.stickers[1].matrix.rotate( 90, 0, 0 ,1);
    // rf
    this.stickers[23].matrix.rotate(180, 0, 1 ,0);
    this.stickers[23].matrix.rotate( 90, 0, 0 ,1);
    // dr
    this.stickers[7].matrix.rotate(180, 0, 1 ,0);
    this.stickers[7].matrix.rotate( 90, 0, 0 ,1);
    // bu
    this.stickers[10].matrix.rotate(180, 0, 1 ,0);
    this.stickers[10].matrix.rotate( 90, 0, 0 ,1);
    // rb
    this.stickers[48].matrix.rotate(180, 0, 1 ,0);
    this.stickers[48].matrix.rotate( 90, 0, 0 ,1);
    // bd
    this.stickers[43].matrix.rotate(180, 0, 1 ,0);
    this.stickers[43].matrix.rotate( 90, 0, 0 ,1);
    // ul
    this.stickers[28].matrix.rotate(180, 0, 1 ,0);
    this.stickers[28].matrix.rotate( 90, 0, 0 ,1);
    // lb
    this.stickers[50].matrix.rotate(180, 0, 1 ,0);
    this.stickers[50].matrix.rotate( 90, 0, 0 ,1);
    // dl
    this.stickers[34].matrix.rotate(180, 0, 1 ,0);
    this.stickers[34].matrix.rotate( 90, 0, 0 ,1);
    // fu
    this.stickers[16].matrix.rotate(180, 0, 1 ,0);
    this.stickers[16].matrix.rotate( 90, 0, 0 ,1);
    // lf
    this.stickers[21].matrix.rotate(180, 0, 1 ,0);
    this.stickers[21].matrix.rotate( 90, 0, 0 ,1);
    // fd
    this.stickers[37].matrix.rotate(180, 0, 1 ,0);
    this.stickers[37].matrix.rotate( 90, 0, 0 ,1);
    
    // Rotate the edge stickers into place
    // ur
    this.identityStickerLocations[14].translate(0, ps*3, 0); 
    this.identityStickerLocations[14].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[ 1].translate(ps*3, 0, 0); 
    this.identityStickerLocations[ 1].rotate( 90,  0, 0, 1); // @19
    this.identityStickerLocations[ 1].rotate(-90,  1, 0, 0); // @23
    // rf
    this.identityStickerLocations[ 3].translate(ps*3, 0, 0); 
    this.identityStickerLocations[ 3].rotate(180, 0, 0, 1); // 
    this.identityStickerLocations[ 3].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[23].rotate(-90, 1, 0, 0); // @23
    // dr
    this.identityStickerLocations[41].translate( 0, ps*-3, 0); 
    this.identityStickerLocations[41].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[ 7].translate( ps*3, 0, 0); 
    this.identityStickerLocations[ 7].rotate(-90, 0, 0, 1); // @25
    this.identityStickerLocations[ 7].rotate(-90, 1, 0, 0); // @23 
    // bu
    this.identityStickerLocations[46].translate(ps*6, ps*0, 0); 
    this.identityStickerLocations[46].rotate( 90, 0, 0, 1); // @19
    this.identityStickerLocations[46].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[10].translate(ps*0, ps*3, 0); 
    this.identityStickerLocations[10].rotate( 90,  0, 0, 1); // @19
    this.identityStickerLocations[10].rotate(-90,  1, 0, 0); // @23
    // rb
    this.identityStickerLocations[ 5].translate(ps*3, 0, 0); 
    this.identityStickerLocations[ 5].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[48].translate(ps*6, 0, 0); 
    this.identityStickerLocations[48].rotate(180,  0, 0, 1); // @21
    this.identityStickerLocations[48].rotate(-90,  1, 0, 0); // @23
    // bd
    this.identityStickerLocations[52].translate(ps*6, ps*0, 0); 
    this.identityStickerLocations[52].rotate( 90,  0, 0,-1); // @25
    this.identityStickerLocations[52].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[43].translate(ps*0, ps*-3, 0); 
    this.identityStickerLocations[43].rotate(-90,  0, 0, 1); // @25
    this.identityStickerLocations[43].rotate(-90,  1, 0, 0); // @23
    // ul
    this.identityStickerLocations[12].translate(ps*0, ps*3, 0); 
    this.identityStickerLocations[12].rotate(180,  0, 0, 1); // @21
    this.identityStickerLocations[12].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[28].translate(ps*-3, ps*0, 0); 
    this.identityStickerLocations[28].rotate( 90,  0, 0, 1); // @19
    this.identityStickerLocations[28].rotate(-90,  1, 0, 0); // @23
    // lb
    this.identityStickerLocations[30].translate(ps*-3, ps*0, 0); 
    this.identityStickerLocations[30].rotate(180,  0, 0, 1); // @21
    this.identityStickerLocations[30].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[50].translate(ps*6, ps*0, 0); 
    this.identityStickerLocations[50].rotate(-90,  1, 0, 0); // @23
    // dl
    this.identityStickerLocations[39].translate(ps*0, ps*-3, 0); 
    this.identityStickerLocations[39].rotate(180,  0, 0, 1); // @21
    this.identityStickerLocations[39].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[34].translate(ps*-3, ps*0, 0); 
    this.identityStickerLocations[34].rotate(-90,  0, 0, 1); // @25
    this.identityStickerLocations[34].rotate(-90,  1, 0, 0); // @23
    // fu
    this.identityStickerLocations[19].translate(ps*0, ps*-0, 0); 
    this.identityStickerLocations[19].rotate( 90,  0, 0, 1); // @19
    this.identityStickerLocations[19].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[16].translate(ps*0, ps*3, 0); 
    this.identityStickerLocations[16].rotate(-90,  0, 0, 1); // @25
    this.identityStickerLocations[16].rotate(-90,  1, 0, 0); // @23
    // lf
    this.identityStickerLocations[32].translate(ps*-3, ps*-0, 0); 
    this.identityStickerLocations[32].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[21].rotate(180,  0, 0, 1); // @21
    this.identityStickerLocations[21].rotate(-90,  1, 0, 0); // @23
    // fd
    this.identityStickerLocations[25].rotate( 90,  0, 0,-1); // @21
    this.identityStickerLocations[25].rotate(-90,  1, 0, 0); // @23
    this.identityStickerLocations[37].translate(ps*0, ps*-3, 0); 
    this.identityStickerLocations[37].rotate( 90,  0, 0, 1); // @19
    this.identityStickerLocations[37].rotate(-90,  1, 0, 0); // @23
    /* Sides
     *             +------------+
     *             |     .1     |
     *             |    ---     |
     *             | .0| 1 |.2  |
     *             |    ---     |
     *             |     .3     |
     * +-----------+------------+-----------+-----------+
     * |     .0    |     .2     |     .3    |    .1     |
     * |    ---    |    ---     |    ---    |    ---    |
     * | .3| 3 |.1 | .1| 2 |.3  | .2| 0 |.0 | .0| 5 |.2 |
     * |    ---    |    ---     |    ---    |    ---    |
     * |     .2    |    .0      |     .1    |     .3    |
     * +-----------+------------+-----------+-----------+
     *             |     .0     |
     *             |    ---     |
     *             | .3| 4 |.1  |
     *             |    ---     |
     *             |     .2     |
     *             +------------+
     */
    var sideOffset=this.sideOffset;
    
    // Move all side parts to right (= position of side[0]
    // nothing to do
  
    // Rotate the side parts into place
    // r
    // --no transformation--
    // u
    this.identityPartLocations[sideOffset + 1].rotate( 90,  0, 0, 1);
    this.identityPartLocations[sideOffset + 1].rotate(-90,  1, 0, 0);
    // f
    this.identityPartLocations[sideOffset + 2].rotate( 90,  0, 1, 0);
    this.identityPartLocations[sideOffset + 2].rotate( 90,  1, 0, 0);
    // l
    this.identityPartLocations[sideOffset + 3].rotate(180,  0, 1, 0);
    this.identityPartLocations[sideOffset + 3].rotate(-90,  1, 0, 0);
    // d
    this.identityPartLocations[sideOffset + 4].rotate( 90,  0, 0,-1);
    this.identityPartLocations[sideOffset + 4].rotate(180,  1, 0, 0);
    // b
    this.identityPartLocations[sideOffset + 5].rotate( 90,  0,-1, 0);
    this.identityPartLocations[sideOffset + 5].rotate(180,  1, 0, 0);
    
    // Rotate the side stickers into place
    // r
    this.identityStickerLocations[4].translate(3*partSize,  0, 0);
    this.identityStickerLocations[4].rotate( 90,  0, 1, 0);
    // u
    this.identityStickerLocations[13].translate(0, 3*partSize, 0);
    this.identityStickerLocations[13].rotate( 90,  0, 1, 0);
    this.identityStickerLocations[13].rotate(180,  1, 0, 0);
    // f
    this.identityStickerLocations[22].rotate( 90,  0, 1, 0);
    this.identityStickerLocations[22].rotate( 90,  1, 0, 0);
    // l
    this.identityStickerLocations[31].translate(-3*partSize,  0, 0);
    this.identityStickerLocations[31].rotate( 90,  0, 1, 0);
    this.identityStickerLocations[31].rotate(-90,  1, 0, 0);
    // d
    this.identityStickerLocations[40].translate(0, -3*partSize, 0);
    this.identityStickerLocations[40].rotate( 90,  0, 1, 0);
    this.identityStickerLocations[40].rotate(-90,  1, 0, 0);
    // b
    this.identityStickerLocations[49].translate(6*partSize,  0, 0);
    this.identityStickerLocations[49].rotate( 90,  0, 1, 0);
    this.identityStickerLocations[49].rotate(180,  1, 0, 0);
  
    // ----------------------------         
    // Reset all rotations
    for (var i=0;i<this.partCount;i++) {
      this.partLocations[i].matrix.load(this.identityPartLocations[i]);
    }
    for (var i=0;i<this.stickerCount;i++) {
      this.stickerLocations[i].matrix.load(this.identityStickerLocations[i]);
    }
  }
  
  loadGeometry() {
    // ----------------------------         
    // Load geometry
    var self = this;
    var fRepaint = function() {self.repaint();};
    
    var baseUrl=this.getModelUrl();
    
    {
      // parts
      this.centerObj = J3DI.loadObj(null, baseUrl+"center.obj",fRepaint);
      this.cornerObj = J3DI.loadObj(null, baseUrl+"corner.obj",fRepaint);
      this.edgeObj = J3DI.loadObj(null, baseUrl+"edge.obj",fRepaint);
      this.sideObj = J3DI.loadObj(null, baseUrl+"side.obj",fRepaint);
      
      // stickers
      this.stickerObjs = new Array(this.stickerCount);
      for (var i=0; i < this.stickerObjs.length; i++) {
        this.stickerObjs[i] = new J3DI.J3DIObj();
      }
      this.corner_rObj = J3DI.loadObj(null, baseUrl+"corner_r.obj",function() {self.initAbstractRubiksCubeCube3D_corner_r();self.repaint();});
      this.corner_uObj = J3DI.loadObj(null, baseUrl+"corner_u.obj",function() {self.initAbstractRubiksCubeCube3D_corner_u();self.repaint();});
      this.corner_fObj = J3DI.loadObj(null, baseUrl+"corner_f.obj",function() {self.initAbstractRubiksCubeCube3D_corner_f();self.repaint();});
      this.edge_rObj = J3DI.loadObj(null, baseUrl+"edge_r.obj",function() {self.initAbstractRubiksCubeCube3D_edge_r();self.repaint();});
      this.edge_uObj = J3DI.loadObj(null, baseUrl+"edge_u.obj",function() {self.initAbstractRubiksCubeCube3D_edge_u();self.repaint();});
      this.side_rObj = J3DI.loadObj(null, baseUrl+"side_r.obj",function() {self.initAbstractRubiksCubeCube3D_side_r();self.repaint();});
    }
    
  }
}
AbstractRubiksCubeCube3D.prototype.doValidateAttributes=function() {
    for (var i=0; i< this.stickerObjs.length; i++) {
      this.stickerObjs[i].hasTexture=this.attributes.stickersImageURL!=null;
    }
}

AbstractRubiksCubeCube3D.prototype.initAbstractRubiksCubeCube3D_corner_r=function() {
  var s = this.corner_rObj;
  var s180 = new J3DI.J3DIObj();
  s180.setTo(s);
  s180.rotateTexture(180);
  
  this.stickerObjs[ 0] = s.clone();
  this.stickerObjs[ 8] = s180.clone();
  this.stickerObjs[18] = s.clone();
  this.stickerObjs[26] = s180.clone();
  this.stickerObjs[27] = s.clone();
  this.stickerObjs[35] = s180.clone();
  this.stickerObjs[45] = s.clone();
  this.stickerObjs[53] = s180.clone();
  
  this.initAbstractRubiksCubeCube3D_textureScales();
}
AbstractRubiksCubeCube3D.prototype.initAbstractRubiksCubeCube3D_corner_f=function() {
  var s = this.corner_fObj;
  var s180 = new J3DI.J3DIObj();
  s180.setTo(s);
  s180.rotateTexture(180);

  this.stickerObjs[ 2] = s.clone();
  this.stickerObjs[ 6] = s180.clone();
  this.stickerObjs[20] = s.clone();
  this.stickerObjs[24] = s180.clone();
  this.stickerObjs[29] = s.clone();
  this.stickerObjs[33] = s180.clone();
  this.stickerObjs[47] = s.clone();
  this.stickerObjs[51] = s180.clone();
  
  this.initAbstractRubiksCubeCube3D_textureScales();
}
AbstractRubiksCubeCube3D.prototype.initAbstractRubiksCubeCube3D_corner_u=function() {
  var s = this.corner_uObj;
  var s90 = new J3DI.J3DIObj();
  s90.setTo(s);
  s90.rotateTexture(90);
  var s180 = new J3DI.J3DIObj();
  s180.setTo(s);
  s180.rotateTexture(180);
  var s270 = new J3DI.J3DIObj();
  s270.setTo(s);
  s270.rotateTexture(270);

  this.stickerObjs[ 9] = s180.clone();
  this.stickerObjs[11] = s90.clone();
  this.stickerObjs[15] = s270.clone();
  this.stickerObjs[17] = s.clone();
  this.stickerObjs[36] = s180.clone();
  this.stickerObjs[38] = s90.clone();
  this.stickerObjs[42] = s270.clone();
  this.stickerObjs[44] = s.clone();
  
  this.initAbstractRubiksCubeCube3D_textureScales();
}
AbstractRubiksCubeCube3D.prototype.initAbstractRubiksCubeCube3D_edge_u=function() {
  var s = this.edge_uObj;
  var s90 = new J3DI.J3DIObj();
  s90.setTo(s);
  s90.rotateTexture(90);
  var s180 = new J3DI.J3DIObj();
  s180.setTo(s);
  s180.rotateTexture(180);
  var s270 = new J3DI.J3DIObj();
  s270.setTo(s);
  s270.rotateTexture(270);

  this.stickerObjs[12] = s180.clone();
  this.stickerObjs[14] = s.clone();
  this.stickerObjs[19] = s90.clone();
  this.stickerObjs[46] = s90.clone();
  this.stickerObjs[30] = s180.clone();
  this.stickerObjs[32] = s.clone();
  this.stickerObjs[ 3] = s180.clone();
  this.stickerObjs[ 5] = s.clone();
  this.stickerObjs[25] = s270.clone();
  this.stickerObjs[52] = s270.clone();
  this.stickerObjs[39] = s180.clone();
  this.stickerObjs[41] = s.clone();
  
  this.initAbstractRubiksCubeCube3D_textureScales();
}
AbstractRubiksCubeCube3D.prototype.initAbstractRubiksCubeCube3D_edge_r=function() {
  var s = this.edge_rObj;
  var s90 = new J3DI.J3DIObj();
  s90.setTo(s);
  s90.rotateTexture(90);
  var s180 = new J3DI.J3DIObj();
  s180.setTo(s);
  s180.rotateTexture(180);
  var s270 = new J3DI.J3DIObj();
  s270.setTo(s);
  s270.rotateTexture(270);

  this.stickerObjs[ 1] = s.clone();
  this.stickerObjs[10] = s.clone();
  this.stickerObjs[16] = s180.clone();
  this.stickerObjs[28] = s.clone();
  this.stickerObjs[34] = s180.clone();
  this.stickerObjs[ 7] = s180.clone();
  this.stickerObjs[21] = s90.clone();
  this.stickerObjs[23] = s270.clone();
  this.stickerObjs[48] = s90.clone();
  this.stickerObjs[50] = s270.clone();
  this.stickerObjs[37] = s.clone();
  this.stickerObjs[43] = s180.clone();
  
  this.initAbstractRubiksCubeCube3D_textureScales();
}
AbstractRubiksCubeCube3D.prototype.initAbstractRubiksCubeCube3D_side_r=function() {
  var s = this.side_rObj;
  var s90 = s.clone();
  s90.rotateTexture(90);
  var s180 = s.clone();
  s180.rotateTexture(180);
  var s270 = s.clone();
  s270.rotateTexture(270);

  this.stickerObjs[ 4] = s.clone();//r
  this.stickerObjs[13] = s180.clone();//u
  this.stickerObjs[22] = s270.clone();//f
  this.stickerObjs[31] = s90.clone();//l
  this.stickerObjs[40] = s90.clone();
  this.stickerObjs[49] = s180.clone();
  
  this.initAbstractRubiksCubeCube3D_textureScales();
}
AbstractRubiksCubeCube3D.prototype.initAbstractRubiksCubeCube3D_textureScales=function() {
  var attr=this.attributes;
  
  for (var i=0;i<this.stickerObjs.length; i++) {
    if (! this.stickerObjs[i].loaded) continue;
    
    if (this.stickerObjs[i].isTextureScaled) continue;
    if (i*2+1<this.stickerOffsets.length) {
      this.stickerObjs[i].textureOffsetX=this.stickerOffsets[i*2];
      this.stickerObjs[i].textureOffsetY=this.stickerOffsets[i*2+1];
    }
    this.stickerObjs[i].textureScale=56/512;
    this.stickerObjs[i].isTextureScaled=true;
  }
  
  this.isAttributesValid = false;
}

/**
 * Maps stickers to cube parts.
 * <p>
 * Sticker indices:
 * <pre>
 *             +---+---+---+
 *             |1,0|1,1|1,2|
 *             +--- --- ---+
 *             |1,3|1,4|1,5|
 *             +--- --- ---+
 *             |1,6|1,7|1,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,6|3,7|3,8|2,6|2,7|2,8|0,6|0,7|0,8|5,6|5,7|5,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |4,0|4,1|4,2|
 *             +--- --- ---+
 *             |4,3|4,4|4,5|
 *             +--- --- ---+
 *             |4,6|4,7|4,8|
 *             +---+---+---+
 * </pre>
 * Sticker indices absolute values:
 * <pre>
 *             +---+---+---+
 *             | 9 |10 |11 |
 *             +--- --- ---+
 *             |12 |13 |14 |
 *             +--- --- ---+
 *             |15 |16 |17 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |27 |28 |29 |18 |19 |20 | 0 | 1 | 2 |45 |46 |47 |
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |30 |31 |32 |21 |22 |23 | 3 | 4 | 5 |48 |49 |50 |
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |33 |34 |35 |24 |25 |26 | 6 | 7 | 8 |51 |52 |53 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |36 |37 |38 |
 *             +--- --- ---+
 *             |39 |40 |41 |
 *             +--- --- ---+
 *             |42 |43 |44 |
 *             +---+---+---+
 * </pre>
 * <p>
 * Part indices:
 * <pre>
 *                +----+----+----+
 *                | 4.0|11.1| 2.0|
 *                +----      ----+
 *                |14.0 21    8.0|
 *                +----      ----+
 *                | 6.0|17.1| 0.0|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * | 4.1|14.1| 6.2| 6.1|17.0| 0.2| 0.1| 8.1| 2.2| 2.1|11.0| 4.2|
 * +----      ----+----      ----+----      ----+----      ----+
 * |15.0 23   18.0|18   22    9.1| 9.0 20   12.0|12   25   15.1|
 * +----      ----+----      ----+----      ----+----      ----+
 * | 5.2|16.1| 7.1| 7.2|19.0| 1.1| 1.2|10.1| 3.1| 3.2|13.0| 5.1|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                | 7.0|19.1| 1.0|
 *                +----      ----+
 *                |16.0 24   10.0|
 *                +----      ----+
 *                |5.0 |13.1| 3.0|
 *                +----+----+----+
 * </pre>
 */
AbstractRubiksCubeCube3D.prototype.stickerToPartMap = [
        0,  8, 2,   9, 20, 12,   1, 10, 3, // right
        4, 11, 2,  14, 21,  8,   6, 17, 0, // up
        6, 17, 0,  18, 22,  9,   7, 19, 1, // front
        4, 14, 6,  15, 23, 18,   5, 16, 7, // left
        7, 19, 1,  16, 24, 10,   5, 13, 3, // down
        2, 11, 4,  12, 25, 15,   3, 13, 5  // back
];
AbstractRubiksCubeCube3D.prototype.getPartIndexForStickerIndex=function(stickerIndex) {
    return this.stickerToPartMap[stickerIndex];
}

AbstractRubiksCubeCube3D.prototype.getPartOrientationForStickerIndex=function(stickerIndex) {
    return this.stickerToFaceMap[stickerIndex];
}

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part. 
 * This map is filled in by the init method!!
 */
AbstractRubiksCubeCube3D.prototype.partToStickerMap=null;
AbstractRubiksCubeCube3D.prototype.getStickerIndexForPartIndex=function(partIndex, orientation) {
  return this.partToStickerMap[partIndex][orientation];
}

/**
 * Gets the face of the part which holds the indicated sticker.
 * The sticker index is interpreted according to this scheme:
 * <pre>
 *             +---+---+---+
 *             |1,0|1,1|1,2|
 *             +--- --- ---+
 *             |1,3|1,4|1,5|
 *             +--- --- ---+
 *             |1,6|1,7|1,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,6|3,7|3,8|2,6|2,7|2,8|0,6|0,7|0,8|5,6|5,7|5,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |4,0|4,1|4,2|
 *             +--- --- ---+
 *             |4,3|4,4|4,5|
 *             +--- --- ---+
 *             |4,6|4,7|4,8|
 *             +---+---+---+
 * </pre>
 * The faces (or orientation of the parts) according to this scheme:
 * <pre>
 *                +----+----+----+
 *                | 4.0|11.1| 2.0|
 *                +----      ----+
 *                |14.0 21    8.0|
 *                +----      ----+
 *                | 6.0|17.1| 0.0|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * | 4.1|14.1| 6.2| 6.1|17.0| 0.2| 0.1| 8.1| 2.2| 2.1|11.0| 4.2|
 * +----      ----+----      ----+----      ----+----      ----+
 * |15.0 23   18.0|18.1 22    9.1| 9.0 20   12.0|12.1 25   15.1|
 * +----      ----+----      ----+----      ----+----      ----+
 * | 5.2|16.1| 7.1| 7.2|19.0| 1.1| 1.2|10.1| 3.1| 3.2|13.0| 5.1|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                | 7.0|19.1| 1.0|
 *                +----      ----+
 *                |16.0 24   10.0|
 *                +----      ----+
 *                |5.0 |13.1| 3.0|
 *                +----+----+----+
 * </pre>
 */
AbstractRubiksCubeCube3D.prototype.stickerToFaceMap = [
        1, 1, 2, 0, 0, 0, 2, 1, 1, // right
        0, 1, 0, 0, 0, 0, 0, 1, 0, // up
        1, 0, 2, 1, 0, 1, 2, 0, 1, // front
        1, 1, 2, 0, 0, 0, 2, 1, 1, // left
        0, 1, 0, 0, 0, 0, 0, 1, 0, // down
        1, 0, 2, 1, 0, 1, 2, 0, 1 // back
];

/** Default cube attributes. */
AbstractRubiksCubeCube3D.prototype.createAttributes=function() {
  var a=CubeAttributes.newCubeAttributes(this.partCount, 6*9, [9,9,9,9,9,9]);
  var partsPhong=[0.5,0.6,0.4,16.0];//shiny plastic [ambient, diffuse, specular, shininess]
  for (var i=0;i<this.partCount;i++) {
    a.partsFillColor[i]=[40,40,40,255];
    a.partsPhong[i]=partsPhong;
  }
  a.partsFillColor[this.centerOffset]=[240,240,240,255];
  
  var faceColors=[
    [255,210,  0,255],// right: yellow
    [  0, 51,115,255],// up   : blue
    [140,  0, 15,255],// front: red
    [248,248,248,255],// left : white
    [  0,115, 47,255],// down : green
    [255, 70,  0,255] // back : orange
  ];
  
  var stickersPhong=[0.8,0.2,0.1,8.0];//shiny paper [ambient, diffuse, specular, shininess]
 
  for (var i=0;i<6;i++) {
    for (var j=0;j<9;j++) {
      a.stickersFillColor[i*9+j]=faceColors[i];
      a.stickersPhong[i*9+j]=stickersPhong;
    }
  }
  
  return a;
}

AbstractRubiksCubeCube3D.prototype.updateExplosionFactor=function(factor) {
  if (factor == null) {
      factor=this.attributes.explosionFactor;
  }
  var explosionShift=this.partSize*1.5;
  var baseShift = explosionShift * factor;
  var shift = 0;
  var a = this.attributes;
  for (var i = 0; i < this.cornerCount; i++) {
    var index = this.cornerOffset + i;
    shift = baseShift+a.partExplosion[index];
    this.partExplosions[index].matrix.makeIdentity();
    this.partExplosions[index].matrix.translate(shift, shift, -shift);//ruf
  }
  for (var i = 0; i < this.edgeCount; i++) {
    var index = this.edgeOffset + i;
    shift = baseShift+a.partExplosion[index];
    this.partExplosions[index].matrix.makeIdentity();
    this.partExplosions[index].matrix.translate(shift, shift, 0);//ru
  }
  for (var i = 0; i < this.sideCount; i++) {
    var index = this.sideOffset + i;
    shift = baseShift+a.partExplosion[index];
    this.partExplosions[index].matrix.makeIdentity();
    this.partExplosions[index].matrix.translate(shift, 0, 0);//r
  }
  this.fireStateChanged();
}


AbstractRubiksCubeCube3D.prototype.validateTwist=function(partIndices, locations, orientations, length, axis, angle, alpha) {
  var rotation = this.updateTwistRotation;
  rotation.makeIdentity();
  var rad = (90 * angle * (1 - alpha));
  switch (axis) {
    case 0:
      rotation.rotate(rad, -1, 0, 0);
      break;
    case 1:
      rotation.rotate(rad,  0,-1, 0);
      break;
    case 2:
      rotation.rotate(rad,  0, 0, 1);
      break;
  }

  var orientationMatrix = this.updateTwistOrientation;
  for (var i = 0; i < length; i++) {
    orientationMatrix.makeIdentity();
    if (partIndices[i] < this.edgeOffset) { //=> part is a corner
      // Base location of a corner part is urf. (= corner part 0)
      switch (orientations[i]) {
        case 0:
          break;
        case 1:
          orientationMatrix.rotate(90,  0, 0, 1);
          orientationMatrix.rotate(90, -1, 0, 0);
          break;
        case 2:
          orientationMatrix.rotate(90,  0, 0,-1);
          orientationMatrix.rotate(90,  0, 1, 0);
          break;
      }
    } else if (partIndices[i] < this.sideOffset) { //=> part is an edge
      orientationMatrix.makeIdentity();
      if (orientations[i] == 1) { 
        // Base location of an edge part is ur. (= edge part 0)
        orientationMatrix.rotate( 90,  0, 0, 1);
        orientationMatrix.rotate(180,  1, 0, 0);
      }
    } else if (partIndices[i] < this.centerOffset) {//=> part is a side
      if (orientations[i] > 0) {
        // Base location of a side part is r. (= side part 0)
        orientationMatrix.rotate(90*orientations[i], -1, 0, 0);
      }
    }
    this.partOrientations[partIndices[i]].matrix.load(orientationMatrix);
    var transform = this.partLocations[partIndices[i]].matrix;
    transform.load(rotation);
    transform.multiply(this.identityPartLocations[locations[i]]);
  }
}

AbstractRubiksCubeCube3D.prototype.cubeTwisted=function(evt) {
  if (this.repainter==null) {
      this.updateCube();
      return;
  }
  
  var layerMask = evt.layerMask;
  var axis = evt.axis;
  var angle = evt.angle;
  var model = this.cube;

  var partIndices = new Array(27);
  var locations =  new Array(27);
  var orientations =  new Array(27);
  var count = 0;

  var affectedParts = evt.getAffectedLocations();
  if ((layerMask & 2) != 0) {
      count = affectedParts.length + 1;
      locations=affectedParts.slice(0,count);
      locations[count - 1] = this.centerOffset;
  } else {
      count = affectedParts.length;
      locations=affectedParts.slice(0,count);
  }
  for (var i = 0; i < count; i++) {
      partIndices[i] = model.getPartAt(locations[i]);
      orientations[i] = model.getPartOrientation(partIndices[i]);
  }

  var finalCount=count;
  var self=this;
  var interpolator = SplineInterpolator.newSplineInterpolator(0, 0, 1, 1);
  var start=new Date().getTime();
  var duration=this.attributes.twistDuration*Math.abs(angle);
  this.isTwisting=true;
  var f=function() {
    var now=new Date().getTime();
    var elapsed=now-start;
    var value=elapsed/duration;
    if (value<1) {
      self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, interpolator.getFraction(value));
      self.repainter.repaint(f);
    } else {
      self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, 1.0);
      self.isTwisting=false;
    }
  };
  this.repainter.repaint(f);
}

AbstractRubiksCubeCube3D.prototype.boxClickToAxisMap = [
  [[ 0, 1, 0],[ 2, 0, 2],[ 0, 1, 0]],// right
  [[ 1, 2, 1],[ 0, 1, 0],[ 1, 2, 1]],// down
  [[ 2, 1, 2],[ 0, 2, 0],[ 2, 1, 2]],// front
  [[ 0, 1, 0],[ 2, 0, 2],[ 0, 1, 0]],// left
  [[ 1, 2, 1],[ 0, 1, 0],[ 1, 2, 1]],// up
  [[ 2, 1, 2],[ 0, 2, 0],[ 2, 1, 2]],// back
];
AbstractRubiksCubeCube3D.prototype.boxClickToAngleMap = [
  [[-1,-1,-1],[-1,-1, 1],[-1, 1,-1]],
  [[-1, 1,-1],[ 1,-1,-1],[-1,-1,-1]],
  [[ 1, 1, 1],[-1, 1, 1],[ 1,-1, 1]],
  [[ 1, 1, 1],[ 1, 1,-1],[ 1,-1, 1]],
  [[ 1,-1, 1],[-1, 1, 1],[ 1, 1, 1]],
  [[-1,-1,-1],[ 1,-1,-1],[-1, 1,-1]],
];
AbstractRubiksCubeCube3D.prototype.boxClickToLayerMap = [
  [[ 1, 2, 1],[ 2, 1, 2],[ 1, 2, 1]],
  [[ 1, 2, 1],[ 2, 1, 2],[ 1, 2, 1]],
  [[ 4, 2, 4],[ 2, 4, 2],[ 4, 2, 4]],
  [[ 4, 2, 4],[ 2, 4, 2],[ 4, 2, 4]],
  [[ 4, 2, 4],[ 2, 4, 2],[ 4, 2, 4]],
  [[ 1, 2, 1],[ 2, 1, 2],[ 1, 2, 1]],
];
AbstractRubiksCubeCube3D.prototype.boxSwipeToAxisMap = [
  [ 1, 2, 1, 2],// left
  [ 2, 0, 2, 0],// down
  [ 1, 0, 1, 0],// front
  [ 1, 2, 1, 2],// right
  [ 2, 0, 2, 0],// up
  [ 1, 0, 1, 0],// back
];
AbstractRubiksCubeCube3D.prototype.boxSwipeToAngleMap = [
  [-1,-1, 1, 1],// left
  [ 1, 1,-1,-1],// down
  [ 1,-1,-1, 1],// front
  [ 1, 1,-1,-1],// right
  [-1,-1, 1, 1],// up
  [-1, 1, 1,-1],// back
];
AbstractRubiksCubeCube3D.prototype.boxSwipeToLayerMap = [
  [[[ 1, 4, 1, 4], [ 2, 4, 2, 4], [ 4, 4, 4, 4]],[[ 1, 2, 1, 2], [ 2, 2, 2, 2], [ 4, 2, 4, 2]],[[ 1, 1, 1, 1], [ 2, 1, 2, 1], [ 4, 1, 4, 1]]],// left
  [[[ 4, 1, 4, 1], [ 2, 1, 2, 1], [ 1, 1, 1, 1]],[[ 4, 2, 4, 2], [ 2, 2, 2, 2], [ 1, 2, 1, 2]],[[ 4, 4, 4, 4], [ 2, 4, 2, 4], [ 1, 4, 1, 4]]],// down
  [[[ 1, 1, 1, 1], [ 2, 1, 2, 1], [ 4, 1, 4, 1]],[[ 1, 2, 1, 2], [ 2, 2, 2, 2], [ 4, 2, 4, 2]],[[ 1, 4, 1, 4], [ 2, 4, 2, 4], [ 4, 4, 4, 4]]],// front
  [[[ 1, 4, 1, 4], [ 2, 4, 2, 4], [ 4, 4, 4, 4]],[[ 1, 2, 1, 2], [ 2, 2, 2, 2], [ 4, 2, 4, 2]],[[ 1, 1, 1, 1], [ 2, 1, 2, 1], [ 4, 1, 4, 1]]],// right
  [[[ 4, 1, 4, 1], [ 2, 1, 2, 1], [ 1, 1, 1, 1]],[[ 4, 2, 4, 2], [ 2, 2, 2, 2], [ 1, 2, 1, 2]],[[ 4, 4, 4, 4], [ 2, 4, 2, 4], [ 1, 4, 1, 4]]],// up
  [[[ 1, 1, 1, 1], [ 2, 1, 2, 1], [ 4, 1, 4, 1]],[[ 1, 2, 1, 2], [ 2, 2, 2, 2], [ 4, 2, 4, 2]],[[ 1, 4, 1, 4], [ 2, 4, 2, 4], [ 4, 4, 4, 4]]],// back
];
/**
 * The following properties may have different values depending on
 * the 3D model being used.
 * <pre>
 *   0 1 2 3 4 5 6 7 8
 *        +-----+ 
 * 0      |     |
 * 1      |  U  |
 * 2      |     |
 *  +-----+-----+-----+
 * 3|     |     |     |
 * 4|  L  |  F  |  R  |
 * 5|     |     |     |
 *  +-----+-----+-----+
 * 6      |     |     |
 * 7      |  D  |  B  |
 * 8      |     |     |
 *        +-----+-----+
 * </pre>
 */
AbstractRubiksCubeCube3D.prototype.stickerOffsets=[
  6,3 ,7,3 ,8,3,//right
  6,4, 7,4, 8,4,
  6,5, 7,5, 8,5,
  
  3,0, 4,0, 5,0,//up
  3,1, 4,1, 5,1,//
  3,2, 4,2, 5,2,
  
  3,3, 4,3, 5,3,//front
  3,4, 4,4, 5,4,
  3,5, 4,5, 5,5,
  
  0,3, 1,3, 2,3,//left
  0,4, 1,4, 2,4,
  0,5, 1,5, 2,5,
  
  3,6, 4,6, 5,6,//down
  3,7, 4,7, 5,7,
  3,8, 4,8, 5,8,
  
  6,6, 7,6, 8,6,//back
  6,7, 7,7, 8,7,
  6,8, 7,8, 8,8
];


// ------------------
// MODULE API    
// ------------------
return {
  AbstractRubiksCubeCube3D : AbstractRubiksCubeCube3D
};
});
/*
 * @(#)Cube.js  1.0.2  2014-01-17
 *
 * Copyright (c) 2011-2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("Cube", [], 
function() { 
/**
 * Base class for classes which implement a Rubik's Cube like puzzle.
 * <p>
 * This class provides support for event listeners, and it defines the variables 
 * which hold the location and orientation of the cube parts.
 * <p>
 * <b>Faces and Axes</b>
 * <p>
 * This class defines the location of the six faces of the cube, as shown below:
 * <pre>
 *             +---+---+---+
 *             |           |
 *             |           |
 *             |    1 u    |
 *             |           |
 *             |           |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |           |           |           |           |
 * |           |           |           |           |
 * |    3 l    |    2 f    |    0 r    |    5 b    |
 * |           |           |           |           |
 * |           |           |           |           |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |           |
 *             |           |
 *             |    4 d    |
 *             |           |
 *             |           |
 *             +---+---+---+
 * </pre>
 * The numbers represent the ID's of the faces: 0=right, 1=up, 2=front, 3=left, 
 * 4=down, 5=back.
 * <p>
 * The face ID's are symmetric along the axis from the right-up-front corner 
 * through the left-down-back corner of the cube.
 * <p>
 * <ul>
 * <li>The x-axis passes from the center of face 3 through the center of face 0.
 * </li>
 * <li>The y-axis passes from the center of face 4 through the center of face 1.
 * </li>
 * <li>The z-axis passes from the center of face 5 through the center of face 2.
 * </li>
 * </ul>
 * <p>
 * <b>Corner parts</b>
 * <p>
 * This class defines the initial locations and orientations of the corner parts
 * as shown below:
 * <pre>
 *             +---+---+---+
 *          ulb|4.0|   |2.0|ubr
 *             +---     ---+
 *             |     u     |
 *             +---     ---+
 *          ufl|6.0|   |0.0|urf
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
 * +---     ---+---     ---+---     ---+---     ---+
 * |     l     |     f     |     r     |     b     |
 * +---     ---+---     ---+---     ---+---     ---+
 * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *          dlf|7.0|   |1.0|dfr
 *             +---     ---+
 *             |     d     |
 *             +---     ---+
 *          dbl|5.0|   |3.0|drb
 *             +---+---+---+
 * </pre>
 * <p>
 * The numbers before the dots represents the ID's of the corner parts. There are
 * 12 corner parts with ID's ranging from 0 through 11.  Since a corner part is
 * visible on three faces of the cube, the ID of each part is shown 3 times.
 * <p>
 * The numbers after the dots indicate the orientations of the corner parts.
 * Each corner part can have three different orientations: 0=initial, 
 * 1=tilted counterclockwise and 2=titled clockwise.
 * <p>
 * The orientations of the corner parts are symmetric along the axis from the 
 * right-up-front corner through the left-down-back corner of the cube.
 * <pre>
 *       +-----------+              +-----------+
 *      /4.0/   /2.0/|             /1.0/   /3.0/|
 *     +---     ---+.2            +---     ---+.2
 *    /     u     /|/|           /     d     /|/| 
 *   +---     ---+   +          +---     ---+   +
 *  /6.0/   /0.0/|  /|         /7.0/   /5.0/|  /|
 * +---+---+---*.1  .1        +---+---+---*.1  .1 
 * | .1|   | .2|/ r|/         | .1|   | .2|/ b|/
 * +---     ---+   +          +---     ---+   +
 * |     f     |/|/           |     l     |/|/
 * +---     ---+.2            +---     ---+.2
 * | .2|   | .1|/             |.2 |   | .1|/ 
 * +---+---+---+              +---+---+---+
 * </pre>
 * <p>
 * Here is an alternative representation of the initial locations and 
 * orientations of the corner parts as a list:
 * <ul>
 * <li>0: urf</li><li>1: dfr</li><li>2: ubr</li><li>3: drb</li>
 * <li>4: ulb</li><li>5: dbl</li><li>6: ufl</li><li>7: dlf</li>
 * </ul>
 * <p>
 * <b>Edge parts</b>
 * <p>
 * This class defines the orientations of the edge parts and the location
 * of the first 12 edges.
 * (The locations of additional edge parts are defined by subclasses):
 * <pre>
 *               +----+---+----+
 *               |    |3.1|    |
 *               |    +---+    |
 *               +---+     +---+
 *             ul|6.0|  u  |0.0|ur
 *               +---+     +---+
 *               |    +---+    |
 *               |    |9.1|    |
 * +----+---+----+----+---+----+----+---+----+----+---+----+
 * |    |6.1|    |    |9.0|fu  |    |0.1|    |    |3.0|bu  |
 * |    +---+    |    +---+    |    +---+    |    +---+    |
 * +---+     +---+---+     +---+---+     +---+---+     +---+
 * |7.0|  l  10.0|10.1  f  |1.1|1.0|  r  |4.0|4.1|  b  |7.1|
 * +---+     +---+---+     +---+---+     +---+---+     +---+
 * |lb  +---+  lf|    +---+    |rf  +---+  rb|    +---+    |
 * |    |8.1|    |    11.0|fd  |    |2.1|    |    |5.0|bd  |
 * +----+---+----+----+---+----+----+---+----+----+---+----+
 *               |    11.1|    |
 *               |    +---+    |
 *               +---+     +---+
 *             dl|8.0|  d  |2.0|dr
 *               +---+     +---+
 *               |    +---+    |
 *               |    |5.1|    |
 *               +----+---+----+
 * </pre>
 * The numbers after the dots indicate the orientations of the edge parts.
 * Each edge part can have two different orientations: 0=initial, 1=flipped.
 * <pre>
 *               +----+---+----+
 *               |    |3.1|    |
 *               |    +---+    |
 *               +---+     +---+
 *             ul|6.0|  u  |0.0|ur
 *               +---+     +---+
 *               |    +---+    |
 *               |    |9.1|    |
 * +----+---+----+----+---+----+----+---+----+----+---+----+
 * |    |6.1|    |    |9.0|fu  |    |0.1|    |    |3.0|bu  |
 * |    +---+    |    +---+    |    +---+    |    +---+    |
 * +---+     +---+---+     +---+---+     +---+---+     +---+
 * |7.0|  l  10.0|10.1  f  |1.1|1.0|  r  |4.0|4.1|  b  |7.1|
 * +---+     +---+---+     +---+---+     +---+---+     +---+
 * |lb  +---+  lf|    +---+    |rf  +---+  rb|    +---+    |
 * |    |8.1|    |    11.0|fd  |    |2.1|    |    |5.0|bd  |
 * +----+---+----+----+---+----+----+---+----+----+---+----+
 *               |    11.1|    |
 *               |    +---+    |
 *               +---+     +---+
 *             dl|8.0|  d  |2.0|dr
 *               +---+     +---+
 *               |    +---+    |
 *               |    |5.1|    |
 *               +----+---+----+
 * </pre>
 * <p>
 * The orientations of the edge parts are symmetric along the axis from the 
 * front-up edge through the back-down edge of the cube.
 * <pre>
 *       +-----------+      +-----------+
 *      /   / 3 /   /|      |\   \11 \   \
 *     +--- --- ---+ +      + +--- --- ---+
 *    /6.0/ u /0.0/|/|      |\|\8.0\ d \2.0\
 *   +--- --- ---+  4.0   10.0  +--- --- ---+
 *  /   / 9 /   /| |/|      |\ \|\   \ 5 \   \
 * +---+-*-+---+  r  +      +  l  +---+-*-+---+
 * |   |9.0|   |/| |/        \|\ \|   |5.0|   |
 * +--- --- ---+  2.1        6.1  +--- --- ---+
 * |10 | f | 1 |/|/            \|\| 7 | b | 4 |
 * +--- --- ---+ +              + +--- --- ---+
 * |   11.0|   |/                \|   |3.0|   |
 * +---+---+---+                  +---+---+---+
 * </pre>
 * <p>
 * Here is an alternative representation of the initial locations and 
 * orientations of the edge parts as a list:
 * <ul>
 * <li> 0: ur</li><li> 1: rf</li><li> 2: dr</li> 
 * <li> 3: bu</li><li> 4: rb</li><li> 5: bd</li> 
 * <li> 6: ul</li><li> 7: lb</li><li> 8: dl</li> 
 * <li> 9: fu</li><li>10: lf</li><li>11: fd</li>
 * </ul>
 * <p>
 * <b>Side parts</b>
 * <p>
 * This class defines the orientations of the side parts as shown below
 * (The locations of the side parts are defined by subclasses):
 * <pre>
 *             +-----------+
 *             |     .1    |
 *             |   +---+ u |
 *             | .0| 1 |.2 |
 *             |   +---+   |
 *             |     .3    |
 * +-----------+-----------+-----------+-----------+
 * |     .0    |     .2    |     .3    |    .1     |
 * |   +---+ l |   +---+ f |   +---+ r |   +---+ b |
 * | .3| 3 |.1 | .1| 2 |.3 | .2| 0 |.0 | .0| 5 |.2 |
 * |   +---+   |   +---+   |   +---+   |   +---+   |
 * |     .2    |    .0     |     .1    |     .3    |
 * +-----------+-----------+-----------+-----------+
 *             |     .0    |
 *             |   +---+ d |
 *             | .3| 4 |.1 |
 *             |   +---+   |
 *             |     .2    |
 *             +-----------+
 * </pre>
 * The numbers after the dots indicate the orientations of the side parts.
 * Each side part can have four different orientations: 0=initial, 
 * 1=tilted clockwise, 2=flipped, 3=tilted counterclockwise.
 * <p>
 * The orientations of the side parts are symmetric along the axis from the 
 * right-up-front corner through the left-down-back corner of the cube.
 * <pre>
 *       +-----------+              +-----------+
 *      /     .1    /|             /     .1    /|
 *     +    ---    +r+            +    ---    +b+
 *    / .0/ 1 /.2 /  |           / .0/ 4 /.2 /  | 
 *   +    ---    +.3 +          +    ---    +.3 +
 *  / u   .3    / /|.0         / d   .3    / /|.0
 * +---+---+---*  0  +        +---+---+---*  5  + 
 * | f   .2    .2|/ /         | l   .2    .2|/ /
 * +    ---    + .1+          +    ---    + .1+
 * | .1| 2 |.3 |  /           | .1| 3 |.3 |  /
 * +    ---    + +            +    ---    + +
 * |     .0    |/             |     .0    |/ 
 * +---+---+---+              +---+---+---+
 * </pre>
 * <p>
 * Here is an alternative representation of the initial locations and 
 * orientations of the side parts as a list:
 * <ul>
 * <li>0: r</li> <li>1: u</li> <li>2: f</li> 
 * <li>3: l</li> <li>4: d</li> <li>5: b</li> 
 * </ul>
 */

// ===============================
//
// CubeEvent
//
// ===============================

/** Cube event. */
class CubeEvent {
  constructor(source, axis, layerMask, angle) {
    this.source=source;
    this.axis=axis;
    this.angle=angle;
    this.layerMask=layerMask;
  }


 /**
  * Returns a list of part ID's, for each part location which is affected
  * if a cube is transformed using the axis, layerMaska and angle
  * parameters of this event. 
  */
  getAffectedLocations() {
    var c1 = this.source.clone();
    c1.reset();
    c1.transform(this.axis, this.layerMask, this.angle);
    return c1.getUnsolvedParts();
  }
}

// ===============================
//
// Cube
//
// ===============================

class Cube {
  /**
   * Creates a new instance.
   * @param this.layerCount number of layers on the x, y and z axis.
   *
   * @throws IllegalArgumentException if the layour count is smaller than 2.
   */
  constructor(layerCount)  {
    if (layerCount < 2) {
        throw new IllegalArgumentException("this.layerCount: " + this.layerCount + " < 2");
    }
    this.layerCount = layerCount;

    this.cornerLoc = new Array(8);
    this.cornerOrient = new Array(8);
    this.listenerList=[];

    if (this.layerCount > 2) {
        this.edgeLoc = new Array((this.layerCount - 2) * 12);
        this.edgeOrient = new Array(this.edgeLoc.length);
        this.sideLoc = new Array((this.layerCount - 2) * (this.layerCount - 2) * 6);
        this.sideOrient = new Array(this.sideLoc.length);
    } else {
        this.edgeLoc = this.edgeOrient = this.sideLoc = this.sideOrient = new Array(0);
    }

    // The owner is used to coordinate series of transformations (such as twisting)
    // that may only be performed by one entity at a time.
    this.owner=null;
    
    // This is set to true if a series of transformations shall be canceled.
    // Lengthy operations should check from time to time if cancel was requested
    // and then stop their operation as soon as possible.
    this.cancel=false;
}  

  /** Attempts to lock the cube for the specified owner.
   * Returns true on success.
   */
  lock(owner) {
    if (this.owner==null || this.owner===owner) {
      this.owner=owner;
      return true;
    }
    return false;
  }
  /** Attempts to unlock the cube from the specified owner.
   * Returns true on success.
   */
  unlock(owner) {
    if (this.owner===owner) {
      this.owner=null;
      return true;
    }
    return false;
  }



    /**
     * Compares two cubes for equality.
     */
    equals(that) {
            return that.getLayerCount() == this.layerCount && Arrays.equals(that.getCornerLocations(), this.cornerLoc) && Arrays.equals(that.getCornerOrientations(), this.cornerOrient) && Arrays.equals(that.getEdgeLocations(), this.edgeLoc) && Arrays.equals(that.getEdgeOrientations(), this.edgeOrient) && Arrays.equals(that.getSideLocations(), this.sideLoc) && Arrays.equals(that.getSideOrientations(), this.sideOrient);
    }

    /**
     * Returns the hash code for the cube.
     */

    hashCode() {
        var hash = 0;
        var sub = 0;
        for (var i = 0; i < this.cornerLoc.length; i++) {
            sub = sub << 1 + this.cornerLoc[i];
        }
        hash |= sub;
        sub = 0;
        for (var i = 0; i < this.edgeLoc.length; i++) {
            sub = sub << 1 + this.edgeLoc[i];
        }
        hash |= sub;
        sub = 0;
        for (var i = 0; i < this.sideLoc.length; i++) {
            sub = sub << 1 + this.sideLoc[i];
        }
        return hash;
    }

    /**
     * Resets the cube to its initial (ordered) state.
     */
    reset() {
    this.transformType = this.IDENTITY_TRANSFORM;

    var i;
    for (i = 0; i < this.cornerLoc.length; i++) {
        this.cornerLoc[i] = i;
        this.cornerOrient[i] = 0;
    }

    for (i = 0; i < this.edgeLoc.length; i++) {
        this.edgeLoc[i] = i;
        this.edgeOrient[i] = 0;
    }

    for (i = 0; i < this.sideLoc.length; i++) {
        this.sideLoc[i] = i;
        this.sideOrient[i] = 0;
    }

    this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
}

    /**
     * Returns true if the cube is in its ordered (solved) state.
     */
    isSolved() {
        var i;
        for (i = 0; i < this.cornerLoc.length; i++) {
            if (this.cornerLoc[i] != i) {
                return false;
            }
            if (this.cornerOrient[i] != 0) {
                return false;
            }
        }

        for (i = 0; i < this.edgeLoc.length; i++) {
            if (this.edgeLoc[i] != i) {
                return false;
            }
            if (this.edgeOrient[i] != 0) {
                return false;
            }
        }

        for (i = 0; i < this.sideLoc.length; i++) {
            if (this.sideLoc[i] != i) {
                return false;
            }
            if (this.sideOrient[i] != 0) {
                return false;
            }
        }

        return true;
    }

/**
 * Adds a listener for CubeEvent's.
 *
 * A listener must have a cubeTwisted() and a cubeChanged() function.
 */
    addCubeListener(l) {
  this.listenerList[this.listenerList.length]=l;
}

/**
 * Removes a listener for CubeEvent's.
 */
    removeCubeListener(l) {
  for (var i=0;i<this.listenerList.length;i++) {
    if (this.listenerList[i]==l) {
      this.listenerList=this.listenerList.slice(0,i)+this.listenerList.slice(i+1);
      break;
    }
  }
}
/**
 * Notify all listeners that have registered varerest for
 * notification on this event type.
 */
    fireCubeTwisted(event) {
    if (!this.quiet) {
        // Guaranteed to return a non-null array
        var listeners = this.listenerList;
        // Process the listeners last to first, notifying
        // those that are varerested in this event
        for (var i = listeners.length - 1; i >= 0; i -= 1) {
                listeners[i].cubeTwisted(event);
        }
    }
}

/**
 * Notify all listeners that have registered varerest for
 * notification on this event type.
 */
    fireCubeChanged(event) {
    if (!this.quiet) {
        // Guaranteed to return a non-null array
        var listeners = this.listenerList;
        // Process the listeners last to first, notifying
        // those that are varerested in this event
        for (var i = listeners.length - 1; i >= 0; i -= 1) {
                listeners[i].cubeChanged(event);
        }
    }
}

    /**
     * Set this to false to prevent notification of listeners.
     * Setting this to true will fire a cubeChanged event.
     */
    setQuiet(b) {
        if (b != this.quiet) {
            this.quiet = b;
            if (!this.quiet) {
              this.fireCubeChanged(new CubeEvent(this, 0,0,0));
            }
        }
    }

    isQuiet() {
        return this.quiet;
    }

    /**
     * Returns the locations of all corner parts.
     */

    getCornerLocations() {
        return this.cornerLoc;
    }

    /**
     * Returns the orientations of all corner parts.
     */

    getCornerOrientations() {
        return this.cornerOrient;
    }

    /**
     * Sets the locations and orientations of all corner parts.
     */

    setCorners(locations,orientations) {
        {
            this.transformType = this.UNKNOWN_TRANSFORM;

            this.cornerLoc=locations.slice(0,this.cornerLoc.length);
            this.cornerOrient=orientations.slice(0,this.cornerOrient.length);
        }
        this.fireCubeChanged(new CubeEvent(this, 0,0,0));
    }

    /**
     * Gets the corner part at the specified location.
     */

    getCornerAt(location) {
        return this.cornerLoc[location];
    }

    /**
     * Gets the location of the specified corner part.
     */

    getCornerLocation(corner) {
        var i;
        if (this.cornerLoc[corner] == corner) {
            return corner;
        }
        for (i = this.cornerLoc.length - 1; i >= 0; i--) {
            if (this.cornerLoc[i] == corner) {
                break;
            }
        }
        return i;
    }

    /**
     * Returns the number of corner parts.
     */

    getCornerCount() {
        return this.cornerLoc.length;
    }

    /**
     * Returns the number of edge parts.
     */

    getEdgeCount() {
        return this.edgeLoc.length;
    }

    /**
     * Returns the number of side parts.
     */

    getSideCount() {
        return this.sideLoc.length;
    }

    /**
     * Gets the orientation of the specified corner part.
     */

    getCornerOrientation(corner) {
    return this.cornerOrient[this.getCornerLocation(corner)];
}

    /**
     * Returns the locations of all edge parts.
     */

    getEdgeLocations() {
        return this.edgeLoc;
    }

    /**
     * Returns the orientations of all edge parts.
     */

    getEdgeOrientations() {
        return this.edgeOrient;
    }

    /**
     * Sets the locations and orientations of all edge parts.
     */

    setEdges(locations, orientations) {
         {
            this.transformType = this.UNKNOWN_TRANSFORM;
            this.edgeLoc=locations.slice(0,this.edgeLoc.length);
            this.edgeOrientations=this.edgeOrient.slice(0,this.edgeOrient.length);
        }
        this.fireCubeChanged(new CubeEvent(this, 0,0,0));
    }

    /**
     * Gets the edge part at the specified location.
     */

    getEdgeAt(location) {
        return this.edgeLoc[location];
    }

    /**
     * Gets the location of the specified edge part.
     */

    getEdgeLocation(edge) {
    var i;
    if (this.edgeLoc[edge] == edge) {
        return edge;
    }
    for (i = this.edgeLoc.length - 1; i >= 0; i--) {
        if (this.edgeLoc[i] == edge) {
            break;
        }
    }
    return i;
}

/**
 * Gets the orientation of the specified edge part.
 */

    getEdgeOrientation(edge) {
    return this.edgeOrient[this.getEdgeLocation(edge)];
}

/**
 * Returns the locations of all side parts.
 */

    getSideLocations() {
    return this.sideLoc;
}

/**
 * Returns the orientations of all side parts.
 */

    getSideOrientations() {
    return this.sideOrient;
}

/**
 * Sets the locations and orientations of all side parts.
 */

    setSides(locations, orientations) {
    {
        this.transformType = this.UNKNOWN_TRANSFORM;
        this.sideLoc=locations.slice(0,this.sideLoc.length);
        this.sideOrient=orientations.slice(0,this.sideOrient.length);
    }
    this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
}

/**
 * Gets the side part at the specified location.
 */

    getSideAt(location) {
    return this.sideLoc[location];
}

/**
 * Gets the face on which the sticker of the specified side part can
 * be seen.
 */
    getSideFace(sidePart) {
    return this.getSideLocation(sidePart) % 6;
}

/**
 * Gets the location of the specified side part.
 */
    getSideLocation(side) {
    var i;
    if (this.sideLoc[side] == side) {
        return side;
    }
    for (i = this.sideLoc.length - 1; i >= 0; i--) {
        if (this.sideLoc[i] == side) {
            break;
        }
    }
    return i;
}

/**
 * Gets the orientation of the specified side part.
 */
    getSideOrientation(side) {
    return this.sideOrient[this.getSideLocation(side)];
}

/**
 * Copies the permutation of the specified cube to this cube.
 *
 * @param tx The cube to be applied to this cube object.
 */
    setTo(that) {
    if (that.getLayerCount() != this.getLayerCount()) {
        throw ("that.layers=" + that.getLayerCount() + " must match this.layers=" + this.getLayerCount());
    }

    this.transformType = that.transformType;
    this.transformAxis = that.transformAxis;
    this.transformAngle = that.transformAngle;
    this.transformMask = that.transformMask;

    this.sideLoc=that.getSideLocations().slice(0,this.sideLoc.length);
    this.sideOrient=that.getSideOrientations().slice(0,this.sideOrient.length);
    this.edgeLoc=that.getEdgeLocations().slice(0,this.edgeLoc.length);
    this.edgeOrient=that.getEdgeOrientations().slice(0,this.edgeOrient.length);
    this.cornerLoc=that.getCornerLocations().slice(0,this.cornerLoc.length);
    this.cornerOrient=that.getCornerOrientations().slice(0,this.cornerOrient.length);
    this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
}

/**
 * Returns the number of layers on the x, y and z axis.
 */
    getLayerCount() {
    return this.layerCount;
}

/**
 * Transforms the cube and fires a cubeTwisted event. The actual work
 * is done in method transform0.
 *
 * @param  axis  0=x, 1=y, 2=z axis.
 * @param  layerMask A bitmask specifying the layers to be transformed.
 *           The size of the layer mask depends on the value returned by
 *           <code>getLayerCount(axis)</code>. For a 3x3x3 cube, the layer mask has the
 *           following meaning:
 *           7=rotate the whole cube;<br>
 *           1=twist slice near the axis (left, bottom, behind)<br>
 *           2=twist slice in the middle of the axis<br>
 *           4=twist slice far away from the axis (right, top, front)
 * @param  angle  positive values=clockwise rotation<br>
 *                negative values=counterclockwise rotation<br>
 *               1=90 degrees<br>
 *               2=180 degrees
 *
 * @see #getLayerCount()
 */
    transform(axis, layerMask, angle) {
    // Update transform type
    {
        switch (this.transformType) {
            case this.IDENTITY_TRANSFORM:
                this.transformAxis = axis;
                this.transformMask = layerMask;
                this.transformAngle = angle;
                this.transformType = this.SINGLE_AXIS_TRANSFORM;
                break;
            case this.SINGLE_AXIS_TRANSFORM:
                if (this.transformAxis == axis) {
                    if (this.transformAngle == angle) {
                        if (this.transformMask == layerMask) {
                            this.transformAngle = (this.transformAngle + angle) % 3;
                        } else if ((this.transformMask & layerMask) == 0) {
                            this.transformMask |= layerMask;
                        } else {
                            this.transformType = this.GENERAL_TRANSFORM;
                        }
                    } else {
                        if (this.transformMask == layerMask) {
                            this.transformAngle = (this.transformAngle + angle) % 3;
                        } else {
                            this.transformType = this.GENERAL_TRANSFORM;
                        }
                    }
                } else {
                    this.transformType = this.GENERAL_TRANSFORM;
                }
                break;
        }

        // Perform the transform
        this.transform0(axis, layerMask, angle);
    }

    // Inform listeners.
    if (!this.isQuiet()) {
        this.fireCubeTwisted(new CubeEvent(this, axis, layerMask, angle));
    }
}

/**
 * Transforms the cube and fires a cubeTwisted event.
 *
 * @param  axis  0=x, 1=y, 2=z axis.
 * @param  layerMask A bitmask specifying the layers to be transformed.
 *           The size of the layer mask depends on the value returned by
 *           <code>getLayerCount(axis)</code>. For a 3x3x3 cube, the layer mask has the
 *           following meaning:
 *           7=rotate the whole cube;<br>
 *           1=twist slice near the axis (left, bottom, behind)<br>
 *           2=twist slice in the middle of the axis<br>
 *           4=twist slice far away from the axis (right, top, front)
 * @param  angle  positive values=clockwise rotation<br>
 *                negative values=counterclockwise rotation<br>
 *               1=90 degrees<br>
 *               2=180 degrees
 *
 * @see #getLayerCount()
 */
// protected abstract void transform0(var axis, var layerMask, var angle);

/**
 * Applies the permutation of the specified cube to this cube and fires a
 * cubeChanged event.
 *
 * @param tx The cube to be used to transform this cube object.
 * @exception InvalidArgumentException, if one or more of the values returned
 * by <code>tx.getLayourCount(axis)</code> are different from this cube.
 *
 * @see #getLayerCount()
 */

    transformFromCube(tx) {
    if (tx.getLayerCount() != this.getLayerCount()) {
        throw ("tx.layers=" + tx.getLayerCount() + " must match this.layers=" + this.getLayerCount());
    }

    

    var taxis = 0, tangle = 0, tmask = 0;
     {
         {
            {
                var atx = tx;
                switch (atx.transformType) {
                    case this.IDENTITY_TRANSFORM:
                        return; // nothing to do
                    case SINGLE_AXIS_TRANSFORM:
                        taxis = atx.transformAxis;
                        tangle = atx.transformAngle;
                        tmask = atx.transformMask;
                        break;
                }
            }

            if (tmask == 0) {
                this.transformType = this.UNKNOWN_TRANSFORM;
                var tempLoc;
                var tempOrient;

                tempLoc = this.cornerLoc.slice(0);
                tempOrient = this.cornerOrient.slice(0);
                var txLoc = tx.getCornerLocations();
                var txOrient = tx.getCornerOrientations();
                for (var i = 0; i < txLoc.length; i++) {
                    this.cornerLoc[i] = tempLoc[txLoc[i]];
                    this.cornerOrient[i] = (tempOrient[txLoc[i]] + txOrient[i]) % 3;
                }

                tempLoc = this.edgeLoc.slice(0);
                tempOrient = this.edgeOrient.slice(0);
                txLoc = tx.getEdgeLocations();
                txOrient = tx.getEdgeOrientations();
                for (var i = 0; i < txLoc.length; i++) {
                    this.edgeLoc[i] = tempLoc[txLoc[i]];
                    this.edgeOrient[i] = (tempOrient[txLoc[i]] + txOrient[i]) % 2;
                }

                tempLoc = this.sideLoc.slice(0);
                tempOrient = this.sideOrient.slice(0);
                txLoc = tx.getSideLocations();
                txOrient = tx.getSideOrientations();
                for (var i = 0; i < txLoc.length; i++) {
                    this.sideLoc[i] = tempLoc[txLoc[i]];
                    this.sideOrient[i] = (tempOrient[txLoc[i]] + txOrient[i]) % 4;
                }
            }
        }
    }
    if (tmask == 0) {
        this.fireCubeChanged(new CubeEvent(this, 0, 0, 0));
    } else {
        this.transform(taxis, tmask, tangle);
    }
}

/**
 * Performs a two cycle permutation and orientation change.
 */
    twoCycle(
        loc, l1, l2,
        orient, o1, o2,
        modulo) {
    var swap;

    swap = loc[l1];
    loc[l1] = loc[l2];
    loc[l2] = swap;

    swap = orient[l1];
    orient[l1] = (orient[l2] + o1) % modulo;
    orient[l2] = (swap + o2) % modulo;
}

/**
 * Performs a four cycle permutation and orientation change.
 */
    fourCycle(
         loc,  l1,  l2,  l3,  l4,
         orient,  o1,  o2,  o3,  o4,
         modulo) {
    var swap;

    swap = loc[l1];
    loc[l1] = loc[l2];
    loc[l2] = loc[l3];
    loc[l3] = loc[l4];
    loc[l4] = swap;

    swap = orient[l1];
    orient[l1] = (orient[l2] + o1) % modulo;
    orient[l2] = (orient[l3] + o2) % modulo;
    orient[l3] = (orient[l4] + o3) % modulo;
    orient[l4] = (swap + o4) % modulo;
}

/**
 * Returns the face at which the indicated orientation
 * of the part is located.
 */
    getPartFace( part,  orient) {
    {
        if (part < this.cornerLoc.length) {
            return getCornerFace(part, orient);
        } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
            return getEdgeFace(part - this.cornerLoc.length, orient);
        } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
            return getSideFace(part - this.cornerLoc.length - this.edgeLoc.length);
        } else {
            return getCenterSide(orient);
        }
    }
}

/**
 * Returns the orientation of the specified part.
 */
    getPartOrientation( part) {
    if (part < this.cornerLoc.length) {
        return this.getCornerOrientation(part);
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        return this.getEdgeOrientation(part - this.cornerLoc.length);
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        return this.getSideOrientation(part - this.cornerLoc.length - this.edgeLoc.length);
    } else {
        return this.getCubeOrientation();
    }
}

/**
 * Returns the location of the specified part.
 */
    getPartLocation( part) {
    if (part < this.cornerLoc.length) {
        return this.getCornerLocation(part);
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        return this.cornerLoc.length + this.getEdgeLocation(part - this.cornerLoc.length);
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        return this.cornerLoc.length + this.edgeLoc.length + this.getSideLocation(part - this.cornerLoc.length - this.edgeLoc.length);
    } else {
        return 0;
    }
}

/**
 * Returns the current axis on which the orientation of the part lies.
 * Returns -1 if the part lies on none or multiple axis (the center part).
 */
    getPartAxis( part,  orientation) {
    if (part < this.cornerLoc.length) {
        // Corner parts
        var face = getPartFace(part, orientation);
        return (face) % 3;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        // Edge parts
        return EDGE_TO_AXIS_MAP[getEdgeLocation(part - this.cornerLoc.length) % 12];
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        // Side parts
        var face = getPartFace(part, orientation);
        return (face) % 3;
    } else {
        return -1;
    }
}

/**
 * Returns the angle which is clockwise for the specified part orientation.
 * Returns 1 or -1.
 * Returns 0 if the direction can not be determined (the center part).
 */

    getPartAngle( part,  orientation) {
    if (part >= this.cornerLoc.length && part < this.cornerLoc.length + this.edgeLoc.length) {
        // Edge parts
        return EDGE_TO_ANGLE_MAP[getEdgeLocation(part - this.cornerLoc.length) % 12][(getEdgeOrientation(part - this.cornerLoc.length) + orientation) % 2];
    } else {
        // Corner parts and Side parts
        var side = getPartFace(part, orientation);
        switch (side) {
            case 0:
            case 1:
            case 2:
                return 1;
            case 3:
            case 4:
            case 5:
            default:
                return -1;
        }
    }
}

/**
 * Returns the current layer mask on which the orientation of the part lies.
 * Returns 0 if no mask can be determined (the center part).
 */

// public abstract var getPartLayerMask(var part, var orientation);

/**
 * Returns the type of the specified part.
 */

    getPartType(part) {
    if (part < this.cornerLoc.length) {
        return this.CORNER_PART;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        return this.EDGE_PART;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        return this.SIDE_PART;
    } else {
        return this.CENTER_PART;
    }
}

/**
 * Returns the location of the specified part.
 */
    getPartAt(location) {
    if (location < this.cornerLoc.length) {
        return this.getCornerAt(location);
    } else if (location < this.cornerLoc.length + this.edgeLoc.length) {
        return this.cornerLoc.length + this.getEdgeAt(location - this.cornerLoc.length);
    } else if (location < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        return this.cornerLoc.length + this.edgeLoc.length + this.getSideAt(location - this.cornerLoc.length - this.edgeLoc.length);
    } else {
        return this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length;
    }
}

/**
 * Returns the typed (part) index for a part index.
 * The typed index is the index which points into this.edgeLoc,.edgeOrient,
 * .cornerLoc,.cornerOrient,.sideLoc,.sideOrient respectively.
 */
    getTypedIndexForPartIndex(part) {
    if (part < this.cornerLoc.length) {
        return part;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
        return part - this.cornerLoc.length;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
        return part - this.cornerLoc.length - this.edgeLoc.length;
    } else {
        return part - this.cornerLoc.length - this.edgeLoc.length - this.sideLoc.length;
    }
}

/**
 * Returns the side at which the indicated orientation
 * of the center part is located.
 *
 * @return The side. A value ranging from 0 to 5.
 * <code><pre>
 *     +---+
 *     | 5 |
 * +---+---+---+---+
 * | 4 | 0 | 1 | 3 |
 * +---+---+---+---+
 *     | 2 |
 *     +---+
 * </pre></code>
 */
    getCenterSide(orient) {
    return this.CENTER_TO_SIDE_MAP[getCubeOrientation()][orient];
}

    /**
     * Returns the face an which the sticker at the specified orientation
     * of the edge can be seen.
     */
    getEdgeFace(edge, orient) {
        var loc = getEdgeLocation(edge) % 12;
        var ori = (this.edgeOrient[loc] + orient) % 2;

        return this.EDGE_TO_FACE_MAP[loc][ori];
    }

    /**
     * Returns the face on which the sticker at the specified orientation
     * of the corner can be seen.
     */
    getCornerFace(corner, orient) {
        var loc = getCornerLocation(corner);
        var ori = (3 + orient - this.cornerOrient[loc]) % 3;
        return this.CORNER_TO_FACE_MAP[loc][ori];
    }

    /**
     * Returns the orientation of the whole cube.
     * @return The orientation of the cube, or -1 if
     * the orientation can not be determined.
     */

    getCubeOrientation() {
        // The cube has no orientation, if it has no side parts.
        if (this.sideLoc.length == 0) {
            return -1;
        }

        // The location of the front side and the right
        // side are used to determine the orientation
        // of the cube.
        switch (this.sideLoc[2] * 6 + this.sideLoc[0]) {
            case 2 * 6 + 0:
                return 0; // Front at front, Right at right
            case 4 * 6 + 0:
                return 1; // Front at Bottom, Right at right, CR
            case 5 * 6 + 0:
                return 2; // Back, Right, CR2
            case 1 * 6 + 0:
                return 3; // Top, Right, CR'
            case 0 * 6 + 5:
                return 4; // Right, Back, CU
            case 5 * 6 + 3:
                return 5; // Back, Left, CU2
            case 3 * 6 + 2:
                return 6; // Left, Front, CU'
            case 2 * 6 + 1:
                return 7; // Front, Top, CF
            case 2 * 6 + 3:
                return 8; // Front, Left, CF2
            case 2 * 6 + 4:
                return 9; // Front, Bottom, CF'
            case 0 * 6 + 1:
                return 10; // Right, Top, CR CU
            case 1 * 6 + 3:
                return 11; // Top, Left, CR CU2
            case 3 * 6 + 4:
                return 12; // Left, Down, CR CU'
            case 0 * 6 + 2:
                return 13; // Right, Front, CR2 CU
            case 3 * 6 + 5:
                return 14; // Left, Back, CR2 CU'
            case 0 * 6 + 4:
                return 15; // Right, Down, CR' CU
            case 4 * 6 + 3:
                return 16; // Down, Left, CR' CU2
            case 3 * 6 + 1:
                return 17; // Left, Up, CR' CU'
            case 4 * 6 + 1:
                return 18; // Down, Up, CR CF
            case 4 * 6 + 5:
                return 19; // Down, Back, CR CF'
            case 5 * 6 + 4:
                return 20; // Back, Down, CR2 CF
            case 5 * 6 + 1:
                return 21; // Back, Up, CR2 CF'
            case 1 * 6 + 5:
                return 22; // Up, Back, CR' CF
            case 1 * 6 + 2:
                return 23; // Up, Front, CR' CF'
            default:
                return -1;
        }
    }



    getPartCount() {
    return getCornerCount() + getEdgeCount() + getSideCount() + 1;
}

    /**
     * Returns an array of part ID's, for each part in this cube,
     * which is not at its initial location or has not its initial
     * orientation.
     */

    getUnsolvedParts() {
    var a = new Array(this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length);
    var count = 0;
    for (var i = 0; i < this.cornerLoc.length; i++) {
        if (this.cornerLoc[i] != i || this.cornerOrient[i] != 0) {
            a[count++] = i;
        }
    }
    for (var i = 0; i < this.edgeLoc.length; i++) {
        if (this.edgeLoc[i] != i || this.edgeOrient[i] != 0) {
            a[count++] = i + this.cornerLoc.length;
        }
    }
    for (var i = 0; i < this.sideLoc.length; i++) {
        if (this.sideLoc[i] != i || this.sideOrient[i] != 0) {
            a[count++] = i + this.cornerLoc.length + this.edgeLoc.length;
        }
    }
    var result = new Array(count);
    result=a.slice(0,count);
    return result;
}

/** Scrambles the cube. */
    scramble(scrambleCount) {
  if (scrambleCount==null) scrambleCount=21;
  
  this.setQuiet(true);
  
  // Keep track of previous axis, to avoid two subsequent moves on
  // the same axis.
  var prevAxis = -1;
  var axis, layerMask, angle;
  for (var i = 0; i < scrambleCount; i++) {
    while ((axis = Math.floor(Math.random()*3)) == prevAxis) {}
    prevAxis = axis;
//    while ((layerMask = Math.floor(Math.random()*(1 << this.layerCount))) == 0) {}
    layerMask = 1<<Math.floor(Math.random()*this.layerCount);
    console.log(layerMask);
    while ((angle = Math.floor(Math.random()*5) - 2) == 0) {}
    this.transform(axis, layerMask, angle);
  }

  this.setQuiet(false);
}

    toPermutationString() {
        return this.toPermutationString0('PRECIRCUMFIX',
                "r", "u", "f", "l", "d", "b",
                "+", "++", "-",
                "(", ")", ",");
    }

    toPermutationString0(
            syntax,
            tR, tU, tF,
            tL, tD, tB,
            tPlus, tPlusPlus, tMinus,
            tBegin, tEnd, tDelimiter) {

  var cube=this;
        var buf = '';

        var corners = this.toCornerPermutationString( syntax,
                tR, tU, tF, tL, tD, tB,
                tPlus, tPlusPlus, tMinus,
                tBegin, tEnd, tDelimiter);
        var edges = this.toEdgePermutationString( syntax,
                tR, tU, tF, tL, tD, tB,
                tPlus, tPlusPlus, tMinus,
                tBegin, tEnd, tDelimiter);
        var sides = this.toSidePermutationString( syntax,
                tR, tU, tF, tL, tD, tB,
                tPlus, tPlusPlus, tMinus,
                tBegin, tEnd, tDelimiter);

        buf=buf+corners;
        if (buf.length > 0 && edges.length > 0) {
            buf+='\n';
        }
        buf=buf+edges;
        if (buf.length > 0 && sides.length > 0) {
            buf+='\n';
        }
        buf=buf+sides;
        if (buf.length == 0) {
            buf=buf+tBegin;
            buf=buf+tEnd;
        }
        return buf;
    }
    toCornerPermutationString(syntax,
            tR, tU, tF,
            tL, tD, tB,
            tPlus, tPlusPlus, tMinus,
            tBegin, tEnd, tDelimiter) {

        var cube=this;
        var cornerLoc = cube.cornerLoc;
        var edgeLoc = cube.edgeLoc;
        var sideLoc = cube.sideLoc;
        var cornerOrient = cube.cornerOrient;
        var edgeOrient = cube.edgeOrient;
        var sideOrient = cube.sideOrient;
        var cycle = Array(Math.max(Math.max(cube.getCornerCount(), cube.getEdgeCount()), cube.getSideCount()));
        var layerCount = cube.getLayerCount();
        var hasEvenLayerCount = layerCount % 2 == 0;

        var buf = '';
        var visitedLocs=Array();

        var i, j, k, l, p, n;

        var prevOrient;
        var isFirst;

        // describe the state changes of the corner parts
        var corners = [
            [tU, tR, tF],// urf
            [tD, tF, tR],// dfr
            [tU, tB, tR],// ubr
            [tD, tR, tB],// drb
            [tU, tL, tB],// ulb
            [tD, tB, tL],// dbl
            [tU, tF, tL],// ufl
            [tD, tL, tF]// dlf
        ];

        visitedLocs = new Array(cube.getCornerCount());
        isFirst = true;
        for (i = 0, n = cube.getCornerCount(); i < n; i++) {
            if (!visitedLocs[i]) {
                if (cornerLoc[i] == i && cornerOrient[i] == 0) {
                    continue;
                }

                // gather a permutation cycle
                var cycleLength = 0;
                var cycleStart = 0;
                j = i;
                while (!visitedLocs[j]) {
                    visitedLocs[j] = true;
                    cycle[cycleLength++] = j;
                    if (cornerLoc[j] < cornerLoc[cycle[cycleStart]]) {
                        cycleStart = cycleLength - 1;
                    }
                    for (k = 0; cornerLoc[k] != j; k++) {
                    }
                    j = k;
                }

                // print the permutation cycle
                if (isFirst) {
                    isFirst = false;
                } else {
                    buf+=' ';
                }
                if (syntax == 'PREFIX') {
                    // the sign of the cycle will be inserted before the opening bracket
                    p = buf.length;
                    buf=buf+tBegin;
                } else if (syntax == 'PRECIRCUMFIX') {
                    // the sign of the cycle will be inserted after the opening bracket
                    buf=buf+tBegin;
                    p = buf.length;
                } else {
                    buf=buf+tBegin;
                    p = -1;
                }

                prevOrient = 0;
                for (k = 0; k < cycleLength; k++) {
                    j = cycle[(cycleStart + k) % cycleLength];
                    if (k != 0) {
                        buf=buf+tDelimiter;
                        prevOrient = (prevOrient + cornerOrient[j]) % 3;
                    }
                    switch (prevOrient) {
                        case 0:
                            buf+=corners[j][0];
                            buf+=corners[j][1];
                            buf+=corners[j][2];
                            break;
                        case 2:
                            buf+=corners[j][1];
                            buf+=corners[j][2];
                            buf+=corners[j][0];
                            break;
                        case 1:
                            buf+=corners[j][2];
                            buf+=corners[j][0];
                            buf+=corners[j][1];
                            break;
                    }
                }
                j = cycle[cycleStart];
                prevOrient = (prevOrient + cornerOrient[j]) % 3;
                if (syntax == 'POSTCIRCUMFIX') {
                    // the sign of the cycle will be inserted before the closing bracket
                    p = buf.length;
                    buf+=tEnd;
                } else if (syntax == 'SUFFIX') {
                    // the sign of the cycle will be inserted after the closing bracket
                    buf+=tEnd;
                    p = buf.length;
                } else {
                    buf+=tEnd;
                }
                // insert cycle sign
                if (prevOrient != 0) {
                    buf=buf.substring(0,p)+ ((prevOrient == 1) ? tMinus : tPlus)+buf.substring(p);
                }
            }
        }
        return buf;
    }
    
    toEdgePermutationString( syntax,
             tR,  tU,  tF,
             tL,  tD,  tB,
             tPlus,  tPlusPlus,  tMinus,
             tBegin,  tEnd, tDelimiter) {

  var cube=this;
        var cornerLoc = cube.getCornerLocations();
        var edgeLoc = cube.getEdgeLocations();
        var sideLoc = cube.getSideLocations();
        var cornerOrient = cube.getCornerOrientations();
        var edgeOrient = cube.getEdgeOrientations();
        var sideOrient = cube.getSideOrientations();
        var cycle = Array(Math.max(Math.max(cube.getCornerCount(), cube.getEdgeCount()), cube.getSideCount()));
        var layerCount = cube.getLayerCount();
        var hasEvenLayerCount = layerCount % 2 == 0;

        var buf = '';
        var visitedLocs = Array();

        var i, j, k, l, p, n;
        var prevOrient;
        var isFirst;

        // describe the state changes of the edge parts
        if (edgeLoc.length > 0) {
            var edges = [
                [tU, tR], //"ur"
                [tR, tF], //"rf"
                [tD, tR], //"dr"
                [tB, tU], //"bu"
                [tR, tB], //"rb"
                [tB, tD], //"bd"
                [tU, tL], //"ul"
                [tL, tB], //"lb"
                [tD, tL], //"dl"
                [tF, tU], //"fu"
                [tL, tF], //"lf"
                [tF, tD] //"fd"
            ];
            visitedLocs = new Array(cube.getEdgeCount());
            isFirst = true;
            var previousCycleStartEdge = -1;
            for (i = 0, n = cube.getEdgeCount(); i < n; i++) {
                if (!visitedLocs[i]) {
                    if (edgeLoc[i] == i && edgeOrient[i] == 0) {
                        continue;
                    }

                    // gather a permutation cycle
                    var cycleLength = 0;
                    var cycleStart = 0;
                    j = i;
                    while (!visitedLocs[j]) {
                        visitedLocs[j] = true;
                        cycle[cycleLength++] = j;
                        if (previousCycleStartEdge == j % 12) {
                            cycleStart = cycleLength - 1;
                        }
                        for (k = 0; edgeLoc[k] != j; k++) {
                        }
                        j = k;
                    }
                    previousCycleStartEdge = cycle[cycleStart] % 12;

                    // print the permutation cycle
                    if (isFirst) {
                        isFirst = false;
                    } else {
                        buf+=' ';
                    }

                    if (syntax == 'PREFIX') {
                        // the sign of the cycle will be inserted before the opening bracket
                        p = buf.length;
                        buf+=(tBegin);
                    } else if (syntax == 'PRECIRCUMFIX') {
                        // the sign of the cycle will be inserted after the opening bracket
                        buf+=(tBegin);
                        p = buf.length;
                    } else {
                        buf+=(tBegin);
                        p = -1;
                    }

                    prevOrient = 0;
                    for (k = 0; k < cycleLength; k++) {
                        j = cycle[(cycleStart + k) % cycleLength];
                        if (k != 0) {
                            buf+=(tDelimiter);
                            prevOrient ^= edgeOrient[j];
                        }
                        if (prevOrient == 1) {
                            buf+=(edges[j % 12][1]);
                            buf+=(edges[j % 12][0]);
                        } else {
                            buf+=(edges[j % 12][0]);
                            buf+=(edges[j % 12][1]);
                        }
                        if (hasEvenLayerCount) {
                            buf+=(j / 12 + 1);
                        } else {
                            if (j >= 12) {
                                buf+=(j / 12);
                            }
                        }
                    }
                    j = cycle[cycleStart];
                    if (syntax == 'POSTCIRCUMFIX') {
                        // the sign of the cycle will be inserted before the closing bracket
                        p = buf.length;
                        buf+=(tEnd);
                    } else if (syntax == 'SUFFIX') {
                        // the sign of the cycle will be inserted after the closing bracket
                        buf+=(tEnd);
                        p = buf.length;
                    } else {
                        buf+=(tEnd);
                    }
                    // insert cycle sign
                    if ((prevOrient ^ edgeOrient[j]) == 1) {
                        buf=buf.substring(0,p)+ tPlus + buf.substring(p);
                    }
                }
            }
        }

        return buf;
    }

    toSidePermutationString( syntax,
             tR,  tU,  tF,
             tL,  tD,  tB,
             tPlus,  tPlusPlus,  tMinus,
             tBegin,  tEnd,  tDelimiter) {

  var cube=this;
        var cornerLoc = cube.getCornerLocations();
       var edgeLoc = cube.getEdgeLocations();
        var sideLoc = cube.getSideLocations();
        var cornerOrient = cube.getCornerOrientations();
        var edgeOrient = cube.getEdgeOrientations();
        var sideOrient = cube.getSideOrientations();
        var cycle = new Array(Math.max(Math.max(cube.getCornerCount(), cube.getEdgeCount()), cube.getSideCount()));
        var layerCount = cube.getLayerCount();
        var hasEvenLayerCount = layerCount % 2 == 0;

        var buf = '';
        var visitedLocs;

        var i, j, k, l, p, n;
        var prevOrient;
        var isFirst;

        if (sideLoc.length > 0) { // describe the state changes of the side parts
            var sides = [
                tR, tU, tF, tL, tD, tB // r u f l d b
            ];
            var sideOrients = [
                "", tMinus, tPlusPlus, tPlus
            ];
            visitedLocs = new Array(cube.getSideCount());
            isFirst = true;
            var previousCycleStartSide;

            // First Pass: Only print permutation cycles which lie on a single
            // face of the cube. 
            // Second pass: Only print permutation cycles which don't lie on
            // a singe fass of the cube.
            for (var twoPass = 0; twoPass < 2; twoPass++) {
                for (i=0;i<visitedLocs.length;i++) visitedLocs[i]=false;
                for (var byFaces = 0, nf = 6; byFaces < nf; byFaces++) {
                    previousCycleStartSide = -1;
                    for (var byParts = 0, np = cube.getSideCount() / 6; byParts < np; byParts++) {
                        i = byParts + byFaces * np;
                        if (!visitedLocs[i]) {
                            if (sideLoc[i] == i && sideOrient[i] == 0) {
                                continue;
                            }

                            // gather a permutation cycle
                            var cycleLength = 0;
                            var cycleStart = 0;
                            var isOnSingleFace = true;
                            j = i;
                            while (!visitedLocs[j]) {
                                visitedLocs[j] = true;
                                cycle[cycleLength++] = j;
                                if (j % 6 != i % 6) {
                                    isOnSingleFace = false;
                                }
                                if (cycle[cycleStart] > j) {
                                    cycleStart = cycleLength - 1;
                                }
                                for (k = 0; sideLoc[k] != j; k++) {
                                }
                                j = k;
                            }
                            previousCycleStartSide = cycle[cycleStart] % 6;

                            if (isOnSingleFace == (twoPass == 0)) {

                                // print the permutation cycle
                                if (isFirst) {
                                    isFirst = false;
                                } else {
                                    buf+=(' ');
                                }
                                if (syntax == 'PREFIX') {
                                    // the sign of the cycle will be inserted before the opening bracket
                                    p = buf.length;
                                    buf+=(tBegin);
                                } else if (syntax == 'PRECIRCUMFIX') {
                                    // the sign of the cycle will be inserted after the opening bracket
                                    buf+=(tBegin);
                                    p = buf.length;
                                } else {
                                    buf+=(tBegin);
                                    p = -1;
                                }

                                prevOrient = 0;
                                for (k = 0; k < cycleLength; k++) {
                                    j = cycle[(cycleStart + k) % cycleLength];
                                    if (k != 0) {
                                        buf+=(tDelimiter);
                                        prevOrient = (prevOrient + sideOrient[j]) % 4;
                                    }
                                    if (syntax == 'PREFIX'
                                            || syntax == 'PRECIRCUMFIX'
                                            || syntax == 'POSTCIRCUMFIX') {
                                        buf+=(sideOrients[prevOrient]);
                                    }
                                    buf+=(sides[j % 6]);
                                    if (syntax == 'SUFFIX') {
                                        buf+=(sideOrients[prevOrient]);
                                    }
                                    if (hasEvenLayerCount) {
                                        buf+=(j / 6 + 1);
                                    } else {
                                        if (j >= 6) {
                                            buf+=(j / 6);
                                        }
                                    }
                                }
                                j = cycle[cycleStart];
                                prevOrient = (prevOrient + sideOrient[j]) % 4;
                                if (syntax == 'POSTCIRCUMFIX') {
                                    // the sign of the cycle will be inserted before the closing bracket
                                    p = buf.length;
                                    buf+=(tEnd);
                                } else if (syntax == 'SUFFIX') {
                                    // the sign of the cycle will be inserted after the closing bracket
                                    buf+=(tEnd);
                                    p = buf.length;
                                } else {
                                    buf+=(tEnd);
                                }
                                // insert cycle sign
                                if (prevOrient != 0) {
                                    buf=buf.substring(0,p)+(sideOrients[prevOrient])+buf.substring(p);
                                }
                            }
                        }
                    }
                }
            }
        }
        return buf;
    }
}

    /** Identifier for the corner part type. */
    Cube.prototype.CORNER_PART = 0;
    /** Identifier for the edge part type. */
    Cube.prototype.EDGE_PART = 1;
    /** Identifier for the side part type. */
    Cube.prototype.SIDE_PART = 2;
    /** Identifier for the center part type. */
    Cube.prototype.CENTER_PART = 3;
    /**
     * Holds the number of corner parts, which is 8.
     */
    Cube.prototype.NUMBER_OF_CORNER_PARTS = 8;
    /**
     * Listener support.
     */
    Cube.prototype.listenerList = [];
    /**
     * Set this to true if listeners shall not be notified
     * about state changes.
     */
    Cube.prototype.quiet=false;
    /**
     * Number of layers on the x, y and z axis.
     */
    Cube.prototype.layerCount;
    /**
     * This array holds the locations of the corner parts.
     * <p>
     * The value of an array element represents the ID of a corner part. The 
     * value must be element of {0..7}. 
     * <p>
     * Each array element has a unique value.
     * <p>
     * Initially each corner part with ID i is located at Cube.prototype.cornerLoc[i].
     */
    Cube.prototype.cornerLoc=[];
    /**
     * This array holds the orientations of the corner parts.
     * <p>
     * The value of an array element represents the orientation of a corner part.
     * The value must be element of {0, 1, 2}.
     * <ul>
     * <li>0 = initial orientation</li>
     * <li>1 = tilted counterclockwise</li>
     * <li>2 = tilted clockwise</li>
     * </ul>
     * <p>
     * Multiple array elements can have the same value.
     * <p>
     * Initially each corner part is oriented at orientation 0.
     */
    Cube.prototype.cornerOrient=[];
    /**
     * This array holds the locations of the edge parts.
     * <p>
     * The value of an array element represents the ID of an edge part. The 
     * value must be element of {0..(n-1)}. Whereas n is the number of edge
     * parts.
     * <p>
     * Each array element has a unique value.
     * <p>
     * Initially each edge part with ID i is located at Cube.prototype.edgeLoc[i].
     */
    Cube.prototype.edgeLoc=[];
    /**
     * This array holds the orientations of the edge parts.
     * <p>
     * The value of an array element represents the orientation of an edge part.
     * The value must be element of {0, 1}.
     * <ul>
     * <li>0 = initial orientation</li>
     * <li>1 = flipped</li>
     * </ul>
     * <p>
     * Multiple array elements can have the same value.
     * <p>
     * Initially each edge part is oriented at orientation 0.
     */
    Cube.prototype.edgeOrient=[];
    /**
     * This array holds the locations of the side parts.
     * <p>
     * The value of an array element represents the ID of a side part. The 
     * value must be element of {0..(n-1)}. Whereas n is the number of side
     * parts.
     * <p>
     * Each array element has a unique value.
     * <p>
     * Initially each side part with ID i is located at Cube.prototype.sideLoc[i].
     */
    Cube.prototype.sideLoc=[];
    /**
     * This array holds the orientations of the side parts.
     * <p>
     * The value of an array element represents the orientation of a side part.
     * The value must be element of {0, 1, 2, 4}.
     * <ul>
     * <li>0 = initial orientation</li>
     * <li>1 = tilted counterclockwise</li>
     * <li>2 = flipped</li>
     * <li>3 = tilted clockwise</li>
     * </ul>
     * <p>
     * Multiple array elements can have the same value.
     * <p>
     * Initially each side part is oriented at orientation 0.
     */
    Cube.prototype.sideOrient=[];

    /** Transformation types of the cube. */
    Cube.prototype.IDENTITY_TRANSFORM=0;
    Cube.prototype.SINGLE_AXIS_TRANSFORM=1;
    Cube.prototype.GENERAL_TRANSFORM=2;
    Cube.prototype.UNKNOWN_TRANSFORM=3;
    /**
     * This field caches the current transformation type of the cube.
     */
    Cube.prototype.transformType = 0;//=Cube.prototype.IDENTITY_TRANSFORM;
    /** If Cube.prototype.transformType is SINGLE_AXIS_TRANSFORM, this field holds the
     * transformation axis. Otherwise, the value of this field is undefined.
     */
    Cube.prototype.transformAxis=0;
    /** If Cube.prototype.transformType is SINGLE_AXIS_TRANSFORM, this field holds the
     * transformation angle. Otherwise, the value of this field is undefined.
     */
    Cube.prototype.transformAngle=0;
    /** If Cube.prototype.transformType is SINGLE_AXIS_TRANSFORM, this field holds the
     * transformation mask. Otherwise, the value of this field is undefined.
     */
    Cube.prototype.transformMask=0;
    /**
     * This array maps corner parts to the six faces of the cube.
     * <p>
     * The first dimension of the array represents the locations, the
     * second dimension the orientations. The values represent the 6 faces:
     * 0=right, 1=up, 2=front, 3=left, 4=down, 5=back.
     */
    Cube.prototype.CORNER_TO_FACE_MAP = [
        [1, 0, 2], // urf
        [4, 2, 0], // dfr
        [1, 5, 0], // ubr
        [4, 0, 5], // drb
        [1, 3, 5], // ulb
        [4, 5, 3], // dbl
        [1, 2, 3], // ufl
        [4, 3, 2], // dlf
    ];
    /**
     * This array maps edge parts to the three axes of the cube.
     * <p>
     * The index represents the ID of an edge.
     * The values represent the 3 axes 0=x, 1=y and 2=z.
     */
    Cube.prototype.EDGE_TO_AXIS_MAP = [
        2, // edge 0
        1, //      1
        2, //      2
        0, //      3
        1,
        0,
        2,
        1,
        2,
        0,
        1,
        0
    ];
    /**
     * This array maps edge parts to rotation angles over the three axes of the
     * cube.
     * <p>
     * The index for the first dimension represents the location,
     * the index for the second dimension the orientation.
     * The value 1 represents clockwise angle, -1 represents 
     * counterclockwise angle.
     */
    Cube.prototype.EDGE_TO_ANGLE_MAP = [
        [1, -1], // edge 0 ur
        [1, -1], //      1 rf
        [-1, 1], //      2 dr
        [-1, 1], //      3 bu
        [-1, 1], //      4 rb
        [1, -1], //      5 bd
        [-1, 1], //      6 ul
        [1, -1], //      7 lb
        [1, -1], //      8 dl
        [1, -1], //      9 fu
        [-1, 1], //     10 lf
        [-1, 1] //     11 fd
    ];
    /**
     * This array maps edge parts to the 6 faces of the cube.
     * <p>
     * The index for the first dimension represents the location,
     * the index for the second dimension the orientation.
     * The values represent the 6 faces:
     * 0=right, 1=up, 2=front, 3=left, 4=down, 5=back.
     */
    Cube.prototype.EDGE_TO_FACE_MAP = [
        [1, 0], // edge 0 ur
        [0, 2], //      1 rf
        [4, 0], //      2 dr
        [5, 1], //      3 bu
        [0, 5], //      4 rb
        [5, 0], //      5 bd
        [1, 3], //      6 ul
        [3, 5], //      7 lb
        [4, 3], //      8 dl
        [2, 1], //      9 fu
        [3, 2], //     10 lf
        [2, 4] //     11 fd
    ];
    /**
     * This is used for mapping center part orientations
     * to the 6 sides of the cube.
     * <p>
     * The index for the first dimension represents the location,
     * the index for the second dimension the orientation.
     * The values represent the 6 sides.
     */
    Cube.prototype.CENTER_TO_SIDE_MAP = [
        //[f, r, d, b, l, u ]
        [0, 1, 2, 3, 4, 5] // 0: Front at front, Right at right
        , [5, 1, 0, 2, 4, 3]// 1: Bottom, Right, CR
        , [3, 1, 5, 0, 4, 2]// 2: Back, Right, CR2
        , [2, 1, 3, 5, 4, 0]// 3: Top, Right, CR'
        , [4, 0, 2, 1, 3, 5]// 4: Right, Back, CU
        , [3, 4, 2, 0, 1, 5]// 5: Back, Left, CU2
        , [1, 3, 2, 4, 0, 5] // 6: // Left, Front, CU'
        , [0, 2, 4, 3, 5, 1] // 7: // Front, Top, CF
        , [0, 4, 5, 3, 1, 2] // 8: // Front, Left, CF2
        , [0, 5, 1, 3, 2, 4] // 9: // Front, Bottom, CF'
        , [5, 0, 4, 2, 3, 1] // 10: // Right, Top, CR CU
        , [5, 4, 3, 2, 1, 0] // 11: // Top, Left, CR CU2
        , [5, 3, 1, 2, 0, 4] // 12: // Left, Down, CR CU'
        , [1, 0, 5, 4, 3, 2] // 13: // Right, Front, CR2 CU
        , [4, 3, 5, 1, 0, 2] // 14: // Left, Back, CR2 CU'
        , [2, 0, 1, 5, 3, 4] // 15: // Right, Down, CR' CU
        , [2, 4, 0, 5, 1, 3] // 16: // Down, Left, CR' CU2
        , [2, 3, 4, 5, 0, 1] // 17: // Left, Up, CR' CU'
        , [1, 2, 0, 4, 5, 3] // 18: // Down, Up, CR CF
        , [4, 5, 0, 1, 2, 3] // 19: // Down, Back, CR CF'
        , [3, 2, 1, 0, 5, 4] // 20: // Back, Down, CR2 CF
        , [3, 5, 4, 0, 2, 1] // 21: // Back, Up, CR2 CF'
        , [4, 2, 3, 1, 5, 0] // 22: // Up, Back, CR' CF
        , [1, 5, 3, 4, 2, 0] // 23: // Up, Front, CR' CF'
    //[f, r, d, b, l, u ]
    ];
    /* Corner swipe table.
     * First dimension: side part index.
     * Second dimension: orientation.
     * Third dimension: swipe direction
     * Fourth dimension: axis,layermask,angle
     * <pre>
     *             +---+---+---+
     *             |4.0|   |2.0|
     *             +---     ---+
     *             |     1     |
     *             +---     ---+
     *             |6.0|   |0.0|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
     * +---     ---+---     ---+---    +---+---     ---+
     * |     3     |     2     |     0     |     5     |
     * +---     ---+---     ---+---    +---+---     ---+
     * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
     * +---+---+---+---+---+---+---+---+---+---+---+---+
     *             |7.0|   |1.0|
     *             +---     ---+
     *             |     4     |
     *             +---     ---+
     *             |5.0|   |3.0|
     *             +---+---+---+
     * </pre>*/
    Cube.prototype.CORNER_SWIPE_TABLE = [
        [// 0 urf
            [//u
                [2, 4, 1], // axis, layerMask, angle
                [0, 4, -1],
                [2, 4, -1],
                [0, 4, 1]
            ],
            [//r
                [1, 4, 1],
                [2, 4, -1],
                [1, 4, -1],
                [2, 4, 1]
            ],
            [//f
                [0, 4, -1],
                [1, 4, 1],
                [0, 4, 1],
                [1, 4, -1]
            ]
        ], [// 1 dfr
            [//d
                [0, 4, 1], // axis, layerMask, angle
                [2, 4, -1],
                [0, 4, -1],
                [2, 4, 1]
            ],
            [//f
                [1, 1, -1], // axis, layerMask, angle
                [0, 4, -1],
                [1, 1, 1],
                [0, 4, 1]
            ],
            [//r
                [2, 4, -1], // axis, layerMask, angle
                [1, 1, -1],
                [2, 4, 1],
                [1, 1, 1]
            ]
        ], [// 2 ubr
            [//u
                [0, 4, 1], // axis, layerMask, angle
                [2, 1, 1],
                [0, 4, -1],
                [2, 1, -1]
            ],
            [//b
                [1, 4, 1], // axis, layerMask, angle
                [0, 4, -1],
                [1, 4, -1],
                [0, 4, 1]
            ],
            [//r
                [2, 1, 1], // axis, layerMask, angle
                [1, 4, 1],
                [2, 1, -1],
                [1, 4, -1]
            ]
        ], [// 3 drb
            [//d
                [2, 1, -1], // axis, layerMask, angle
                [0, 4, -1],
                [2, 1, 1],
                [0, 4, 1]
            ],
            [//r
                [1, 1, -1], // axis, layerMask, angle
                [2, 1, 1],
                [1, 1, 1],
                [2, 1, -1]
            ],
            [//b
                [0, 4, -1], // axis, layerMask, angle
                [1, 1, -1],
                [0, 4, 1],
                [1, 1, 1]
            ]
        ], [// 4 ulb
            [//u
                [2, 1, -1], // axis, layerMask, angle
                [0, 1, 1],
                [2, 1, 1],
                [0, 1, -1]
            ],
            [//l
                [1, 4, 1], // axis, layerMask, angle
                [2, 1, 1],
                [1, 4, -1],
                [2, 1, -1]
            ],
            [//b
                [0, 1, 1], // axis, layerMask, angle
                [1, 4, 1],
                [0, 1, -1],
                [1, 4, -1]
            ]
        ], [// 5 dbl
            [//d
                [0, 1, -1], // axis, layerMask, angle
                [2, 1, 1],
                [0, 1, 1],
                [2, 1, -1]
            ],
            [//b
                [1, 1, -1], // axis, layerMask, angle
                [0, 1, 1],
                [1, 1, 1],
                [0, 1, -1]
            ],
            [//l
                [2, 1, 1], // axis, layerMask, angle
                [1, 1, -1],
                [2, 1, -1],
                [1, 1, 1]
            ]
        ], [// 6 ufl
            [//u
                [0, 1, -1], // axis, layerMask, angle
                [2, 4, -1],
                [0, 1, 1],
                [2, 4, 1]
            ],
            [//f
                [1, 4, 1], // axis, layerMask, angle
                [0, 1, 1],
                [1, 4, -1],
                [0, 1, -1]
            ],
            [//l
                [2, 4, -1], // axis, layerMask, angle
                [1, 4, 1],
                [2, 4, 1],
                [1, 4, -1]
            ]
        ], [// 7 dlf
            [//d
                [2, 4, 1], // axis, layerMask, angle
                [0, 1, 1],
                [2, 4, -1],
                [0, 1, -1]
            ],
            [//l
                [1, 1, -1], // axis, layerMask, angle
                [2, 4, -1],
                [1, 1, 1],
                [2, 4, 1]
            ],
            [//f
                [0, 1, 1], // axis, layerMask, angle
                [1, 1, -1],
                [0, 1, -1],
                [1, 1, 1]
            ]
        ]
    ];
  


// ------------------
// MODULE API    
// ------------------
return {
  Cube : Cube
};
});
/*
 * @(#)Cube3D.js  1.1  2014-02-02
 *
 * Copyright (c) 2011-2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("Cube3D", ['Node3D','J3DIMath'], 
function(Node3D,J3DIMath) { 

/** Change event. */
class ChangeEvent {
  constructor(source) {
    this.source=source;
  }
}
 
/** Constructor
 * Base class for classes which implement the geometry of a 
 * Rubik's Cube like puzzle.
 *
 *
 */
class Cube3D extends Node3D.Node3D {
  constructor() {
    super();
  // subclasses must build the following model hierarchy
  // for use when the cube is assembled:
  //
  // cube3d                   Node3D root (this).
  // .partLocations           Node3D used to perform
  //                            location changes of the part.
  // .partExplosions          Node3D used to perform the
  //                            explosion effect.
  // .partOrientations        Node3D for orientation transformation
  //                            of the parts. These are rotations
  //                            around position 0.
  // .parts                   Node3D holding the mesh. May contain
  //                            a non-identity transform to position
  //                            the mesh, so that the part is
  //                            moved to position 0 and orientation 0.
  
  // subclasses must build the following model hierarchy
  // for use when the cube is developed:
  //
  // cube3d                   Node3D root (this).
  // .stickerTranslations     Node3D used to drag a sticker around
  // .stickerLocations        Node3D used to perform
  //                            location changes of the sticker.
  // .stickerExplosions       Node3D used to perform the
  //                            explosion effect.
  // .stickerOrientations     Node3D for orientation transformation
  //                            of the sticker. These are rotations
  //                            around position 0.
  // .stickers               Node3D holding the mesh. May contain
  //                            a non-identity transform to position
  //                            the mesh, so that the sticker is
  //                            moved to position 0 and orientation 0.
  
  this.cube = null;
  this.cornerCount=0;
  this.edgeCount=0;
  this.sideCount=0;
  
  this.centerCount=0;
  this.partCount=0;
  this.cornerOffset=0;
  this.edgeOffset=0;
  this.sideOffset=0;
  this.centerOffset=0;
  this.repainter=null;
  this.isTwisting=false;
  this.repaintFunction=null;
  
  this.parts=[];
  this.partOrientations=[];
  this.partExplosions=[];
  this.partLocations=[];
  
  this.stickers=[];
  this.stickerOrientations=[];
  this.stickerExplosions=[];
  this.stickerLocations=[];
  this.stickerTranslations=[];
  
  this.identityPartLocations=[];
  this.identityStickerLocations=[];
  //this.identityStickerOrientations=[]; Not needed, since == identity matrix
  
  this.listenerList=[];
  this.isCubeValid=false;
  this.updateTwistRotation=new J3DIMatrix4();
  this.updateTwistOrientation=new J3DIMatrix4();
  this.partSize=3;
  
  this.developedStickerTranslations=[];
  this.developedStickers=[];
  this.identityDevelopedMatrix=[];
  
  this.currentStickerTransforms=[];
  }
}

Cube3D.prototype.cubeChanged=function(evt) {
    this.updateCube();
}
Cube3D.prototype.cubeTwisted=function(evt) {
    this.updateCube();
}

Cube3D.prototype.updateCube=function() {
    //this.stopAnimation();
    this.isCubeValid = false;
    this.validateCube();
    this.fireStateChanged();
}

Cube3D.prototype.validateCube=function() {
    if (!this.isCubeValid) {
        this.isCubeValid = true;
        var model = this.cube;
        var partIndices = new Array(this.partCount);
        var locations = new Array(this.partCount);
        var orientations = new Array(this.partCount);
        for (var i = 0; i < this.partCount; i++) {
            locations[i] = i;
            partIndices[i] = model.getPartAt(locations[i]);
            orientations[i] = model.getPartOrientation(partIndices[i]);
        }
        this.validateTwist(partIndices, locations, orientations, this.partCount, 0, 0, 1);
    }
}
Cube3D.prototype.updateAttributes=function() {
    this.isAttributesValid = false;
    this.validateAttributes();
}
Cube3D.prototype.validateAttributes=function() {
    if (!this.isAttributesValid) {
        this.isAttributesValid = true;
        
        this.doValidateDevelopAttributes();
        this.doValidateAttributes();
    }
}
Cube3D.prototype.doValidateAttributes=function() {
  // subclasses can override this methods
}
Cube3D.prototype.doValidateDevelopAttributes=function() {
  if (this.attributes.developmentFactor == this.cachedDevelopmentFactor) {
    return;
  }
  this.cachedDevelopmentFactor = this.attributes.developmentFactor;
  
  var m1 = new J3DIMatrix4();
  var m2 = new J3DIMatrix4();

  for (var i=0; i<this.stickerCount; i++) {
    var j=this.stickerToPartMap[i];
    m1.load(this.partLocations[j].matrix);
    m1.multiply(this.partExplosions[j].matrix);
    m1.multiply(this.partOrientations[j].matrix);
    m1.multiply(this.parts[j].matrix);

    m2.load(this.stickerTranslations[i].matrix);
    m2.multiply(this.stickerLocations[i].matrix);
    m2.multiply(this.stickerExplosions[i].matrix);
    m2.multiply(this.stickerOrientations[i].matrix);
    m2.multiply(this.stickers[i].matrix);
    
    this.currentStickerTransforms[i].matrix.load(J3DIMath.rigidLerp(m1, m2, this.attributes.developmentFactor));
  }
}

   // protected abstract void validateTwist(int[] partIndices, int[] locations, int[] orientations, int length, int axis, int angle, float alpha);

/**
 * Adds a listener for ChangeEvent's.
 *
 * A listener must have a stateChanged() function.
 */
Cube3D.prototype.addChangeListener=function(l) {
  this.listenerList[this.listenerList.length]=l;
}

/**
 * Removes a listener for CubeEvent's.
 */
Cube3D.prototype.removeChangeListener=function(l) {
  for (var i=0;i<this.listenerList.length;i++) {
    if (this.listenerList[i]==l) {
      this.listenerList=this.listenerList.slice(0,i)+this.listenerList.slice(i+1);
      break;
    }
  }
}

/**
 * Notify all listeners that have registered varerest for
 * notification on this event type.
 */
Cube3D.prototype.fireStateChanged=function() {
  var event=new ChangeEvent(this);
    // Guaranteed to return a non-null array
    var listeners = this.listenerList;
    // Process the listeners last to first, notifying
    // those that are varerested in this event
    for (var i = listeners.length - 1; i >= 0; i -= 1) {
            listeners[i].stateChanged(event);
    }
}

Cube3D.prototype.repaint=function() {
  if (this.repaintFunction != null) {
    this.repaintFunction();
  }
}

/** Intersection test for a ray with the cube. 
 * The ray must be given as an object with {point:J3DIVector3, dir:J3DIVector3}
 * in the model coordinates of the cube.
 *
 * Returns null if no intersection, or the intersection data: 
 * {point:J3DIVector3, uv:J3DIVector3, t:float, axis:int, layerMask:int, 
 *  angle:int, ...}
 *
 * @return point Intersection point: 3D vector.
 * @return uv    Intersecton UV coordinates: 2D vector on the intersection plane.
 * @return t     The distance that the ray traveled to the intersection point.
 * @return axis  The twist axis.
 * @return layerMask The twist layer mask.
 * @return angle The twist angle.
 */
Cube3D.prototype.intersect=function (ray) {
  var cubeSize = this.partSize * this.cube.layerCount;
  
  var box = { pMin:new J3DIVector3(-cubeSize/2, -cubeSize/2, -cubeSize/2),
              pMax:new J3DIVector3( cubeSize/2,  cubeSize/2,  cubeSize/2) };
  var isect = J3DIMath.intersectBox(ray, box);
  
  if (isect != null) {
    var face=isect.face;
    var u=Math.floor(isect.uv[0]*this.cube.layerCount);
    var v=Math.floor(isect.uv[1]*this.cube.layerCount);

    isect.axis=this.boxClickToAxisMap[face][u][v];
    isect.layerMask=this.boxClickToLayerMap[face][u][v];
    isect.angle=this.boxClickToAngleMap[face][u][v];
  }
  
  return isect;
}
/** Intersection test for a ray with a developed cube. 
 * The ray must be given as an object with {point:J3DIVector3, dir:J3DIVector3}
 * in the model coordinates of the cube.
 *
 * Returns null if no intersection, or the intersection data: 
 * {point:J3DIVector3, uv:J3DIVector3, t:float, axis:int, layerMask:int, angle:int,
 *  ...}
 *
 * @return point Intersection point: 3D vector.
 * @return uv    Intersecton UV coordinates: 2D vector on the intersection plane.
 * @return t     The distance that the ray traveled to the intersection point.
 * @return axis  The twist axis.
 * @return layerMask The twist layer mask.
 * @return angle The twist angle.
 * @return sticker The sticker index.
 * @return part The part index.
 * @return face The face index.
 */
Cube3D.prototype.intersectDeveloped=function (ray) {
  var isect = null;
  var plane = { point:new J3DIVector3(), normal:new J3DIVector3() };
  var m = new J3DIMatrix4();
  
  var layerCount = this.cube.layerCount;
  var partSize = this.partSize;
  
  plane.point.load(0,0,-0.5*layerCount*this.partSize);
  plane.normal.load(0,0,-1);
  
  isect = J3DIMath.intersectPlane(ray, plane);
  if (isect != null) {
    var tileU=-1-Math.floor((isect.uv[0]-(1.5*layerCount*partSize)) / partSize);
    var tileV=Math.floor((isect.uv[1]+(1.5*layerCount*partSize)) / partSize);
    //console.log('col:'+(tileU)+'row:'+(tileV));

    if (tileV >= 0 && tileV < layerCount
        && tileU >= layerCount && tileU < layerCount*2) {
      isect.face = 1;
    } else if (tileV >= layerCount && tileV < layerCount*2
        && tileU >= 0 && tileU < (layerCount*4)) {
      switch (Math.floor(tileU / layerCount)) {
      case 0: 
        isect.face = 3; 
        break;
      case 1: 
        isect.face = 2; 
        break;
      case 2: 
        isect.face = 0; 
        break;
      case 3: 
        isect.face = 5; 
        break;
      default: 
        return null; // should never happen
      }
    } else if (tileV >= layerCount*2 && tileV < layerCount*3
        && tileU >= layerCount && tileU < layerCount*2) {
      isect.face = 4;
    } else {
      return null;
    }
    isect.sticker = isect.face*layerCount*layerCount+(tileV % layerCount) * layerCount + tileU % layerCount;
    isect.part = this.getPartIndexForStickerIndex(isect.sticker);
    isect.plane = plane;
  }
  
  return isect;
}


// ------------------
// MODULE API    
// ------------------
return {
  Cube3D : Cube3D
};
});
/*
 * @(#)CubeAttributes.js  1.0  2011-06-23
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("CubeAttributes", [], 
function() { 

let module = {
  log: (false) // Enable or disable logging for this module.
    ? function(msg) { console.log('CubeAttributes.js '+msg); }
    : function() {}
}

/** 
 * Holds the attributes of a Rubik's Cube like puzzle.
 */
class CubeAttributes {
  constructor(partCount, stickerCount, stickerCountPerFace) {
    this.partsVisible = new Array(partCount);//boolean
    this.partsFillColor = new Array(partCount);//[r,g,b,a]
    this.partsPhong = new Array(partCount);//[ambient, diffuse, specular, shininess]
    this.stickersVisible = new Array(stickerCount);//boolean
    this.stickersFillColor = new Array(stickerCount);//[r,g,b,a]
    this.stickersPhong = new Array(stickerCount);//[ambient, diffuse, specular, shininess]
    this.stickerCountPerFace = stickerCountPerFace;//integer
    this.partExplosion = new Array(partCount);//float
    this.stickerExplosion = new Array(stickerCount);//float
    this.xRot=-25;
    this.yRot=-45;
    this.scaleFactor=1.0;
    this.explosionFactor=0;
    this.developmentFactor=0; // range [0,1]
    
    this.stickersImageURL=null;
    
    // The twist duration of the cube.
    this.twistDuration=500;
    
    // The twist duration that will be set on twistDuration when the user
    // performs an twist operation.
    this.userTwistDuration=500;
    
    // The twist duration that will be set on twistDuration when the program
    // performs a scramble operation.
    this.scrambleTwistDuration=500/3;
    
    this.backgroundColor=[0, 0, 0, 0]; //[r,g,b,a]
    
    for (var i=0;i<partCount;i++) {
      this.partsVisible[i]=true;
      this.stickersVisible[i]=true;
      this.partExplosion[i]=0;
    }
    
    // The following values must be initialized explicitly
    this.faceCount=undefined;
    this.stickerOffsets=[];
    this.stickerCounts=[];
  }
  
  getFaceCount() {
    return this.faceCount;
  }
  getStickerOffset(face) {
    return this.stickerOffsets[face];
  }
  getStickerCount(face) {
    return this.stickerCounts[face];
  }
}


// ------------------
// MODULE API    
// ------------------
return {
    CubeAttributes : CubeAttributes,
    newCubeAttributes : function (partCount, stickerCount, stickerCountPerFace) { return new CubeAttributes(partCount, stickerCount, stickerCountPerFace); }
};
});
/*
 * @(#)CubeSolverMain.js  1.0  2014-02-08
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Integrates a virtual cube into a HTML page.
*/
 
// --------------
// require.js
// --------------
define("CubeSolverMain", ["WebglSolverCanvas","TwoDSolverCanvas"], 
function(WebglSolverCanvas,TwoDSolverCanvas) {
  
    var nextId=0;
    
   
/** 
  * Attaches a CubeSolver object to the specified <div> or <canvas> element.
  *
  * If a <div>-Element is specified, then the following child elements
  * are added to it:
  *
  * <canvas class="cubesolvercanvas"/>
  * <div class="cubesolvertoolbar">
  * </div>
  *
  * @param divOrCanvas 
  *               Optional <div> or <canvas> object.
  *               If divOrCanvas is null, a rubik's cube is attached to all
  *               <div> and <canvas>  elements in the document with 
  *               class "cubesolver".
  *               If a <canvas>-Element is specified, then a CubeSolver
  *               object is added to it as the property cubesolver.
  *               If a <div>-Element is specified, then the following
  *               elements are added to it:
  */
function attachCubeSolver(divOrCanvas) {
  // if we have been called before the document was loaded, we install a
  // listener and retry.
  if (document.body == null) {
    var f=function() {
      try {
      window.removeEventListener('load',f,false);
      } catch (err) {
        // => IE does not support event listeners 
        window.detachEvent('onload',f,false);
      }
      attachCubeSolver(divOrCanvas);
    }
    try {
    window.addEventListener('load',f,false);
    } catch (err) {
      // => IE does not support event listeners 
      window.attachEvent('onload',f,false);
    }
    return;
  }

  
  // get the console
   var console = ("console" in window) ? window.console : { log: function() { } };  
   
   if (divOrCanvas==null) {
     // => no element was provided, attach to all elements with class "cubesolver"
     try {
     var htmlCollection=document.getElementsByClassName("cubesolver");
     if (htmlCollection.length == 0) {
       console.log('Error: cubesolver.js no canvas or div element with class name "cubesolver" found.');
       return;
     }
     } catch (err) {
       // => IE does not support getElementsByClassName
       return;
     }
     for (i=0;i<htmlCollection.length;  i++) {
       var elem=htmlCollection[i];
       attachCubeSolver(elem);
     }
   } else {
     // => an element was provided, attach CubeSolver to it
     var canvasElem = null;
     if (divOrCanvas.tagName=="CANVAS") {
        // => A <canvas> element was provided, attach to it
         canvasElem = divOrCanvas;
     } else if (divOrCanvas.tagName=="DIV") {
        // => A <div> element was provided, remove content, then insert a canvas element and buttons
        while (divOrCanvas.lastChild) {
          divOrCanvas.removeChild(divOrCanvas.lastChild);
         }
         
        var id="cubesolver_"+nextId++;
        canvasElem = document.createElement("canvas");
        canvasElem.setAttribute("class","cubesolvercanvas");
        canvasElem.setAttribute("id",id);
        canvasElem.setAttribute("cube",divOrCanvas.getAttribute("cube"));
        canvasElem.setAttribute("stickersImage",divOrCanvas.getAttribute("stickersImage"));
        canvasElem.setAttribute("debug",divOrCanvas.getAttribute("debug"));
        divOrCanvas.appendChild(canvasElem);
        var toolbarElem = document.createElement("div");
				toolbarElem.setAttribute("class","cubesolvertoolbar");
        divOrCanvas.appendChild(toolbarElem);
        var buttonElem;
        buttonElem = document.createElement("button");
        buttonElem.setAttribute("type","button");
        buttonElem.setAttribute("class","cubesolverreset");
        buttonElem.setAttribute("onclick","document.getElementById('"+id+"').cubesolver.reset();");  
        buttonElem.appendChild(document.createTextNode("Reset"));
        toolbarElem.appendChild(buttonElem);
        buttonElem = document.createElement("button");
        buttonElem.setAttribute("type","button");
        buttonElem.setAttribute("class","cubesolversolve");
        buttonElem.setAttribute("onclick","document.getElementById('"+id+"').cubesolver.solve();");  
        buttonElem.appendChild(document.createTextNode("Solve"));
        toolbarElem.appendChild(buttonElem);
        buttonElem = document.createElement("button");
        buttonElem.setAttribute("type","button");
        buttonElem.setAttribute("class","cubesolverundo");
        buttonElem.setAttribute("onclick","document.getElementById('"+id+"').cubesolver.undo();");  
        buttonElem.appendChild(document.createTextNode("Undo"));
        toolbarElem.appendChild(buttonElem);
        /*
        buttonElem = document.createElement("button");
        buttonElem.setAttribute("type","button");
        buttonElem.setAttribute("onclick","document.getElementById('"+id+"').cubesolver.wobble();");  
        buttonElem.appendChild(document.createTextNode("Wobble"));
        toolbarElem.appendChild(buttonElem);
        buttonElem = document.createElement("button");
        buttonElem.setAttribute("type","button");
        buttonElem.setAttribute("onclick","document.getElementById('"+id+"').cubesolver.explode();");  
        buttonElem.appendChild(document.createTextNode("Explode"));
        toolbarElem.appendChild(buttonElem);
        */
     } else {
         console.log('Error: cubesolver.js element '+divOrCanvas+' is not a canvas or a div. tagName='+divOrCanvas.tagName);
         return;
     }
     var vr=new CubeSolver(canvasElem);
     vr.init();
     canvasElem.cubesolver=vr;
   }
 }

/** Constructor.
 * 
 * Creates a virtual rubik's cube and attaches it to the specified canvas
 * object. 
 * init() must be called after construction.
 */
CubeSolver = function(canvas) {
   this.canvas=canvas;
}
/** Initializes the virtual cube. */
CubeSolver.prototype.init = function() {
 this.canvas3d = WebglSolverCanvas.newWebGLSolverCanvas();
 //this.canvas3d = TwoDSolverCanvas.newTwoDSolverCanvas();
 var s = this.canvas3d.setCanvas(this.canvas);
 if (! s) { 
   this.canvas3d = TwoDSolverCanvas.newTwoDSolverCanvas();
   s = this.canvas3d.setCanvas(this.canvas);
  }
}
CubeSolver.prototype.reset = function() {
  this.canvas3d.reset();
}
CubeSolver.prototype.scramble = function(scrambleCount,animate) {
  this.canvas3d.scramble(scrambleCount,animate);
}
CubeSolver.prototype.play = function() {
  this.canvas3d.play();
}
CubeSolver.prototype.solve = function() {
  this.canvas3d.solve();
}
CubeSolver.prototype.undo = function() {
  this.canvas3d.undo();
}
CubeSolver.prototype.wobble = function() {
  this.canvas3d.wobble();
}
CubeSolver.prototype.explode = function() {
  this.canvas3d.explode();
}
CubeSolver.prototype.setAutorotate = function(newValue) {
  this.canvas3d.setAutorotate(newValue);
}


// ------------------
// MODULE API    
// ------------------
return {
	attachCubeSolver : attachCubeSolver
};
});
/*
 * @(#)J3DI.js  2.0  2013-12-31
 *
 * Copyright (c) 2011-2013 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
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
"use strict";
// --------------
// require.js
// --------------
define("J3DI", [], 
function() { 

let module = {
  log: (false) // Enable or disable logging for this module.
    ? function(msg) { console.log('J3DI.js '+msg); }
    : function() {}
}

/**
 * Provides requestAnimationFrame in a cross browser way.
 */
let requestAnimFrame = (function() {
  return function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
           window.setTimeout(callback, 1000/60); };
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
  }


  /** References all data from that object by this.
   * Returns this.
   */
  setTo (that) {
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
  clone () {
    let that=new J3DIObj();
    that.setTo(this);
    return that;
  }
  /** Binds this object to the given WebGL context.
   * Has no effect if the object is not loaded yet.
   */
  bindGL (gl) {
    if (!this.loaded) return;

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
  updateGL () {
    let gl = this.gl;
    if (gl == null || ! this.loaded) return;

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
  flipTexture (u,v) {
    for (let i=0;i<this.textureArray.length;i+=2) {
      if (u) this.textureArray[i]=1 - this.textureArray[i];
      if (v) this.textureArray[i+1]=1 - this.textureArray[i+1];
    }
  }
  /** Rotates the texture in 90 degree steps. 
   * The WebGL context must be updated afterwards.
   */
  rotateTexture (degree) {
    if (! this.loaded) return;

    // clone the texture array
    this.textureArray = this.textureArray.slice(0);

    switch (degree%360) {
      case 0:
        break;

      default:
      case 90:  
        for (let i=0;i<this.textureArray.length;i+=2) {
          let t = this.textureArray[i];
          this.textureArray[i] = this.textureArray[i+1];
          this.textureArray[i+1] = 1 - t;
        }
        break;

      case 180:
        for (let i=0;i<this.textureArray.length;i+=2) {
          this.textureArray[i] = 1 - this.textureArray[i];
          this.textureArray[i+1] = 1 - this.textureArray[i+1];
        }
        break;

      case 270:
        for (let i=0;i<this.textureArray.length;i+=2) {
          let t = this.textureArray[i];
          this.textureArray[i] = 1 - this.textureArray[i+1];
          this.textureArray[i+1] = t;
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
    if (typeof(canvasName)=='string') {
      canvas = document.getElementById(canvasName);
    } else {
      canvas = canvasName;
    }
    let gl = setupWebGL(canvas, optAttribs, errorCallback==null);
    if (gl==null|| typeof(gl)=='string' || (gl instanceof String) ) {
      if (errorCallback) {
        errorCallback(gl);
      }
      return null;
    }
    checkGLError(gl,'easywebgl.initWebGL setupWebGL');

    // load the shaders asynchronously
    if (gl.programs == null) {
      gl.programs=Array();
    }
    
    let files=[];
    if (typeof vshader != 'object' || !( "length" in vshader)) {
      vshader=[vshader];
    }
    if (typeof fshader != 'object' || !( "length" in fshader)) {
      fshader=[fshader];
    }
    files = vshader.concat(fshader);
    checkGLError(gl,'easywebgl.initWebGL before loadFiles');
    
    loadFiles(files, 
      function (shaderText) {
        checkGLError(gl,'easywebgl.initWebGL loadFiles callback');
        let programCount=shaderText.length/2;
        for (let programIndex=0;programIndex<programCount;programIndex++) {
          // create our shaders
          checkGLError(gl,'easywebgl.initWebGL before loadShader '+programIndex);
          let vertexShader = loadShader(gl, vshader[programIndex], shaderText[programIndex], gl.VERTEX_SHADER);
          let fragmentShader = loadShader(gl, fshader[programIndex], shaderText[programIndex+programCount], gl.FRAGMENT_SHADER);
          if (!vertexShader || !fragmentShader) {
            if (errorCallback) errorCallback("Error compiling shaders.");
            else module.log("Error compiling shaders.");
            return null;
          }
  
          // Create the program object
          gl.programs[programIndex] = gl.createProgram();
          checkGLError(gl,'easywebgl.initWebGL createProgram '+programIndex);
          
          let prg=gl.programs[programIndex];
          prg.vshaderId=vshader[programIndex];
          prg.fshaderId=fshader[programIndex];
  
          if (!prg)
              return null;
          
          // Attach our two shaders to the program
          gl.attachShader (prg, vertexShader);
          checkGLError(gl,'easywebgl.initWebGL attach vertex shader');
          gl.attachShader (prg, fragmentShader);
          checkGLError(gl,'easywebgl.initWebGL attach fragment shader');
          
          // Link the program
          gl.linkProgram(prg);
          checkGLError(gl,'easywebgl.initWebGL linkProgram');
          
          // Check the link status
          let linked = gl.getProgramParameter(prg, gl.LINK_STATUS);
          if (!linked) {
              // something went wrong with the link
              let error = gl.getProgramInfoLog (prg);
              module.log("Error in program linking:"+error);
          
              gl.deleteProgram(prg);
              gl.deleteShader(fragmentShader);
              gl.deleteShader(vertexShader);
          
              return null;
          }
          // Bind attributes
          prg.attribs=[];
          for (let i = 0; i < attribs.length; ++i) {
            prg.attribs[attribs[i]]=gl.getAttribLocation(prg, attribs[i]);
            if (prg.attribs[attribs[i]]!=-1) {
              //gl.enableVertexAttribArray(prg.attribs[attribs[i]]);
            }
            //  gl.bindAttribLocation (gl.programs[programIndex], i, attribs[i]);
          }
          
          // Bind uniforms
          prg.uniforms=[];
          for (let i = 0; i < uniforms.length; ++i) {
            prg.uniforms[uniforms[i]]=gl.getUniformLocation(prg, uniforms[i]);
          }
          
          
          gl.useProgram(gl.programs[programIndex]);
          checkGLError(gl,'easywebgl.initWebGL useProgram '+prg.vshaderId+','+prg.fshaderId);
        }
        if (callback) callback(gl);
      }, 
      function (url) {
        if (errorCallback) errorCallback(url);
        else module.log('Failed to download "' + url + '"');
      }
    );     
    
    

    checkGLError(gl,'easywebgl.initWebGL before clear');
    
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clearDepth(clearDepth);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    checkGLError(gl,'easywebgl.initWebGL after clear');

    return gl;
};

let checkGLError = function (gl, msg) {
    let error = gl.getError();
		
    if (error != gl.NO_ERROR) {
      let str = "GL Error: " + error+(msg==null?"":" "+msg);
        module.log(str);
    }
};

/**
 * loadShader
 *
 * Original code by Apple Inc.
 */
let loadShader = function (ctx, shaderId, shaderScript, shaderType)
{
  module.log('.loadShader('+ctx+','+shaderId+','+(shaderScript==null?null:shaderScript.substring(0,Math.min(shaderScript.length,10)))+','+shaderType);
  
    // Create the shader object
    checkGLError(ctx,'easywebgl.loadShader before createShader '+shaderType);
    let shader = ctx.createShader(shaderType);
    checkGLError(ctx,'easywebgl.loadShader createShader '+shaderType);
    if (shader == null) {
        module.log("*** Error: unable to create shader '"+shaderId+"' error:"+ctx.getError());
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
        module.log("*** Error compiling shader '"+shaderId+"':"+error);
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
  module.log('.setFileData '+url);
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
      module.log('.loadFile url:'+url+' using preloaded data');
      if (callback) {
        let f = function() { callback(fileData[key],data); }
        requestAnimFrame(f);
      }
      return;
    }
  }
      
    let scriptElem = document.getElementById(url);
    // instead of an URL we also accept the id of a script element
    if (scriptElem) {
      if (scriptElem.text) {
        module.log('.loadFile url:'+url+' using data from script element');
        if (callback) {
          let f = function() { callback(scriptElem.text,data); };
          requestAnimFrame(f);
        }
        return;
      } else {
        url = scriptElem.src;
      }
    }
  module.log('.loadFile url:'+url+' requesting data...');
  
    // Set up an asynchronous request
    let request = new XMLHttpRequest();
    request.open('GET', url, true);

    // Hook the event that gets called as the request progresses
    request.onreadystatechange = function () {
        // If the request is "DONE" (completed or failed)
        if (request.readyState == 4) {
            // If we got HTTP status 200 (OK) or file status 0 (OK)
            if (request.status == 200 || request.status == 0) {
              module.log('.loadFile url:'+url+' done, request.status:'+request.status);
              if (callback) {
                callback(request.responseText, data)
              }
            } else { // Failed
              module.log('.loadFile url:'+url+' failed, request.status:'+request.status);
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
  module.log(".loadXML url="+url);    
  
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
let makeBox = function (ctx, bmin, bmax)
{
  if (bmin==null) bmin=new J3DIVector3(-1,-1,-1);
  if (bmax==null) bmax=new J3DIVector3(1,1,1);
  
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
        [  bmax[0], bmax[1], bmax[2],  bmin[0], bmax[1], bmax[2],  bmin[0], bmin[1], bmax[2],   bmax[0], bmin[1], bmax[2],    // v0-v1-v2-v3 front
           bmax[0], bmax[1], bmax[2],   bmax[0], bmin[1], bmax[2],   bmax[0], bmin[1], bmin[2],   bmax[0], bmax[1], bmin[2],    // v0-v3-v4-v5 right
           bmax[0], bmax[1], bmax[2],   bmax[0], bmax[1], bmin[2],  bmin[0], bmax[1], bmin[2],  bmin[0], bmax[1], bmax[2],    // v0-v5-v6-v1 top
          bmin[0], bmax[1], bmax[2],  bmin[0], bmax[1], bmin[2],  bmin[0], bmin[1], bmin[2],  bmin[0], bmin[1], bmax[2],    // v1-v6-v7-v2 left
          bmin[0], bmin[1], bmin[2],   bmax[0], bmin[1], bmin[2],   bmax[0], bmin[1], bmax[2],  bmin[0], bmin[1], bmax[2],    // v7-v4-v3-v2 bottom
           bmax[0], bmin[1], bmin[2],  bmin[0], bmin[1], bmin[2],  bmin[0], bmax[1], bmin[2],   bmax[0], bmax[1],bmin[2] ]   // v4-v7-v6-v5 back
    );

    // normal array
    let normals = new Float32Array(
        [  0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,     // v0-v1-v2-v3 front
           1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,     // v0-v3-v4-v5 right
           0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,     // v0-v5-v6-v1 top
          -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,     // v1-v6-v7-v2 left
           0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,     // v7-v4-v3-v2 bottom
           0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1 ]    // v4-v7-v6-v5 back
       );


    // texCoord array
    let texCoords = new Float32Array(
        [  1, 1,   0, 1,   0, 0,   1, 0,    // v0-v1-v2-v3 front
           0, 1,   0, 0,   1, 0,   1, 1,    // v0-v3-v4-v5 right
           1, 0,   1, 1,   0, 1,   0, 0,    // v0-v5-v6-v1 top
           1, 1,   0, 1,   0, 0,   1, 0,    // v1-v6-v7-v2 left
           0, 0,   1, 0,   1, 1,   0, 1,    // v7-v4-v3-v2 bottom
           0, 0,   1, 0,   1, 1,   0, 1 ]   // v4-v7-v6-v5 back
       );

    // index array
    let indices = new Uint16Array(
        [  0, 2, 1,   0, 3, 2,    // front
           4, 6, 5,   4, 7, 6,    // right
           8,10, 9,   8,11,10,    // top
          12,14,13,  12,15,14,    // left
          16,18,17,  16,19,18,    // bottom
          20,22,21,  20,23,22 ]   // back
      );

    let retval = { };

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
let makeSphere = function (ctx, radius, lats, longs)
{
    let geometryData = [ ];
    let normalData = [ ];
    let texCoordData = [ ];
    let indexData = [ ];

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
            let u = 1-(longNumber/longs);
            let v = latNumber/lats;

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
            let first = (latNumber * (longs+1)) + longNumber;
            let second = first + longs + 1;
            indexData.push(first);
            indexData.push(second);
            indexData.push(first+1);

            indexData.push(second);
            indexData.push(second+1);
            indexData.push(first+1);
        }
    }

    let retval = { };

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
let loadObj = function (ctx, url, callback, errorCallback)
{
  
    let obj = new J3DIObj();
    obj.gl = ctx;
    obj.url = url;

    let f = function (responseText, obj) {
      if (responseText==null) {
        module.log('.loadObj error no text for url:'+url);
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
let doLoadObj = function (obj, text, callback, errorCallback)
{
  module.log('.doLoadObj obj:'+obj+" text:"+(text==null?null:'"'+text.substring(0,Math.min(10,text.length))+'..."')+' callback:'+callback+' errorCallback:'+errorCallback);
  
  if (text==null) {
    module.log('.doLoadObj error no text');
    if (errorCallback) {
      errorCallback();
    }
    return;
  }
  
  if (obj.gl != null) {
    checkGLError(obj.gl,'easywebgl.doLoadObj... '+obj.url);
  }
  
  let invertFaces = false;
  let vertexArray = [ ];
  let normalArray = [ ];
  let textureArray = [ ];
  let indexArray = [ ];
  let polyIndexArray = [ ]; // two dimensional array with indices for each polygon

  let vertex = [ ];
  let normal = [ ];
  let texture = [ ];
  let facemap = { };
  let index = 0;
  let tempIndexArray = new Array(4);

    // This is a map which associates a range of indices with a name
    // The name comes from the 'g' tag (of the form "g NAME"). Indices
    // are part of one group until another 'g' tag is seen. If any indices
    // come before a 'g' tag, it is given the group name "_unnamed"
    // 'group' is an object whose property names are the group name and
    // whose value is a 2 element array with [<first index>, <num indices>]
    let groups = { };
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
              array[1] += ' $'+lineIndex;
            }
            groups[array[1]] = currentGroup;
        }
        else if (array[0] == "v") {
            // vertex
            vertex.push(parseFloat(array[1]));
            vertex.push(parseFloat(array[2]));
            vertex.push(-parseFloat(array[3]));// Wavefront format flips z-coodinate
        }
        else if (array[0] == "vt") {
            // texture
            texture.push(parseFloat(array[1]));
            texture.push(parseFloat(array[2]));
        }
        else if (array[0] == "vn") {
            // normal
            normal.push(-parseFloat(array[1]));
            normal.push(-parseFloat(array[2]));
            normal.push(parseFloat(array[3]));// Wavefront format flips z-coordinate
        }
        else if (array[0] == "f") {
          // face
          if (array.length < 4) {
            module.log(".doLoadObj *** Error: face '"+line+"' not handled");
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
                    }
                    else if (f.length = 3) {
                        vtx = parseInt(f[0]) - 1;
                        tex = parseInt(f[1]) - 1;
                        nor = parseInt(f[2]) - 1;
                    }
                    else {
                        module.log(".doLoadObj *** Error: did not understand face '"+array[i]+"'");
                      return null;
                    }

                    // do the vertices
                    let x = 0;
                    let y = 0;
                    let z = 0;
                    if (vtx * 3 + 2 < vertex.length) {
                        x = vertex[vtx*3];
                        y = vertex[vtx*3+1];
                        z = vertex[vtx*3+2];
                    }
                    vertexArray.push(x);
                    vertexArray.push(y);
                    vertexArray.push(z);

                    // do the textures
                    x = 0;
                    y = 0;
                    if (tex * 2 + 1 < texture.length) {
                        x = texture[tex*2];
                        y = texture[tex*2+1];
                    }
                    textureArray.push(x);
                    textureArray.push(1-y);// Wavefront format flips y-texture

                    // do the normals
                    x = 0;
                    y = 0;
                    z = 1;
                    if (nor * 3 + 2 < normal.length) {
                        x = normal[nor*3];
                        y = normal[nor*3+1];
                        z = normal[nor*3+2];
                    } else {
                       recomputeNormals=true;
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
          let poly=new Array(array.length-1);
          for (let j=0;j<array.length-1;j++) {
             poly[j]=tempIndexArray[j];
          }
          polyIndexArray.push(poly);
          for (let j=2;j<array.length-1;j++) {
             indexArray.push(tempIndexArray[0]);
             indexArray.push(tempIndexArray[j-1]);
             indexArray.push(tempIndexArray[j]);
             currentGroup[1]+=3;
          }
          
          if (false) {
          if (array.length == 5) { // quad
            if (invertFaces) {
             indexArray.push(tempIndexArray[2]);
             indexArray.push(tempIndexArray[1]);
             indexArray.push(tempIndexArray[0]);
             indexArray.push(tempIndexArray[2]);
             indexArray.push(tempIndexArray[0]);
             indexArray.push(tempIndexArray[3]);
             polyIndexArray.push([tempIndexArray[3],tempIndexArray[2],tempIndexArray[1],tempIndexArray[0]]);
            } else {
             indexArray.push(tempIndexArray[0]);
             indexArray.push(tempIndexArray[1]);
             indexArray.push(tempIndexArray[2]);
             indexArray.push(tempIndexArray[0]);
             indexArray.push(tempIndexArray[2]);
             indexArray.push(tempIndexArray[3]);
             polyIndexArray.push([tempIndexArray[0],tempIndexArray[1],tempIndexArray[2],tempIndexArray[3]]);
            }
             currentGroup[1]+=6;
             
          } else { // triangle
            if (invertFaces) {
             indexArray.push(tempIndexArray[2]);
             indexArray.push(tempIndexArray[1]);
             indexArray.push(tempIndexArray[0]);
             polyIndexArray.push([tempIndexArray[2],tempIndexArray[1],tempIndexArray[0]]);
            } else {
             indexArray.push(tempIndexArray[0]);
             indexArray.push(tempIndexArray[1]);
             indexArray.push(tempIndexArray[2]);
             polyIndexArray.push([tempIndexArray[0],tempIndexArray[1],tempIndexArray[2]]);
            }
            currentGroup[1]+=3;
          }}
        }
  }
  
  // recompute the normals
  if (recomputeNormals) {
    for (let i=0;i<normalArray.length;i++) {						 
      normalArray[i]=0;
    }
    let x0 = new J3DIVector3();
    let x1 = new J3DIVector3();
    let x2 = new J3DIVector3();
    let x0tox1 = new J3DIVector3();
    let x0tox2 = new J3DIVector3();
    let x1tox2 = new J3DIVector3();
    let x1tox0 = new J3DIVector3();
    let n = new J3DIVector3();
    
    for (let i=0;i<indexArray.length;i+=3) {						 
      x0.load( vertexArray[indexArray[i]*3],  
                                vertexArray[indexArray[i]*3+1],
                                vertexArray[indexArray[i]*3+2]);
      x1.load( vertexArray[indexArray[i+1]*3],  
                                vertexArray[indexArray[i+1]*3+1],
                                vertexArray[indexArray[i+1]*3+2]);
      x2.load( vertexArray[indexArray[i+2]*3],  
                                vertexArray[indexArray[i+2]*3+1],
                                vertexArray[indexArray[i+2]*3+2]);
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
      normalArray[indexArray[i]*3]+=n[0]*a0;
      normalArray[indexArray[i]*3+1]+=n[1]*a0;
      normalArray[indexArray[i]*3+2]+=n[2]*a0;
      normalArray[indexArray[i+1]*3]+=n[0]*a1;
      normalArray[indexArray[i+1]*3+1]+=n[1]*a1;
      normalArray[indexArray[i+1]*3+2]+=n[2]*a1;
      normalArray[indexArray[i+2]*3]+=n[0]*a2;
      normalArray[indexArray[i+2]*3+1]+=n[1]*a2;
      normalArray[indexArray[i+2]*3+2]+=n[2]*a2;
    }

    // now, normalize the normals    
    for (let i=0;i<normalArray.length;i+=3) {
      let len = Math.sqrt(
                  normalArray[i]*normalArray[i]
                  + normalArray[i + 1]*normalArray[i + 1]
                  + normalArray[i + 2]*normalArray[i + 2]
                );
      normalArray[i] /= len;
      normalArray[i+1] /= len;
      normalArray[i+2] /= len;
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
let loadImageTexture = function (ctx, url,callback,errorCallback)
{
    if (ctx == null) {
      let texture = {};
      texture.image = new Image();
      texture.image.onload = function() { if (callback) callback(); };
      texture.image.src = url;
      return texture;
    } else {
      let texture = ctx.createTexture();
      texture.image = new Image();
      texture.image.onload = function() { doLoadImageTexture(ctx, texture.image, texture,callback,errorCallback) }
      texture.image.src = url;
      return texture;
    }
};

/*
 * Original code by Apple Inc.
 */
let doLoadImageTexture = function (ctx, image, texture,callback,errorCallback)
{
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
    
    if (callback) callback();
};

/**
 * Creates the HTLM for a failure message
 * @param {string} canvasContainerId id of container of th
 *        canvas.
 * @return {string} The html.
 */
let makeFailHTML = function(msg) {
  return '' +
    '<table style="background-color: #8CE; width: 100%; height: 100%;"><tr>' +
    '<td align="center">' +
    '<div style="display: table-cell; vertical-align: middle;">' +
    '<div style="">' + msg + '</div>' +
    '</div>' +
    '</td></tr></table>';
};

/**
 * Mesasge for getting a webgl browser
 * @type {string}
 */
let GET_A_WEBGL_BROWSER_MSG = 'This page requires a browser that supports WebGL.';
let GET_A_WEBGL_BROWSER = '' +
  GET_A_WEBGL_BROWSER_MSG+'<br/>' +
  '<a href="http://get.webgl.org">Click here to upgrade your browser.</a>';

/**
 * Message for need better hardware
 * @type {string}
 */
let OTHER_PROBLEM_MSG= "It doesn't appear your computer can support WebGL.";
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
let setupWebGL = function(canvas, opt_attribs, showLinkOnError) {
  function showLink(str) {
    let container = canvas.parentNode;
    if (container) {
      container.innerHTML = makeFailHTML(str);
    }
  };

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
let create3DContext = function(canvas, opt_attribs) {
  let names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
  let context = null;
  for (let ii = 0; ii < names.length; ++ii) {
    try {
      context = canvas.getContext(names[ii], opt_attribs);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  return context;
}



// ------------------
// MODULE API    
// ------------------
return {
  J3DIObj: J3DIObj,
  newJ3DIObj : function() { return new J3DIObj(); },
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
});


/*
 * @(#)J3DIMath.js  1.1  2012-06-17
 */
/*
 * Copyright (C) 2009 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * This software is provided by Apple Inc. ``as is'' and any
 * express or implied warranties, including, but not limited to, the
 * implied warranties of merchantability and fitness for a particular
 * purpose are disclaimed.  in no event shall apple inc. or
 * contributors be liable for any direct, indirect, incidental, special,
 * exemplary, or consequential damages (including, but not limited to,
 * procurement of substitute goods or services; loss of use, data, or
 * profits; or business interruption) however caused and on any theory
 * of liability, whether in contract, strict liability, or tort
 * (including negligence or otherwise) arising in any way out of the use
 * of this software, even if advised of the possibility of such damage.
 *
 * Enhancements:
 * 1.2   2014-02-02 Werner Randelshofer. Integrates now with Require.js. Adds intersection tests.
 * 1.1   2012-06-17 Werner Randelshofer. Adds world function.
 * 1.0.3 2012-06-15 Werner Randelshofer. Fixes lookAt function.
 * 1.0.2 2012-06-09 Werner Randelshofer. Fixes lookAt function.
 * 1.0.1 2011-06-22 Werner Randelshofer. Adds arithmetic functions.
 */
"use strict";
// BEGIN Misc functions
function formatNumber(number,digits)
{
  if (digits === undefined) {
    digits = 2;
  }
  let a = number.toString().split('e');
  let str = +(+a[0]).toFixed(digits);
  if (a.length > 1) {
    str += 'e'+a[1];
  }
  return str;
}
// END Misc functions

// J3DI (Jedi) - A support library for WebGL.

/*
    J3DI Math Classes. Currently includes:

        J3DIMatrix4 - A 4x4 Matrix
*/

/*
    J3DIMatrix4 class

    This class implements a 4x4 matrix. It has functions which duplicate the
    functionality of the OpenGL matrix stack and glut functions. On browsers
    that support it, CSSMatrix is used to accelerate operations.

    IDL:

    [
        Constructor(in J3DIMatrix4 matrix),                 // copy passed matrix into new J3DIMatrix4
        Constructor(in sequence<float> array)               // create new J3DIMatrix4 with 16 floats (row major)
        Constructor()                                       // create new J3DIMatrix4 with identity matrix
    ]
    interface J3DIMatrix4 {
        void load(in J3DIMatrix4 matrix);                   // copy the values from the passed matrix
        void load(in sequence<float> array);                // copy 16 floats into the matrix
        sequence<float> getAsArray();                       // return the matrix as an array of 16 floats
        Float32Array getAsFloat32Array();             // return the matrix as a Float32Array with 16 values
        void setUniform(in WebGLRenderingContext ctx,       // Send the matrix to the passed uniform location in the passed context
                        in WebGLUniformLocation loc,
                        in boolean transpose);
        void makeIdentity();                                // replace the matrix with identity
        void transpose();                                   // replace the matrix with its transpose. Return this.
        void invert();                                      // replace the matrix with its inverse

        void translate(in float x, in float y, in float z); // multiply the matrix by passed translation values on the right
        void translate(in J3DVector3 v);                    // multiply the matrix by passed translation values on the right
        void scale(in float x, in float y, in float z);     // multiply the matrix by passed scale values on the right
        void scale(in J3DVector3 v);                        // multiply the matrix by passed scale values on the right
        void rotate(in float angle,                         // multiply the matrix by passed rotation values on the right
                    in float x, in float y, in float z);    // (angle is in degrees). return this.
        void rotate(in float angle, in J3DVector3 v);       // multiply the matrix by passed rotation values on the right
                                                            // (angle is in degrees). return this.
        void multiply(in J3DIMatrix4 matrix);               // multiply the matrix by the passed matrix on the right. return this.
        void premultiply(in J3DIMatrix4 matrix);               // multiply the matrix by the passed matrix on the left. return this.
        void multiply(float factor);                        // multiply the matrix by the passed factor
        void divide(in float divisor);                      // divide the matrix by the passed divisor
        void ortho(in float left, in float right,           // multiply the matrix by the passed ortho values on the right
                   in float bottom, in float top,
                   in float near, in float far);
        void frustum(in float left, in float right,         // multiply the matrix by the passed frustum values on the right
                     in float bottom, in float top,
                     in float near, in float far);
        void perspective(in float fovy, in float aspect,    // multiply the matrix by the passed perspective values on the right
                         in float zNear, in float zFar);
        void lookat(in J3DVector3 eye,                      // multiply the matrix by the passed lookat
                    in J3DVector3 center,                   // values on the right
                    in J3DVector3 up);   
        bool decompose(in J3DVector3 translate,            // decompose the matrix into the passed vector
                        in J3DVector3 rotate,
                        in J3DVector3 scale,
                        in J3DVector3 skew,
                        in sequence<float> perspective);
        J3DIVector3 loghat();                              // Computes the inverse of the exponential map operation
        float trace();                                     // Returns the trace of the matrix (sum of the diagonal elements)
    }

    [
        Constructor(in J3DVector3 vector),                  // copy passed vector into new J3DVector3
        Constructor(in sequence<float> array)               // create new J3DVector3 with 3 floats from array
        Constructor(in float x, in float y, in float z)     // create new J3DVector3 with 3 floats
        Constructor()                                       // create new J3DVector3 with (0,0,0)
    ]
    interface J3DIVector3 {
        void load(in J3DVector3 vector);                    // copy the values from the passed vector
        void load(in sequence<float> array);                // copy 3 floats into the vector from array
        void load(in float x, in float y, in float z);      // copy 3 floats into the vector
        sequence<float> getAsArray();                       // return the vector as an array of 3 floats
        Float32Array getAsFloat32Array();                   // return the matrix as a Float32Array with 16 values
        void multVecMatrix(in J3DIMatrix4 matrix);          // multiply the vector by the passed matrix (on the right)
        void multNormalMatrix(in J3DIMatrix4 matrix);       // multiply the vector by the passed matrix (on the right)
                                                            // treating the vector as a surface normal.
                                                            
        float vectorLength();                               // return the length of the vector
        float dot();                                        // return the dot product of the vector
        void cross(in J3DVector3 v);                        // replace the vector with vector x v
        void divide(in float/J3DVector divisor);            // divide the vector by the passed divisor
        J3DVector3 subtract(in J3DVector3 v);               // subtract another vector from this. return this.
        J3DVector3 multiply(in J3DVector3 v);               // multiply another vector with this. return this.
        J3DVector3 normalize();                             // normalizes the vector by dividing all values by its norm. return this.
        J3DVector3 reflect(in J3DVector3 v);                // reflect this vector at v. return this.
        float norm();                                       // returns the norm of the vector. (same as vectorLength)
        J3DIMatrix4 exphat();                               // Computes the exponential map operation
        J3DIMatrix4 hat();                                  // Computes the hat operation
    }
		
    [
        Constructor(in J3DVector3 vector),                  // copy passed vector into new J3DVertexArray
        Constructor(in sequence<float> array)               // create new J3DVertexArray with floats from array
        Constructor()                                       // create new J3DVertexArray with empty array []
    ]
    interface J3DIVertexArray {
        void load(in array vector);                         // copy the values from the passed array
        void multVecMatrix(in J3DIMatrix4 matrix);             // multiply the vertex array by the passed matrix (on the right)
        J3DVector3 rawNormal(in int i1, in int i2, in int i3);          // compute unnormalized surface normal from the given 3 vertex indices.
        J3DVector3 rawZ(in int i1, in int i2, in int i3);          // compute z-value of unnormalized surface normal from the given 3 vertex indices.
        J3DVector3 normal(in int i1, in int i2, in int i3); // compute surface normal from the given 3 vertex indices.
    }
    
    // Interpolation function
    static {
        elerp(in J3DIMatrix4 R1,           // Performs an exponential map interpolation from R1 to R2 by lambda in [0,1]
                       in J3DIMatrix4 R2, 
                       in float lambda)
                                                             
        rigidLerp(in J3DIMatrix4 T1,       // Performs an interpolation from rigid matrix T1 to T2 by lambda in [0,1]
                       in J3DIMatrix4 T2, 
                       in float lambda)
                       
        clamp(in value, in min, in max)    // clamps a value to min, max.
    }
    
    
*/

let J3DIHasCSSMatrix = false;
let J3DIHasCSSMatrixCopy = false;

if ("WebKitCSSMatrix" in window && ("media" in window && window.media.matchMedium("(-webkit-transform-3d)")) ||
                                   ("styleMedia" in window && window.styleMedia.matchMedium("(-webkit-transform-3d)"))) {
    J3DIHasCSSMatrix = true;
    if ("copy" in WebKitCSSMatrix.prototype)
        J3DIHasCSSMatrixCopy = true;
}

 // console.log("J3DIHasCSSMatrix="+J3DIHasCSSMatrix);
 // console.log("J3DIHasCSSMatrixCopy="+J3DIHasCSSMatrixCopy);

//
// J3DIMatrix4
//
class J3DIMatrix4 {
  constructor(m) {
    if (J3DIHasCSSMatrix)
        this.$matrix = new WebKitCSSMatrix;
    else
        this.$matrix = new Object;

    if (typeof m == 'object') {
        if ("length" in m && m.length >= 16) {
            this.load(m);
            return;
        }
        else if (m instanceof J3DIMatrix4) {
            this.load(m);
            return;
        }
    }
    this.makeIdentity();
  }
}

J3DIMatrix4.prototype.load = function()
{
    if (arguments.length == 1 && typeof arguments[0] == 'object') {
        let matrix;

        if (arguments[0] instanceof J3DIMatrix4) {
            matrix = arguments[0].$matrix;

            this.$matrix.m11 = matrix.m11;
            this.$matrix.m12 = matrix.m12;
            this.$matrix.m13 = matrix.m13;
            this.$matrix.m14 = matrix.m14;

            this.$matrix.m21 = matrix.m21;
            this.$matrix.m22 = matrix.m22;
            this.$matrix.m23 = matrix.m23;
            this.$matrix.m24 = matrix.m24;

            this.$matrix.m31 = matrix.m31;
            this.$matrix.m32 = matrix.m32;
            this.$matrix.m33 = matrix.m33;
            this.$matrix.m34 = matrix.m34;

            this.$matrix.m41 = matrix.m41;
            this.$matrix.m42 = matrix.m42;
            this.$matrix.m43 = matrix.m43;
            this.$matrix.m44 = matrix.m44;
            return;
        }
        else
            matrix = arguments[0];

        if ("length" in matrix && matrix.length >= 16) {
            this.$matrix.m11 = matrix[0];
            this.$matrix.m12 = matrix[1];
            this.$matrix.m13 = matrix[2];
            this.$matrix.m14 = matrix[3];

            this.$matrix.m21 = matrix[4];
            this.$matrix.m22 = matrix[5];
            this.$matrix.m23 = matrix[6];
            this.$matrix.m24 = matrix[7];

            this.$matrix.m31 = matrix[8];
            this.$matrix.m32 = matrix[9];
            this.$matrix.m33 = matrix[10];
            this.$matrix.m34 = matrix[11];

            this.$matrix.m41 = matrix[12];
            this.$matrix.m42 = matrix[13];
            this.$matrix.m43 = matrix[14];
            this.$matrix.m44 = matrix[15];
            return;
        }
    }

    this.makeIdentity();
    return this;
}

J3DIMatrix4.prototype.getAsArray = function()
{
    return [
        this.$matrix.m11, this.$matrix.m12, this.$matrix.m13, this.$matrix.m14,
        this.$matrix.m21, this.$matrix.m22, this.$matrix.m23, this.$matrix.m24,
        this.$matrix.m31, this.$matrix.m32, this.$matrix.m33, this.$matrix.m34,
        this.$matrix.m41, this.$matrix.m42, this.$matrix.m43, this.$matrix.m44
    ];
}
J3DIMatrix4.prototype.toString = function()
{
    let m=this.$matrix;
    return "["+m.m11+" "+m.m12+" "+m.m13+" "+m.m14+";"
              +m.m21+" "+m.m22+" "+m.m23+" "+m.m24+";"
              +m.m31+" "+m.m32+" "+m.m33+" "+m.m34+";"
              +m.m41+" "+m.m42+" "+m.m43+" "+m.m44+";"
            +"]";
}

J3DIMatrix4.prototype.getAsFloat32Array = function()
{
    if (J3DIHasCSSMatrixCopy) {
        let array = new Float32Array(16);
        this.$matrix.copy(array);
        return array;
    }
    return new Float32Array(this.getAsArray());
}

J3DIMatrix4.prototype.setUniform = function(ctx, loc, transpose)
{
    if (J3DIMatrix4.setUniformArray == undefined) {
        J3DIMatrix4.setUniformWebGLArray = new Float32Array(16);
        J3DIMatrix4.setUniformArray = new Array(16);
    }

    if (J3DIHasCSSMatrixCopy)
        this.$matrix.copy(J3DIMatrix4.setUniformWebGLArray);
    else {
        J3DIMatrix4.setUniformArray[0] = this.$matrix.m11;
        J3DIMatrix4.setUniformArray[1] = this.$matrix.m12;
        J3DIMatrix4.setUniformArray[2] = this.$matrix.m13;
        J3DIMatrix4.setUniformArray[3] = this.$matrix.m14;
        J3DIMatrix4.setUniformArray[4] = this.$matrix.m21;
        J3DIMatrix4.setUniformArray[5] = this.$matrix.m22;
        J3DIMatrix4.setUniformArray[6] = this.$matrix.m23;
        J3DIMatrix4.setUniformArray[7] = this.$matrix.m24;
        J3DIMatrix4.setUniformArray[8] = this.$matrix.m31;
        J3DIMatrix4.setUniformArray[9] = this.$matrix.m32;
        J3DIMatrix4.setUniformArray[10] = this.$matrix.m33;
        J3DIMatrix4.setUniformArray[11] = this.$matrix.m34;
        J3DIMatrix4.setUniformArray[12] = this.$matrix.m41;
        J3DIMatrix4.setUniformArray[13] = this.$matrix.m42;
        J3DIMatrix4.setUniformArray[14] = this.$matrix.m43;
        J3DIMatrix4.setUniformArray[15] = this.$matrix.m44;

        J3DIMatrix4.setUniformWebGLArray.set(J3DIMatrix4.setUniformArray);
    }

    ctx.uniformMatrix4fv(loc, transpose, J3DIMatrix4.setUniformWebGLArray);
}

J3DIMatrix4.prototype.makeIdentity = function()
{
    this.$matrix.m11 = 1;
    this.$matrix.m12 = 0;
    this.$matrix.m13 = 0;
    this.$matrix.m14 = 0;

    this.$matrix.m21 = 0;
    this.$matrix.m22 = 1;
    this.$matrix.m23 = 0;
    this.$matrix.m24 = 0;

    this.$matrix.m31 = 0;
    this.$matrix.m32 = 0;
    this.$matrix.m33 = 1;
    this.$matrix.m34 = 0;

    this.$matrix.m41 = 0;
    this.$matrix.m42 = 0;
    this.$matrix.m43 = 0;
    this.$matrix.m44 = 1;
}

J3DIMatrix4.prototype.transpose = function()
{
    let tmp = this.$matrix.m12;
    this.$matrix.m12 = this.$matrix.m21;
    this.$matrix.m21 = tmp;

    tmp = this.$matrix.m13;
    this.$matrix.m13 = this.$matrix.m31;
    this.$matrix.m31 = tmp;

    tmp = this.$matrix.m14;
    this.$matrix.m14 = this.$matrix.m41;
    this.$matrix.m41 = tmp;

    tmp = this.$matrix.m23;
    this.$matrix.m23 = this.$matrix.m32;
    this.$matrix.m32 = tmp;

    tmp = this.$matrix.m24;
    this.$matrix.m24 = this.$matrix.m42;
    this.$matrix.m42 = tmp;

    tmp = this.$matrix.m34;
    this.$matrix.m34 = this.$matrix.m43;
    this.$matrix.m43 = tmp;
    
    return this;
}

J3DIMatrix4.prototype.invert = function()
{
    if (J3DIHasCSSMatrix) {
        this.$matrix = this.$matrix.inverse();
        return;
    }

    // Calculate the 4x4 determinant
    // If the determinant is zero,
    // then the inverse matrix is not unique.
    let det = this._determinant4x4();

    if (Math.abs(det) < 1e-8)
        return null;

    this._makeAdjoint();

    // Scale the adjoint matrix to get the inverse
    this.$matrix.m11 /= det;
    this.$matrix.m12 /= det;
    this.$matrix.m13 /= det;
    this.$matrix.m14 /= det;

    this.$matrix.m21 /= det;
    this.$matrix.m22 /= det;
    this.$matrix.m23 /= det;
    this.$matrix.m24 /= det;

    this.$matrix.m31 /= det;
    this.$matrix.m32 /= det;
    this.$matrix.m33 /= det;
    this.$matrix.m34 /= det;

    this.$matrix.m41 /= det;
    this.$matrix.m42 /= det;
    this.$matrix.m43 /= det;
    this.$matrix.m44 /= det;
}

J3DIMatrix4.prototype.translate = function(x,y,z)
{
    if (typeof x == 'object' && ("length" in x || "vectorLength" in x)) {
        let t = x;
        x = t[0];
        y = t[1];
        z = t[2];
    }
    else {
        if (x == undefined)
            x = 0;
        if (y == undefined)
            y = 0;
        if (z == undefined)
            z = 0;
    }

    if (J3DIHasCSSMatrix) {
        this.$matrix = this.$matrix.translate(x, y, z);
        return;
    }

    let matrix = new J3DIMatrix4();
    matrix.$matrix.m41 = x;
    matrix.$matrix.m42 = y;
    matrix.$matrix.m43 = z;

    this.multiply(matrix);
		return this;
}

J3DIMatrix4.prototype.scale = function(x,y,z)
{
    if (typeof x == 'object' && "length" in x) {
        let t = x;
        x = t[0];
        y = t[1];
        z = t[2];
    }
    else {
        if (x == undefined)
            x = 1;
        if (z == undefined) {
            if (y == undefined) {
                y = x;
                z = x;
            }
            else
                z = 1;
        }
        else if (y == undefined)
            y = x;
    }

    if (J3DIHasCSSMatrix) {
        this.$matrix = this.$matrix.scale(x, y, z);
        return this;
    }

    let matrix = new J3DIMatrix4();
    matrix.$matrix.m11 = x;
    matrix.$matrix.m22 = y;
    matrix.$matrix.m33 = z;

    this.multiply(matrix);
    return this;
}

J3DIMatrix4.prototype.rotate = function(angle,x,y,z)
{
    // Forms are (angle, x,y,z), (angle,vector), (angleX, angleY, angleZ), (angle)
    if (typeof x == 'object' && "length" in x) {
        let t = x;
        x = t[0];
        y = t[1];
        z = t[2];
    }
    else {
        if (arguments.length == 1) {
            x = 0;
            y = 0;
            z = 1;
        }
        else if (arguments.length == 3) {
            this.rotate(angle, 1,0,0); // about X axis
            this.rotate(x, 0,1,0); // about Y axis
            this.rotate(y, 0,0,1); // about Z axis
            return;
        }
    }

    if (J3DIHasCSSMatrix) {
        this.$matrix = this.$matrix.rotateAxisAngle(x, y, z, angle);
        return this;
    }

    // angles are in degrees. Switch to radians
    angle = angle / 180 * Math.PI;

    angle /= 2;
    let sinA = Math.sin(angle);
    let cosA = Math.cos(angle);
    let sinA2 = sinA * sinA;

    // normalize
    let len = Math.sqrt(x * x + y * y + z * z);
    if (len == 0) {
        // bad vector, just use something reasonable
        x = 0;
        y = 0;
        z = 1;
    } else if (len != 1) {
        x /= len;
        y /= len;
        z /= len;
    }

    let mat = new J3DIMatrix4();

    // optimize case where axis is along major axis
    if (x == 1 && y == 0 && z == 0) {
        mat.$matrix.m11 = 1;
        mat.$matrix.m12 = 0;
        mat.$matrix.m13 = 0;
        mat.$matrix.m21 = 0;
        mat.$matrix.m22 = 1 - 2 * sinA2;
        mat.$matrix.m23 = 2 * sinA * cosA;
        mat.$matrix.m31 = 0;
        mat.$matrix.m32 = -2 * sinA * cosA;
        mat.$matrix.m33 = 1 - 2 * sinA2;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    } else if (x == 0 && y == 1 && z == 0) {
        mat.$matrix.m11 = 1 - 2 * sinA2;
        mat.$matrix.m12 = 0;
        mat.$matrix.m13 = -2 * sinA * cosA;
        mat.$matrix.m21 = 0;
        mat.$matrix.m22 = 1;
        mat.$matrix.m23 = 0;
        mat.$matrix.m31 = 2 * sinA * cosA;
        mat.$matrix.m32 = 0;
        mat.$matrix.m33 = 1 - 2 * sinA2;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    } else if (x == 0 && y == 0 && z == 1) {
        mat.$matrix.m11 = 1 - 2 * sinA2;
        mat.$matrix.m12 = 2 * sinA * cosA;
        mat.$matrix.m13 = 0;
        mat.$matrix.m21 = -2 * sinA * cosA;
        mat.$matrix.m22 = 1 - 2 * sinA2;
        mat.$matrix.m23 = 0;
        mat.$matrix.m31 = 0;
        mat.$matrix.m32 = 0;
        mat.$matrix.m33 = 1;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    } else {
        let x2 = x*x;
        let y2 = y*y;
        let z2 = z*z;

        mat.$matrix.m11 = 1 - 2 * (y2 + z2) * sinA2;
        mat.$matrix.m12 = 2 * (x * y * sinA2 + z * sinA * cosA);
        mat.$matrix.m13 = 2 * (x * z * sinA2 - y * sinA * cosA);
        mat.$matrix.m21 = 2 * (y * x * sinA2 - z * sinA * cosA);
        mat.$matrix.m22 = 1 - 2 * (z2 + x2) * sinA2;
        mat.$matrix.m23 = 2 * (y * z * sinA2 + x * sinA * cosA);
        mat.$matrix.m31 = 2 * (z * x * sinA2 + y * sinA * cosA);
        mat.$matrix.m32 = 2 * (z * y * sinA2 - x * sinA * cosA);
        mat.$matrix.m33 = 1 - 2 * (x2 + y2) * sinA2;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    }
    this.multiply(mat);
		return this;
}

J3DIMatrix4.prototype.multiply = function(mat)
{
    if (typeof mat == 'object' && "$matrix" in mat) {
  
      if (J3DIHasCSSMatrix) {
          this.$matrix = this.$matrix.multiply(mat.$matrix);
          return this;
      }
  
      let m11 = (mat.$matrix.m11 * this.$matrix.m11 + mat.$matrix.m12 * this.$matrix.m21
                 + mat.$matrix.m13 * this.$matrix.m31 + mat.$matrix.m14 * this.$matrix.m41);
      let m12 = (mat.$matrix.m11 * this.$matrix.m12 + mat.$matrix.m12 * this.$matrix.m22
                 + mat.$matrix.m13 * this.$matrix.m32 + mat.$matrix.m14 * this.$matrix.m42);
      let m13 = (mat.$matrix.m11 * this.$matrix.m13 + mat.$matrix.m12 * this.$matrix.m23
                 + mat.$matrix.m13 * this.$matrix.m33 + mat.$matrix.m14 * this.$matrix.m43);
      let m14 = (mat.$matrix.m11 * this.$matrix.m14 + mat.$matrix.m12 * this.$matrix.m24
                 + mat.$matrix.m13 * this.$matrix.m34 + mat.$matrix.m14 * this.$matrix.m44);
  
      let m21 = (mat.$matrix.m21 * this.$matrix.m11 + mat.$matrix.m22 * this.$matrix.m21
                 + mat.$matrix.m23 * this.$matrix.m31 + mat.$matrix.m24 * this.$matrix.m41);
      let m22 = (mat.$matrix.m21 * this.$matrix.m12 + mat.$matrix.m22 * this.$matrix.m22
                 + mat.$matrix.m23 * this.$matrix.m32 + mat.$matrix.m24 * this.$matrix.m42);
      let m23 = (mat.$matrix.m21 * this.$matrix.m13 + mat.$matrix.m22 * this.$matrix.m23
                 + mat.$matrix.m23 * this.$matrix.m33 + mat.$matrix.m24 * this.$matrix.m43);
      let m24 = (mat.$matrix.m21 * this.$matrix.m14 + mat.$matrix.m22 * this.$matrix.m24
                 + mat.$matrix.m23 * this.$matrix.m34 + mat.$matrix.m24 * this.$matrix.m44);
  
      let m31 = (mat.$matrix.m31 * this.$matrix.m11 + mat.$matrix.m32 * this.$matrix.m21
                 + mat.$matrix.m33 * this.$matrix.m31 + mat.$matrix.m34 * this.$matrix.m41);
      let m32 = (mat.$matrix.m31 * this.$matrix.m12 + mat.$matrix.m32 * this.$matrix.m22
                 + mat.$matrix.m33 * this.$matrix.m32 + mat.$matrix.m34 * this.$matrix.m42);
      let m33 = (mat.$matrix.m31 * this.$matrix.m13 + mat.$matrix.m32 * this.$matrix.m23
                 + mat.$matrix.m33 * this.$matrix.m33 + mat.$matrix.m34 * this.$matrix.m43);
      let m34 = (mat.$matrix.m31 * this.$matrix.m14 + mat.$matrix.m32 * this.$matrix.m24
                 + mat.$matrix.m33 * this.$matrix.m34 + mat.$matrix.m34 * this.$matrix.m44);
  
      let m41 = (mat.$matrix.m41 * this.$matrix.m11 + mat.$matrix.m42 * this.$matrix.m21
                 + mat.$matrix.m43 * this.$matrix.m31 + mat.$matrix.m44 * this.$matrix.m41);
      let m42 = (mat.$matrix.m41 * this.$matrix.m12 + mat.$matrix.m42 * this.$matrix.m22
                 + mat.$matrix.m43 * this.$matrix.m32 + mat.$matrix.m44 * this.$matrix.m42);
      let m43 = (mat.$matrix.m41 * this.$matrix.m13 + mat.$matrix.m42 * this.$matrix.m23
                 + mat.$matrix.m43 * this.$matrix.m33 + mat.$matrix.m44 * this.$matrix.m43);
      let m44 = (mat.$matrix.m41 * this.$matrix.m14 + mat.$matrix.m42 * this.$matrix.m24
                 + mat.$matrix.m43 * this.$matrix.m34 + mat.$matrix.m44 * this.$matrix.m44);
  
      this.$matrix.m11 = m11;
      this.$matrix.m12 = m12;
      this.$matrix.m13 = m13;
      this.$matrix.m14 = m14;
  
      this.$matrix.m21 = m21;
      this.$matrix.m22 = m22;
      this.$matrix.m23 = m23;
      this.$matrix.m24 = m24;
  
      this.$matrix.m31 = m31;
      this.$matrix.m32 = m32;
      this.$matrix.m33 = m33;
      this.$matrix.m34 = m34;
  
      this.$matrix.m41 = m41;
      this.$matrix.m42 = m42;
      this.$matrix.m43 = m43;
      this.$matrix.m44 = m44;
    } else {
      this.$matrix.m11 *= mat;
      this.$matrix.m12 *= mat;
      this.$matrix.m13 *= mat;
      this.$matrix.m14 *= mat;
  
      this.$matrix.m21 *= mat;
      this.$matrix.m22 *= mat;
      this.$matrix.m23 *= mat;
      this.$matrix.m24 *= mat;
  
      this.$matrix.m31 *= mat;
      this.$matrix.m32 *= mat;
      this.$matrix.m33 *= mat;
      this.$matrix.m34 *= mat;
  
      this.$matrix.m41 *= mat;
      this.$matrix.m42 *= mat;
      this.$matrix.m43 *= mat;
      this.$matrix.m44 *= mat;
    }
    
    return this;
}

J3DIMatrix4.prototype.premultiply = function(mat)
{
    if (typeof mx2 == 'object' && "$matrix" in mat) {
  
      if (J3DIHasCSSMatrix) {
          this.$matrix = mat.$matrix.multiply(this.$matrix);
          return mx1;
      }
  
      let mx1 = mat;
      let mx2 = this;
      
      let m11 = (mx2.$matrix.m11 * mx1.$matrix.m11 + mx2.$matrix.m12 * mx1.$matrix.m21
                 + mx2.$matrix.m13 * mx1.$matrix.m31 + mx2.$matrix.m14 * mx1.$matrix.m41);
      let m12 = (mx2.$matrix.m11 * mx1.$matrix.m12 + mx2.$matrix.m12 * mx1.$matrix.m22
                 + mx2.$matrix.m13 * mx1.$matrix.m32 + mx2.$matrix.m14 * mx1.$matrix.m42);
      let m13 = (mx2.$matrix.m11 * mx1.$matrix.m13 + mx2.$matrix.m12 * mx1.$matrix.m23
                 + mx2.$matrix.m13 * mx1.$matrix.m33 + mx2.$matrix.m14 * mx1.$matrix.m43);
      let m14 = (mx2.$matrix.m11 * mx1.$matrix.m14 + mx2.$matrix.m12 * mx1.$matrix.m24
                 + mx2.$matrix.m13 * mx1.$matrix.m34 + mx2.$matrix.m14 * mx1.$matrix.m44);
  
      let m21 = (mx2.$matrix.m21 * mx1.$matrix.m11 + mx2.$matrix.m22 * mx1.$matrix.m21
                 + mx2.$matrix.m23 * mx1.$matrix.m31 + mx2.$matrix.m24 * mx1.$matrix.m41);
      let m22 = (mx2.$matrix.m21 * mx1.$matrix.m12 + mx2.$matrix.m22 * mx1.$matrix.m22
                 + mx2.$matrix.m23 * mx1.$matrix.m32 + mx2.$matrix.m24 * mx1.$matrix.m42);
      let m23 = (mx2.$matrix.m21 * mx1.$matrix.m13 + mx2.$matrix.m22 * mx1.$matrix.m23
                 + mx2.$matrix.m23 * mx1.$matrix.m33 + mx2.$matrix.m24 * mx1.$matrix.m43);
      let m24 = (mx2.$matrix.m21 * mx1.$matrix.m14 + mx2.$matrix.m22 * mx1.$matrix.m24
                 + mx2.$matrix.m23 * mx1.$matrix.m34 + mx2.$matrix.m24 * mx1.$matrix.m44);
  
      let m31 = (mx2.$matrix.m31 * mx1.$matrix.m11 + mx2.$matrix.m32 * mx1.$matrix.m21
                 + mx2.$matrix.m33 * mx1.$matrix.m31 + mx2.$matrix.m34 * mx1.$matrix.m41);
      let m32 = (mx2.$matrix.m31 * mx1.$matrix.m12 + mx2.$matrix.m32 * mx1.$matrix.m22
                 + mx2.$matrix.m33 * mx1.$matrix.m32 + mx2.$matrix.m34 * mx1.$matrix.m42);
      let m33 = (mx2.$matrix.m31 * mx1.$matrix.m13 + mx2.$matrix.m32 * mx1.$matrix.m23
                 + mx2.$matrix.m33 * mx1.$matrix.m33 + mx2.$matrix.m34 * mx1.$matrix.m43);
      let m34 = (mx2.$matrix.m31 * mx1.$matrix.m14 + mx2.$matrix.m32 * mx1.$matrix.m24
                 + mx2.$matrix.m33 * mx1.$matrix.m34 + mx2.$matrix.m34 * mx1.$matrix.m44);
  
      let m41 = (mx2.$matrix.m41 * mx1.$matrix.m11 + mx2.$matrix.m42 * mx1.$matrix.m21
                 + mx2.$matrix.m43 * mx1.$matrix.m31 + mx2.$matrix.m44 * mx1.$matrix.m41);
      let m42 = (mx2.$matrix.m41 * mx1.$matrix.m12 + mx2.$matrix.m42 * mx1.$matrix.m22
                 + mx2.$matrix.m43 * mx1.$matrix.m32 + mx2.$matrix.m44 * mx1.$matrix.m42);
      let m43 = (mx2.$matrix.m41 * mx1.$matrix.m13 + mx2.$matrix.m42 * mx1.$matrix.m23
                 + mx2.$matrix.m43 * mx1.$matrix.m33 + mx2.$matrix.m44 * mx1.$matrix.m43);
      let m44 = (mx2.$matrix.m41 * mx1.$matrix.m14 + mx2.$matrix.m42 * mx1.$matrix.m24
                 + mx2.$matrix.m43 * mx1.$matrix.m34 + mx2.$matrix.m44 * mx1.$matrix.m44);
  
      this.$matrix.m11 = m11;
      this.$matrix.m12 = m12;
      this.$matrix.m13 = m13;
      this.$matrix.m14 = m14;
  
      this.$matrix.m21 = m21;
      this.$matrix.m22 = m22;
      this.$matrix.m23 = m23;
      this.$matrix.m24 = m24;
  
      this.$matrix.m31 = m31;
      this.$matrix.m32 = m32;
      this.$matrix.m33 = m33;
      this.$matrix.m34 = m34;
  
      this.$matrix.m41 = m41;
      this.$matrix.m42 = m42;
      this.$matrix.m43 = m43;
      this.$matrix.m44 = m44;
    } else {
      this.$matrix.m11 *= mat;
      this.$matrix.m12 *= mat;
      this.$matrix.m13 *= mat;
      this.$matrix.m14 *= mat;
  
      this.$matrix.m21 *= mat;
      this.$matrix.m22 *= mat;
      this.$matrix.m23 *= mat;
      this.$matrix.m24 *= mat;
  
      this.$matrix.m31 *= mat;
      this.$matrix.m32 *= mat;
      this.$matrix.m33 *= mat;
      this.$matrix.m34 *= mat;
  
      this.$matrix.m41 *= mat;
      this.$matrix.m42 *= mat;
      this.$matrix.m43 *= mat;
      this.$matrix.m44 *= mat;
    }
    
    return this;
}


J3DIMatrix4.prototype.divide = function(divisor)
{
    this.$matrix.m11 /= divisor;
    this.$matrix.m12 /= divisor;
    this.$matrix.m13 /= divisor;
    this.$matrix.m14 /= divisor;

    this.$matrix.m21 /= divisor;
    this.$matrix.m22 /= divisor;
    this.$matrix.m23 /= divisor;
    this.$matrix.m24 /= divisor;

    this.$matrix.m31 /= divisor;
    this.$matrix.m32 /= divisor;
    this.$matrix.m33 /= divisor;
    this.$matrix.m34 /= divisor;

    this.$matrix.m41 /= divisor;
    this.$matrix.m42 /= divisor;
    this.$matrix.m43 /= divisor;
    this.$matrix.m44 /= divisor;

    return this;
}

J3DIMatrix4.prototype.ortho = function(left, right, bottom, top, near, far)
{
    let tx = (left + right) / (left - right);
    let ty = (top + bottom) / (top - bottom);
    let tz = (far + near) / (far - near);

    let matrix = new J3DIMatrix4();
    matrix.$matrix.m11 = 2 / (left - right);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;
    
    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = 2 / (top - bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;
    
    matrix.$matrix.m31 = 0;
    matrix.$matrix.m32 = 0;
    matrix.$matrix.m33 = -2 / (far - near);
    matrix.$matrix.m34 = 0;
    
    matrix.$matrix.m41 = tx;
    matrix.$matrix.m42 = ty;
    matrix.$matrix.m43 = tz;
    matrix.$matrix.m44 = 1;

    this.multiply(matrix);
}

J3DIMatrix4.prototype.frustum = function(left, right, bottom, top, near, far)
{
    let matrix = new J3DIMatrix4();
    let A = (right + left) / (right - left);
    let B = (top + bottom) / (top - bottom);
    let C = -(far + near) / (far - near);
    let D = -(2 * far * near) / (far - near);

    matrix.$matrix.m11 = (2 * near) / (right - left);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;

    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = 2 * near / (top - bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;

    matrix.$matrix.m31 = A;
    matrix.$matrix.m32 = B;
    matrix.$matrix.m33 = C;
    matrix.$matrix.m34 = -1;

    matrix.$matrix.m41 = 0;
    matrix.$matrix.m42 = 0;
    matrix.$matrix.m43 = D;
    matrix.$matrix.m44 = 0;

    this.multiply(matrix);
}

J3DIMatrix4.prototype.perspective = function(fovy, aspect, zNear, zFar)
{
    let top = Math.tan(fovy * Math.PI / 360) * zNear;
    let bottom = -top;
    let left = aspect * bottom;
    let right = aspect * top;
    this.frustum(left, right, bottom, top, zNear, zFar);
}

J3DIMatrix4.prototype.world = function(posx, posy, posz, forwardx, forwardy, forwardz, upx, upy, upz)
{
    if (typeof posx == 'object' && "length" in posx) {
        let t = eyez;
        upx = t[0];
        upy = t[1];
        upz = t[2];

        t = eyey;
        dirx = t[0];
        diry = t[1];
        dirz = t[2];

        t = eyex;
        posx = t[0];
        posy = t[1];
        posz = t[2];
    }

    let matrix = new J3DIMatrix4();

    // Make rotation matrix
    let forward = new J3DIVector3(forwardx,forwardy,forwardz);
    let up = new J3DIVector3(upx,upy,upz);
    forward.normalize();
    up.normalize();
    let right=new J3DIVector3();
    right.load(up);
    right.cross(forward);
    right.normalize();
    up.load(forward);
    up.cross(right);

    matrix.$matrix.m11=right[0];
    matrix.$matrix.m21=right[1];
    matrix.$matrix.m31=right[2];
    matrix.$matrix.m12=up[0];
    matrix.$matrix.m22=up[1];
    matrix.$matrix.m32=up[2];
    matrix.$matrix.m13=forward[0];
    matrix.$matrix.m23=forward[1];
    matrix.$matrix.m33=forward[2];
    
    matrix.translate(-posx, -posy, -posz);

    this.multiply(matrix);
}
J3DIMatrix4.prototype.lookat = function(eyex, eyey, eyez, centerx, centery, centerz, upx, upy, upz)
{
    if (typeof eyez == 'object' && "length" in eyez) {
        let t = eyez;
        upx = t[0];
        upy = t[1];
        upz = t[2];

        t = eyey;
        centerx = t[0];
        centery = t[1];
        centerz = t[2];

        t = eyex;
        eyex = t[0];
        eyey = t[1];
        eyez = t[2];
    }

    let matrix = new J3DIMatrix4();

    // Make rotation matrix

    // Z vector
    let zx = centerx - eyex;
    let zy = centery - eyey;
    let zz = centerz - eyez;
    let mag = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (mag) {
        zx /= mag;
        zy /= mag;
        zz /= mag;
    }

    // Y vector
    let yx = upx;
    let yy = upy;
    let yz = upz;

    // X vector = Z cross Y
    let xx =  yy * zz - yz * zy;
    let xy = -yx * zz + yz * zx;
    let xz =  yx * zy - yy * zx;

    // Recompute Y = X cross Z
    yx =  zy * xz - zz * xy;
    yy = -zx * xz + zz * xx;
    yz =  zx * xy - zy * xx;

    // cross product gives area of parallelogram, which is < 1.0 for
    // non-perpendicular unit-length vectors; so normalize x, y here

    mag = Math.sqrt(xx * xx + xy * xy + xz * xz);
    if (mag) {
        xx /= mag;
        xy /= mag;
        xz /= mag;
    }

    mag = Math.sqrt(yx * yx + yy * yy + yz * yz);
    if (mag) {
        yx /= mag;
        yy /= mag;
        yz /= mag;
    }

    matrix.$matrix.m11 = xx;
    matrix.$matrix.m21 = xy;
    matrix.$matrix.m31 = xz;
    matrix.$matrix.m41 = 0;

    matrix.$matrix.m12 = yx;
    matrix.$matrix.m22 = yy;
    matrix.$matrix.m32 = yz;
    matrix.$matrix.m42 = 0;

    matrix.$matrix.m13 = zx;
    matrix.$matrix.m23 = zy;
    matrix.$matrix.m33 = zz;
    matrix.$matrix.m43 = 0;

    matrix.$matrix.m14 = 0;
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m34 = 0;
    matrix.$matrix.m44 = 1;
    //matrix.transpose();
    matrix.translate(-eyex, -eyey, -eyez);

    this.multiply(matrix);
}


// Returns true on success, false otherwise. All params are Array objects
J3DIMatrix4.prototype.decompose = function(_translate, _rotate, _scale, _skew, _perspective)
{
    // Normalize the matrix.
    if (this.$matrix.m44 == 0)
        return false;

    // Gather the params
    let translate = (_translate == undefined || !("length" in _translate)) ? new J3DIVector3 : _translate;
    let rotate = (_rotate == undefined || !("length" in _rotate)) ? new J3DIVector3 : _rotate;
    let scale = (_scale == undefined || !("length" in _scale)) ? new J3DIVector3 : _scale;
    let skew = (_skew == undefined || !("length" in _skew)) ? new J3DIVector3 : _skew;
    let perspective = (_perspective == undefined || !("length" in _perspective)) ? new Array(4) : _perspective;

    let matrix = new J3DIMatrix4(this);

    matrix.divide(matrix.$matrix.m44);

    // perspectiveMatrix is used to solve for perspective, but it also provides
    // an easy way to test for singularity of the upper 3x3 component.
    let perspectiveMatrix = new J3DIMatrix4(matrix);

    perspectiveMatrix.$matrix.m14 = 0;
    perspectiveMatrix.$matrix.m24 = 0;
    perspectiveMatrix.$matrix.m34 = 0;
    perspectiveMatrix.$matrix.m44 = 1;

    if (perspectiveMatrix._determinant4x4() == 0)
        return false;

    // First, isolate perspective.
    if (matrix.$matrix.m14 != 0 || matrix.$matrix.m24 != 0 || matrix.$matrix.m34 != 0) {
        // rightHandSide is the right hand side of the equation.
        let rightHandSide = [ matrix.$matrix.m14, matrix.$matrix.m24, matrix.$matrix.m34, matrix.$matrix.m44 ];

        // Solve the equation by inverting perspectiveMatrix and multiplying
        // rightHandSide by the inverse.
        let inversePerspectiveMatrix = new J3DIMatrix4(perspectiveMatrix);
        inversePerspectiveMatrix.invert();
        let transposedInversePerspectiveMatrix = new J3DIMatrix4(inversePerspectiveMatrix);
        transposedInversePerspectiveMatrix.transpose();
        transposedInversePerspectiveMatrix.multVecMatrix(perspective, rightHandSide);

        // Clear the perspective partition
        matrix.$matrix.m14 = matrix.$matrix.m24 = matrix.$matrix.m34 = 0
        matrix.$matrix.m44 = 1;
    }
    else {
        // No perspective.
        perspective[0] = perspective[1] = perspective[2] = 0;
        perspective[3] = 1;
    }

    // Next take care of translation
    translate[0] = matrix.$matrix.m41
    matrix.$matrix.m41 = 0
    translate[1] = matrix.$matrix.m42
    matrix.$matrix.m42 = 0
    translate[2] = matrix.$matrix.m43
    matrix.$matrix.m43 = 0

    // Now get scale and shear. 'row' is a 3 element array of 3 component vectors
    let row0 = new J3DIVector3(matrix.$matrix.m11, matrix.$matrix.m12, matrix.$matrix.m13);
    let row1 = new J3DIVector3(matrix.$matrix.m21, matrix.$matrix.m22, matrix.$matrix.m23);
    let row2 = new J3DIVector3(matrix.$matrix.m31, matrix.$matrix.m32, matrix.$matrix.m33);

    // Compute X scale factor and normalize first row.
    scale[0] = row0.vectorLength();
    row0.divide(scale[0]);

    // Compute XY shear factor and make 2nd row orthogonal to 1st.
    skew[0] = row0.dot(row1);
    row1.combine(row0, 1.0, -skew[0]);

    // Now, compute Y scale and normalize 2nd row.
    scale[1] = row1.vectorLength();
    row1.divide(scale[1]);
    skew[0] /= scale[1];

    // Compute XZ and YZ shears, orthogonalize 3rd row
    skew[1] = row1.dot(row2);
    row2.combine(row0, 1.0, -skew[1]);
    skew[2] = row1.dot(row2);
    row2.combine(row1, 1.0, -skew[2]);

    // Next, get Z scale and normalize 3rd row.
    scale[2] = row2.vectorLength();
    row2.divide(scale[2]);
    skew[1] /= scale[2];
    skew[2] /= scale[2];

    // At this point, the matrix (in rows) is orthonormal.
    // Check for a coordinate system flip.  If the determinant
    // is -1, then negate the matrix and the scaling factors.
    let pdum3 = new J3DIVector3(row1);
    pdum3.cross(row2);
    if (row0.dot(pdum3) < 0) {
        for (i = 0; i < 3; i++) {
            scale[i] *= -1;
            row[0][i] *= -1;
            row[1][i] *= -1;
            row[2][i] *= -1;
        }
    }

    // Now, get the rotations out
    rotate[1] = Math.asin(-row0[2]);
    if (Math.cos(rotate[1]) != 0) {
        rotate[0] = Math.atan2(row1[2], row2[2]);
        rotate[2] = Math.atan2(row0[1], row0[0]);
    }
    else {
        rotate[0] = Math.atan2(-row2[0], row1[1]);
        rotate[2] = 0;
    }

    // Convert rotations to degrees
    let rad2deg = 180 / Math.PI;
    rotate[0] *= rad2deg;
    rotate[1] *= rad2deg;
    rotate[2] *= rad2deg;

    return true;
}

J3DIMatrix4.prototype._determinant2x2 = function(a, b, c, d)
{
    return a * d - b * c;
}

J3DIMatrix4.prototype._determinant3x3 = function(a1, a2, a3, b1, b2, b3, c1, c2, c3)
{
    return a1 * this._determinant2x2(b2, b3, c2, c3)
         - b1 * this._determinant2x2(a2, a3, c2, c3)
         + c1 * this._determinant2x2(a2, a3, b2, b3);
}

J3DIMatrix4.prototype._determinant4x4 = function()
{
    let a1 = this.$matrix.m11;
    let b1 = this.$matrix.m12;
    let c1 = this.$matrix.m13;
    let d1 = this.$matrix.m14;

    let a2 = this.$matrix.m21;
    let b2 = this.$matrix.m22;
    let c2 = this.$matrix.m23;
    let d2 = this.$matrix.m24;

    let a3 = this.$matrix.m31;
    let b3 = this.$matrix.m32;
    let c3 = this.$matrix.m33;
    let d3 = this.$matrix.m34;

    let a4 = this.$matrix.m41;
    let b4 = this.$matrix.m42;
    let c4 = this.$matrix.m43;
    let d4 = this.$matrix.m44;

    return a1 * this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4)
         - b1 * this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4)
         + c1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4)
         - d1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
}

J3DIMatrix4.prototype._makeAdjoint = function()
{
    let a1 = this.$matrix.m11;
    let b1 = this.$matrix.m12;
    let c1 = this.$matrix.m13;
    let d1 = this.$matrix.m14;

    let a2 = this.$matrix.m21;
    let b2 = this.$matrix.m22;
    let c2 = this.$matrix.m23;
    let d2 = this.$matrix.m24;

    let a3 = this.$matrix.m31;
    let b3 = this.$matrix.m32;
    let c3 = this.$matrix.m33;
    let d3 = this.$matrix.m34;

    let a4 = this.$matrix.m41;
    let b4 = this.$matrix.m42;
    let c4 = this.$matrix.m43;
    let d4 = this.$matrix.m44;

    // Row column labeling reversed since we transpose rows & columns
    this.$matrix.m11  =   this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m21  = - this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m31  =   this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
    this.$matrix.m41  = - this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);

    this.$matrix.m12  = - this._determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m22  =   this._determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m32  = - this._determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
    this.$matrix.m42  =   this._determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);

    this.$matrix.m13  =   this._determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m23  = - this._determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m33  =   this._determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
    this.$matrix.m43  = - this._determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);

    this.$matrix.m14  = - this._determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m24  =   this._determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m34  = - this._determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
    this.$matrix.m44  =   this._determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);
}
/** Returns the trace of the matrix (sum of the diagonal elements)
 *
 * @return float   Sum of the diagonal elements
 */
J3DIMatrix4.prototype.trace = function () {
    return this.$matrix.m11+this.$matrix.m22+this.$matrix.m33+this.$matrix.m44;
}
/** Computes the inverse of the exponential map operation.
 *
 * r = loghat() = 1/(2*sin(theta)) * (R - transpose(R))
 *               where 
 *               theta = arccos( (trace(R) - 1)/2 )
 *
 * @param  R   Rotation matrix in SO(3)
 * @return r   Exponential map of R in so(3)
 */
J3DIMatrix4.prototype.loghat = function () {
    let r00 = this.$matrix.m11;
    let r01 = this.$matrix.m12;
    let r02 = this.$matrix.m13;

    let r10 = this.$matrix.m21;
    let r11 = this.$matrix.m22;
    let r12 = this.$matrix.m23;

    let r20 = this.$matrix.m31;
    let r21 = this.$matrix.m32;
    let r22 = this.$matrix.m33;
  
    let cosa = (r00 + r11 + r22 - 1.0) * 0.5;
    let aa = new J3DIVector3(r21 - r12,
                             r02 - r20,
                             r10 - r01);
    let twosina = aa.norm();
    let r;
    
    let sign = function(value) {
     return (value < 0 ? -1 : 1);
    };
    
    if (twosina < 1e-14) {
      if ( Math.abs(r00 - r11) > 0.99 
        || Math.abs(r00 - r22) > 0.99
        || Math.abs(r11 - r22) > 0.99) { //=> 180° rotation
      
        // maybe it is 180° rotation around a major axis
        if (Math.abs(r11 - r22) < 1e-14) {
          r = new J3DIVector3(Math.PI*sign(r00),0,0);
        } else if (Math.abs(r00 - r22) < 1e-14) {
          r = new J3DIVector3(0,Math.PI*sign(r11),0);
        } else if (Math.abs(r00 - r11) < 1e-14) {
          r = new J3DIVector3(0,0,Math.PI*sign(r22));
        } else { // => could not determine major axis
          r = new J3DIVector3(0,0,0);
        }
      } else { //=> extremely small rotation or 360° rotation
        r = new J3DIVector3(0,0,0);
      }
       // r = new J3DIVector3(0,0,0);
    } else {
        let alpha = Math.atan2(twosina*0.5,cosa);
        r = aa.multiply(alpha/twosina);
    }
    return r;
}
//
// J3DIVector3
//
class J3DIVector3 {
  constructor (x,y,z) {
    this.load(x,y,z);
  }
}

J3DIVector3.prototype.load = function (x,y,z)
{
    if (typeof x == 'object' || typeof x == 'array') {
        this[0] = x[0];
        this[1] = x[1];
        this[2] = x[2];
    }
    else if (typeof x == 'number') {
        this[0] = x;
        this[1] = y;
        this[2] = z;
    }
    else {
        this[0] = 0;
        this[1] = 0;
        this[2] = 0;
    }
    return this;
}

J3DIVector3.prototype.getAsArray = function ()
{
    return [ this[0], this[1], this[2] ];
}

J3DIVector3.prototype.getAsFloat32Array = function ()
{
    return new Float32Array(this.getAsArray());
}

J3DIVector3.prototype.vectorLength = function ()
{
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
}
J3DIVector3.prototype.norm = function()
{
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
}

J3DIVector3.prototype.cross = function(v)
{
  let t0=this[0],t1=this[1],t2=this[2];
  
    this[0] =  t1 * v[2] - t2 * v[1];
    this[1] = -t0 * v[2] + t2 * v[0];
    this[2] =  t0 * v[1] - t1 * v[0];
}

J3DIVector3.prototype.dot = function(v)
{
    return this[0] * v[0] + this[1] * v[1] + this[2] * v[2];
}

J3DIVector3.prototype.combine = function(v, ascl, bscl)
{
    this[0] = (ascl * this[0]) + (bscl * v[0]);
    this[1] = (ascl * this[1]) + (bscl * v[1]);
    this[2] = (ascl * this[2]) + (bscl * v[2]);
}
J3DIVector3.prototype.multiply = function(v)
{
  if (typeof v == 'number') {
    this[0] *= v; this[1] *= v; this[2] *= v; 
  } else {
    this[0] *= v[0]; this[1] *= v[1]; this[2] *= v[2]; 
  }
  return this;
}
J3DIVector3.prototype.divide = function(v)
{
  if (typeof v == 'number') {
    this[0] /= v; this[1] /= v; this[2] /= v; 
  } else {
    this[0] /= v[0]; this[1] /= v[1]; this[2] /= v[2]; 
  }
  return this;
}

J3DIVector3.prototype.subtract = function(v)
{
  if (typeof v == 'number') {
    this[0] -= v; this[1] -= v; this[2] -= v; 
  } else {
    this[0] -= v[0]; this[1] -= v[1]; this[2] -= v[2]; 
  }
  return this;
}
J3DIVector3.prototype.add = function(v)
{
  if (typeof v == 'number') {
    this[0] += v; this[1] += v; this[2] += v; return this;
  } else {
    this[0] += v[0]; this[1] += v[1]; this[2] += v[2]; return this;
  }
}
J3DIVector3.prototype.neg = function()
{
    this[0] = -this[0]; this[1] = -this[1]; this[2] = -this[2]; return this;
}
J3DIVector3.prototype.normalize = function()
{
    let l=this.vectorLength();
    this[0] /= l;
    this[1] /= l;
    this[2] /= l;
    return this;
}
/** Reflects this vector at n.
 * let l:= this;
 * let r:= 2*(n*l)*n-l;
 * return r;
 */
J3DIVector3.prototype.reflect = function(n)
{
	let l = new J3DIVector3(this);
	this.multiply(n);
	this.multiply(2);
  this.multiply(n);
	this.subtract(l);
	return this;
}

J3DIVector3.prototype.multVecMatrix = function(matrix)
{
    let x = this[0];
    let y = this[1];
    let z = this[2];

    this[0] = matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;
    this[1] = matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;
    this[2] = matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;
    let w = matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;
    if (w != 1 && w != 0) {
        this[0] /= w;
        this[1] /= w;
        this[2] /= w;
    }
    
    return this;
}

/** A normal vector must be multiplied by the inverse transpose of the matrix.
 * That is:
 * 
 * n' = S * n;
 *
 * where S = tranpose(inv(M))
 *
 */
J3DIVector3.prototype.multNormalMatrix = function(matrix)
{
    let x = this[0];
    let y = this[1];
    let z = this[2];
    
    let S = new J3DIMatrix4(matrix);
    S.invert();
    S.transpose();

    this[0] = S.$matrix.m41 + x * S.$matrix.m11 + y * S.$matrix.m21 + z * S.$matrix.m31;
    this[1] = S.$matrix.m42 + x * S.$matrix.m12 + y * S.$matrix.m22 + z * S.$matrix.m32;
    this[2] = S.$matrix.m43 + x * S.$matrix.m13 + y * S.$matrix.m23 + z * S.$matrix.m33;
    let w = S.$matrix.m44 + x * S.$matrix.m14 + y * S.$matrix.m24 + z * S.$matrix.m34;
    if (w != 1 && w != 0) {
        this[0] /= w;
        this[1] /= w;
        this[2] /= w;
    }
    
    return this;
}

/** Returns the result of the hat operation on a 3-vector.*/
J3DIVector3.prototype.hat = function () {
    let R = new J3DIMatrix4([
              0,  -this[2], this[1], 0, 
        this[2],        0, -this[0], 0, 
       -this[1],  this[0],        0, 0, 
              0,        0,        0, 1  
    ]);
    return R;
}
/** Computes the exponential map operation.
 *
 * R = exphat(r) = I + A + B
 *               where 
 *               A = r.hat()*sin(theta)/theta 
 *               B = hat(r)^2*(1-cos(theta))/theta^2
 *               theta = norm(r)
 *               r = this
 *
 * @param r   Exponential map in so(3)
 * @return  R   Rotation matrix of r in SO(3)
 */
J3DIVector3.prototype.exphat = function () {
  let r=this;
  let theta=r.norm();
  let R = new J3DIMatrix4();
  if (Math.abs(theta) < 1e-14) {
  } else {
    let a=r.hat().multiply(Math.sin(theta)/theta).getAsArray();
    let b=r.hat().multiply(r.hat()).multiply((1-Math.cos(theta))/(theta*theta)).getAsArray();
    R.load([
        1+a[0]+b[0],   a[1]+b[1],     a[2]+b[2], 0, 
          a[4]+b[4], 1+a[5]+b[5],     a[6]+b[6], 0, 
          a[8]+b[8],   a[9]+b[9], 1+a[10]+b[10], 0, 
                  0,           0,             0, 1  
    ]);
  }
  return R;
}

J3DIVector3.prototype.toString = function()
{
    return "["+formatNumber(this[0])+","+formatNumber(this[1])+","+formatNumber(this[2])+"]";
}
//-------------------
//
// J3DIVertexArray
//
class J3DIVertexArray {
  constructor(array) {
    this.load(array);
  }
}

J3DIVertexArray.prototype.load = function(array)
{
	  if (array === undefined) {
			this.length = 0;
		} else {
			this.length = array.length;
			for (let i=0; i < array.length; i++) {
				this[i] = array[i];
			}
		}
}

J3DIVertexArray.prototype.getAsArray = function()
{
	  let array = new Array(this.length);
		for (let i=0; i < array.length; i++) {
			array[i] = this[i];
		}
		
    return array;
}

J3DIVertexArray.prototype.getAsFloat32Array = function()
{
    return new Float32Array(this.getAsArray());
}


J3DIVertexArray.prototype.multVecMatrix = function(matrix)
{
	 for (let i=0; i < this.length; i+=3) {	
			let x = this[i];
			let y = this[i+1];
			let z = this[i+2];
	
			this[i] = matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;
			this[i+1] = matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;
			this[i+2] = matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;
			let w = matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;
			if (w != 1 && w != 0) {
					this[i] /= w;
					this[i+1] /= w;
					this[i+2] /= w;
			}
	}
}
/** Returns the normal of the triangle given by the indices. */
J3DIVertexArray.prototype.normal = function(i1,i2,i3)
{
	return this.rawNormal(i1,i2,i3).normalize();
}
/** Returns the unnoramlized normal of the triangle given by the indices. */
J3DIVertexArray.prototype.rawNormal = function(i1,i2,i3)
{
  let n = new J3DIVector3(this[i3*3]-this[i1*3],this[i3*3+1]-this[i1*3+1],this[i3*3+2]-this[i1*3+2]);
	n.cross(new J3DIVector3(this[i2*3]-this[i1*3],this[i2*3+1]-this[i1*3+1],this[i2*3+2]-this[i1*3+2]));
	return n;
}
/** Returns the unnoramlized normal of the triangle given by the indices. */
let rawZReuse1=new J3DIVector3();
let rawZReuse2=new J3DIVector3();
J3DIVertexArray.prototype.rawZ = function(i1,i2,i3)
{
  let n = rawZReuse1.load(this[i3*3]-this[i1*3],this[i3*3+1]-this[i1*3+1],this[i3*3+2]-this[i1*3+2]);
  n.cross(rawZReuse2.load(this[i2*3]-this[i1*3],this[i2*3+1]-this[i1*3+1],this[i2*3+2]-this[i1*3+2]));
  return n[2];
}

J3DIVertexArray.prototype.toString = function()
{
    let str="[";
		for (let i=0; i < this.length; i++) {
			if (i > 0) {
				str+=',';
			  if (i % 3 == 0) str+=' ';
			}
			str+=formatNumber(this[i]);
		}
		str+="]";
		return str;
}

// --------------
// require.js
// --------------
define("J3DIMath", [], 
function() {
// BEGIN Misc functions
// ------------------------------------------
let clamp = function(value, min, max) {
  if (value === undefined || value != value) return min;
  return Math.max(min, Math.min(max, value));
}

let sign = function(value) {
  return (value < 0 ? -1 : 1);
}
// ------------------------------------------
// END Misc functions


// BEGIN Interpolation functions
// ------------------------------------------
/** Performs an exponential map interpolation from R1 to R2.
 *
 *  R1 -> R1 * exphat( a )
 *        where
 *         a = loghat(inv(R1)*R2) * lambda 
 *       note: since R1 is a rotation matrix, its inverse is its transpose!
 *
 * @param R1       3x3 rotation matrix 1
 * @param R2       3x3 rotation matrix 2
 * @param lambda   amount of interpolation, lambda in [0,1]
 * @return interpolated rotation
 */
let elerp = function (R1, R2, lambda) {
   let invR1 = new J3DIMatrix4(R1).transpose();
   let a = invR1.multiply(R2).loghat().multiply(lambda);
   let lerp = new J3DIMatrix4(R1);
   return lerp.multiply(a.exphat());
};

/** Performs linear interpolation from rigid transformation matrix T1 to 
 *  rigid transformation matrix T2.
 *
 *  R1 -> R1 * exphat( a )
 *        where
 *         a = loghat(inv(R1)*R2) * lambda 
 *       note: since R1 is a rotation matrix, its inverse is its transpose!
 *
 * @param R1       3x3 rotation matrix 1
 * @param R2       3x3 rotation matrix 2
 * @param lambda   amount of interpolation, lambda in [0,1]
 * @return interpolated rotation
 */
let rigidLerp = function (T1, T2, lambda) {
   lambda = clamp(lambda, 0, 1);
  
   let t1 = new J3DIVector3(T1.$matrix.m41,T1.$matrix.m42,T1.$matrix.m43);
   let R1 = new J3DIMatrix4(T1);
   R1.$matrix.m41=0;
   R1.$matrix.m42=0;
   R1.$matrix.m43=0;
   
   let t2 = new J3DIVector3(T2.$matrix.m41,T2.$matrix.m42,T2.$matrix.m43);
   let R2 = new J3DIMatrix4(T2);
   R2.$matrix.m41=0;
   R2.$matrix.m42=0;
   R2.$matrix.m43=0;
   
   let invR1 = new J3DIMatrix4(R1).transpose();
   let invR2 = new J3DIMatrix4(R2).transpose();
   
   t1.multVecMatrix(invR1).multiply(1 - lambda);
   t2.multVecMatrix(invR2).multiply(lambda);
   let t = new J3DIVector3(t1);
   t.add(t2);
   
   let a = invR1.multiply(R2).loghat().multiply(lambda);
   let lerp = new J3DIMatrix4(R1);
   lerp.multiply(a.exphat());
   
   t.multVecMatrix(lerp);
   lerp.$matrix.m41=t[0];
   lerp.$matrix.m42=t[1];
   lerp.$matrix.m43=t[2];

   return lerp;
};


// ------------------------------------------
// END Interpolation functions

// BEGIN Intersection functions
// ------------------------------------------
/** Intersection test for a ray and an axis-oriented box. 
 * The ray must be given as an object with {point:J3DIVector3, dir:J3DIVector3}.
 * The box must be given as an object with {pMin:J3DIVector3, pMax:J3DIVector3}.
 * -> dir must be a normalized vector.
 * -> All coordinates in pMin must be smaller than in pMax
 *
 * Returns the intersection data: hit-point 3d coordinates and in u,v coordinates as
 *    {point:J3DIVector3, uv:J3DIVector3, t:float, face:int}
 */
let intersectBox = function(ray, box) {
  let pMin=box.pMin; let pMax=box.pMax;
  let t0=0; let t1=Number.MAX_VALUE;
  let face0 = -1;  let face1 = -1;
  for (let i=0;i<3;i++) {
    // update interval for i-th bounding box slab
    let invRayDir = 1.0/ray.dir[i];
    let tNear = (pMin[i] - ray.point[i]) * invRayDir;
    let tFar = (pMax[i] - ray.point[i]) * invRayDir;
    
    // update parametric interval from slab intersection
    let faceSwap=0;
    if (tNear > tFar) { let swap=tNear; tNear=tFar; tFar = swap; faceSwap=3; }
    if (tNear > t0) { t0=tNear; face0=i+faceSwap; }
    if (tFar < t1) { t1=tFar; face1=i+3-faceSwap; }
    if (t0>t1) return null;
  }
  let thit;
  let facehit;
  if (t0<t1 && face0!=-1 || face1==-1) {
    thit=t0;
    facehit=face0;
  } else {
    thit=t1;
    facehit=face1;
  }

  let phit = new J3DIVector3(ray.point).add(new J3DIVector3(ray.dir).multiply(thit));
  // find parametric representation of box hit
  let u,v;
  switch (facehit) {
    case 0: {// left
        let dpdu = new J3DIVector3(0, 0, 1/(pMax[2] - pMin[2]) );
        let dpdv = new J3DIVector3(0, 1/(pMax[1] - pMin[1]), 0);
        u = (phit[2]-pMin[2])*dpdu[2];
        v = (phit[1]-pMin[1])*dpdv[1];
        break;
    }
    case 3: {// right
        let dpdu = new J3DIVector3(0, 0, 1/(pMax[2] - pMin[2]) );
        let dpdv = new J3DIVector3(0, 1/(pMax[1] - pMin[1]), 0);
        u = (phit[2]-pMin[2])*dpdu[2];
        v = (phit[1]-pMin[1])*dpdv[1];
        break;
    }
    case 1: {// down
        let dpdu = new J3DIVector3(1/(pMax[0] - pMin[0]), 0, 0);
        let dpdv = new J3DIVector3(0, 0, 1/(pMax[2] - pMin[2]));
        u = (phit[0]-pMin[0])*dpdu[0];
        v = (phit[2]-pMin[2])*dpdv[2];
        break;
    }
    case 4: {// up
        let dpdu = new J3DIVector3(1/(pMax[0] - pMin[0]), 0, 0);
        let dpdv = new J3DIVector3(0, 0, 1/(pMax[2] - pMin[2]));
        u = (phit[0]-pMin[0])*dpdu[0];
        v = (phit[2]-pMin[2])*dpdv[2];
        break;
    }
    case 2: {// front
        let dpdu = new J3DIVector3(1/(pMax[0] - pMin[0]), 0, 0 );
        let dpdv = new J3DIVector3(0, 1/(pMax[1] - pMin[1]), 0);
        u = (phit[0]-pMin[0])*dpdu[0];
        v = (phit[1]-pMin[1])*dpdv[1];
        break;
    }
    case 5: {// back
        let dpdu = new J3DIVector3(1/(pMax[0] - pMin[0]), 0, 0 );
        let dpdv = new J3DIVector3(0, 1/(pMax[1] - pMin[1]), 0);
        u = (phit[0]-pMin[0])*dpdu[0];
        v = (phit[1]-pMin[1])*dpdv[1];
        break;
    }
    default:
      //alert("ERROR, illegal face number:"+facehit);
			return null;
  }
  
  return {point:phit, uv:new J3DIVector3(u,v,0), t:thit, face:facehit}
}

/** Intersection test for a ray and a plane. 
 * The ray must be given as an object with {point:J3DIVector3, dir:J3DIVector3}.
 * The plane must be given as an object with {point:J3DIVector3, normal:J3DIVector3}.
 * -> dir and normal must be normalized vectors.
 *
 * Returns the intersection data: hit-point 3d coordinates and in u,v coordinates as
 *                                {point:J3DIVector3, uv:J3DIVector3, t:float}
 */
let intersectPlane = function(ray, plane) {
  // solve for t:
  // t = (ray.p - plane.p) * plane.n / ray.d * plane.n
  let divisor = ray.dir.dot(plane.normal);
  if (Math.abs(divisor) < 1e-20) {
    return null;
  }
  //console.log("planeNormal:"+plane.normal);
  //console.log(divisor+" divi:"+ new J3DIVector3(plane.normal).divide(divisor));
  let thit = -( 
    (new J3DIVector3(ray.point).subtract(plane.point)).dot( new J3DIVector3(plane.normal).divide(divisor) )
    );
  
  let phit = new J3DIVector3(ray.point).add(new J3DIVector3(ray.dir).multiply(thit));
  
  let uv3d = new J3DIVector3(plane.point).subtract(phit);
  
  // find parametric representation of plane hit
  if (Math.abs(plane.normal[0])>Math.abs(plane.normal[1]) && Math.abs(plane.normal[0])>Math.abs(plane.normal[2])) {
     // Y-Z plane
     let uv=new J3DIVector3(uv3d[1],uv3d[2],0);   
  } else if (Math.abs(plane.normal[1])>Math.abs(plane.normal[0]) &&Math.abs(plane.normal[1])>Math.abs(plane.normal[2])) {
     // X-Z plane
     let uv=new J3DIVector3(uv3d[0],uv3d[2],0);   
  } else {
     // X-Y plane
     let uv=new J3DIVector3(uv3d[0],uv3d[1],0);   
  }

  return {point:phit,uv:uv,t:t}  
}


// ------------------------------------------
// END Intersection functions



  
// ------------------
// MODULE API    
// ------------------
return {
  sign : sign,
  clamp : clamp,
  rigidLerp : rigidLerp,
  elerp : elerp,
  intersectPlane : intersectPlane,
  intersectBox : intersectBox,
  formatNumber :formatNumber
};
});
/*
 * @(#)Node3D.js  2.0  2014-01-225
 *
 * Copyright (c) 2011-2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** A simple 3d scenegraph.
 */
// --------------
// require.js
// --------------
define("Node3D", ['J3DIMath'], 
function(J3DIMath) { 

class Node3D {
  constructor() {
    /** The transformation matrix of a node. */
    this.matrix=new J3DIMatrix4();
    
    /** The children of a node. */
    this.children=[];
    
    /** The parent of a node. */
    this.parent=null;
  }
}

/** Applies the scene graph transformation to m. */
Node3D.prototype.transform=function(m) {
  if (this.parent != null) this.parent.transform(m);
  m.multiply(this.matrix);
}

/** Adds a child. */
Node3D.prototype.add=function(child) {
  if (child.parent != null) {
    child.parent.remove(child);
  }
  this.children[this.children.length]=child;
  child.parent=this;
}

/** Removes a child. */
Node3D.prototype.remove=function(child) {
  if (child.parent == this) {
    for (var i=0;i<this.children.length;i++) {
      if (this.children[i]==child) {
        this.children=this.children.slice(0,i)+this.children.slice(i+1);
        break;
      }
    }
    child.parent = null;
  }
}

// ------------------
// MODULE API    
// ------------------
return {
    Node3D : Node3D,
};
});
/*
 * @(#)PocketCube.js  1.0  2014-01-17
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("PocketCube", ["Cube"], 
function(Cube) { 

/**
 * Represents the state of a 2-times sliced cube (Pocket Cube) by the location 
 * and orientation of its parts.
 * <p>
 * A Pocket Cube has 8 corner parts.
 * The parts divide each face of the cube into 2 x 2 layers.
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the corner parts:
 * <pre>
 *         +---+---+
 *         |4.0|2.0|
 *         +--- ---+ 
 *  ulb ufl|6.0|0.0|urf ubr  
 * +---+---+---+---+---+---+---+---+
 * |4.1|6.2|6.1|0.2|0.1|2.2|2.1|4.2|
 * +--- ---+--- ---+--- ---+--- ---+
 * |5.2|7.1|7.2|1.1|1.2|3.1|3.2|5.1|
 * +---+---+---+---+---+---+---+---+
 *  dbl dlf|7.0|1.0|dfr drb
 *         +--- ---+
 *         |5.0|3.0|
 *         +---+---+
 * </pre>
 * <p>
 * For more information about the location and orientation of the parts see
 * {@link Cube}.
 * <p>
 * <b>Stickers</b>
 * <p>
 * The following diagram shows the arrangement of stickers on a Pocket Cube:
 * The number before the comma is the first dimension (faces), the number
 * after the comma is the second dimension (stickers).
 * <pre>
 *         +---+---+
 *      ulb|1,0|1,1|ubr
 *         +--- ---+ 
 *      ufl|1,2|1,3|urf
 * +---+---+---+---+---+---+---+---+
 * |3,0|3,1|2,0|2,1|0,0|0,1|5,0|5,1|
 * +--- ---+--- ---+--- ---+--- ---+
 * |3,2|3,3|2,2|2,3|0,2|0,3|5,2|5,3|
 * +---+---+---+---+---+---+---+---+
 *      dlf|4,0|4,1|dfr
 *         +--- ---+
 *      dbl|4,2|4,3|drb
 *         +---+---+
 * </pre>
 */
 

/** Creates a new instance. */
class PocketCube extends Cube.Cube {
  constructor() {
    super(2);
    this.reset();
  }
}


/**
 * Set this variable to true to get debug output when the cube is transformed.
 */
PocketCube.prototype.DEBUG = false;
/**
 * Holds the number of side parts, which is 0.
 */
PocketCube.prototype.NUMBER_OF_SIDE_PARTS = 0;
/**
 * Holds the number of edge parts, which is 0.
 */
PocketCube.prototype.NUMBER_OF_EDGE_PARTS = 0;
/**
 * This is used for mapping side part locations
 * to/from sticker positions on the cube.
 *
 * @see #toStickers
 */
PocketCube.prototype.SIDE_TRANSLATION = [ ];
/**
 * This is used for mapping edge part locations and orientations
 * to/from sticker positions on the cube.
 * <p>
 * Description:<br>
 * edge orientation 0: face index, sticker index.
 * edge orientation 1: face index, sticker index.
 *
 * @see #toStickers
 */
PocketCube.prototype.EDGE_TRANSLATION = [ ];
/**
 * This is used for mapping corner part locations and orientations
 * to/from sticker positions on the cube.
 * <p>
 * Description:<br>
 * corner orientation 0, face index, 
 * corner orientation 1, face index, 
 * corner orientation 2, face index
 *
 * @see #toStickers
 */
PocketCube.prototype.CORNER_TRANSLATION = [
        [1, 3, 0, 0, 2, 1], // 0 urf 
        [4, 1, 2, 3, 0, 2], // 1 dfr
        [1, 1, 5, 0, 0, 1], // 2 ubr
        [4, 3, 0, 3, 5, 3], // 3 drb
        [1, 0, 3, 0, 5, 1], // 4 ulb
        [4, 2, 5, 3, 3, 2], // 5 dbl
        [1, 2, 2, 0, 3, 1], // 6 ufl
        [4, 0, 3, 3, 2, 2] // 7 dlf
    ];
/**
 * First dimension: edge part index.
 * Second dimension: orientation.
 * Third dimension: swipe direction
 * Fourth dimension: axis,layermask,angle
 */
PocketCube.prototype.EDGE_SWIPE_TABLE = [ ];
/** Side swipe table.
 * First dimension: side part index.
 * Second dimension: swipe direction
 * Third dimension: axis,layermask,angle
 */
PocketCube.prototype.SIDE_SWIPE_TABLE = [ ];
 

/**
 * Returns the current layer mask on which the orientation of the part lies.
 * Returns 0 if no mask can be determined (the center part).
 */
PocketCube.prototype.getPartLayerMask = function(part, orientation) {
  var face = this.getPartFace(part, orientation);
  if (part < this.cornerLoc.length) {
    // corner parts
    return (face < 3) ? 2 : 1;
  } else {
    // center part
    return 0;
  }
}

PocketCube.prototype.getPartSwipeAxis = function(part, orientation, swipeDirection) {
  if (part < this.cornerLoc.length) {
    // corner parts
    var loc = this.getCornerLocation(part);
    var ori = (3 - this.getPartOrientation(part) + orientation) % 3;
    return this.CORNER_SWIPE_TABLE[loc][ori][swipeDirection][0];
  } else {
    // center part
    return -1;
  }
}

PocketCube.prototype.getPartSwipeLayerMask= function(part, orientation, swipeDirection) {
  if (part < this.cornerLoc.length) {
    // corner parts
    var loc = this.getCornerLocation(part);
    var ori = (3 - this.getPartOrientation(part) + orientation) % 3;
    return this.CORNER_SWIPE_TABLE[loc][ori][swipeDirection][1];
  } else {
    // center part
    return 0;
  }
}

PocketCube.prototype.getPartSwipeAngle = function(part, orientation, swipeDirection) {
  if (part < this.cornerLoc.length) {
    // corner parts
    var loc = this.getCornerLocation(part);
    var ori = this.getPartOrientation(part);
    var sori = (3 - ori + orientation) % 3;
    var dir = swipeDirection;
    var angle = this.CORNER_SWIPE_TABLE[loc][sori][dir][2];
    if (ori == 2 && (sori == 0 || sori == 2)) {
        angle = -angle;
    } else if (ori == 1 && (sori == 1 || sori == 2)) {
        angle = -angle;
    }
    return angle;
  } else {
    // center part
    return 0;
  }
}

/**
 * Transforms the cube without firing an event.
 *
 * @param  axis  0=x, 1=y, 2=z axis.
 * @param  layerMask A bitmask specifying the layers to be transformed.
 *           The size of the layer mask depends on the value returned by
 *           <code>getLayerCount(axis)</code>. The layer mask has the
 *           following meaning:
 *           7=rotate the whole cube;<br>
 *           1=twist slice near the axis (left, down, back)<br>
 *           2=twist slice in the middle of the axis<br>
 *           4=twist slice far away from the axis (right, top, up)
 * @param  angle  positive values=clockwise rotation<br>
 *                negative values=counterclockwise rotation<br>
 *               1=90 degrees<br>
 *               2=180 degrees
 */
PocketCube.prototype.transform0 = function(axis, layerMask, angle) {
  if (this.DEBUG) {
      window.console.log("PocketCube#" + (this) + ".transform(ax=" + axis + ",msk=" + layerMask + ",ang:" + angle + ")");
  }
  {
    if (axis < 0 || axis > 2) {
        throw ("axis: " + axis);
    }

    if (layerMask < 0 || layerMask >= 1 << this.layerCount) {
        throw ("layerMask: " + layerMask);
    }

    if (angle < -2 || angle > 2) {
        throw ("angle: " + angle);
    }

    if (angle == 0) {
        return; // NOP
    }

    // Convert angle -2 to 2 to simplify the switch statements
    var an = (angle == -2) ? 2 : angle;

    if ((layerMask & 1) != 0) {
      // twist at left, bottom, back
      switch (axis) {
        case 0: // x
          switch (an) {
            case -1:
              this.twistL();
              break;
            case 1:
              this.twistL();
              this.twistL();
              this.twistL();
              break;
            case 2:
              this.twistL();
              this.twistL();
              break;
          }
          break;
        case 1: // y
          switch (an) {
            case -1:
              this.twistD();
              break;
            case 1:
              this.twistD();
              this.twistD();
              this.twistD();
              break;
            case 2:
              this.twistD();
              this.twistD();
              break;
          }
          break;
        case 2: // z
          switch (an) {
            case -1:
              this.twistB();
              break;
            case 1:
              this.twistB();
              this.twistB();
              this.twistB();
              break;
            case 2:
              this.twistB();
              this.twistB();
              break;
          }
      }
    }

    if ((layerMask & 2) != 0) {
      // twist at right, top, front
      switch (axis) {
        case 0: // x
          switch (an) {
            case 1:
              this.twistR();
              break;
            case -1:
              this.twistR();
              this.twistR();
              this.twistR();
              break;
            case 2:
              this.twistR();
              this.twistR();
              break;
          }
          break;
        case 1: // y
          switch (an) {
            case 1:
              this.twistU();
              break;
            case -1:
              this.twistU();
              this.twistU();
              this.twistU();
              break;
            case 2:
              this.twistU();
              this.twistU();
              break;
          }
          break;
        case 2: // z
          switch (an) {
            case 1:
              this.twistF();
              break;
            case -1:
              this.twistF();
              this.twistF();
              this.twistF();
              break;
            case 2:
              this.twistF();
              this.twistF();
              break;
          }
      }
    }
  }
}
/**
 * R.
 * <pre>
 *             +---+---+---+
 *             |   |   |2.0|
 *             +---     ---+
 *             |     1     |
 *             +---     ---+
 *             |   |   |0.0|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |   |   |   |   |   |0.2|0.1|   |2.2|2.1|   |   |
 * +---     ---+---     ---+---    +---+---     ---+
 * |     3     |     2     |     0     |     5     |
 * +---     ---+---     ---+---    +---+---     ---+
 * |   |   |   |   |   |1.1|1.2|   |3.1|3.2|   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |   |   |1.0|
 *             +---     ---+
 *             |     4     |
 *             +---     ---+
 *             |   |   |3.0|
 *             +---+---+---+
 * </pre>
 */
PocketCube.prototype.twistR=function() {
  this.fourCycle(this.cornerLoc, 0, 1, 3, 2, this.cornerOrient, 1, 2, 1, 2, 3);
}

/**
 * U.
 * <pre>
 *             +---+---+---+
 *             |4.0|   |2.0|
 *             +---     ---+
 *             |     1     |
 *             +---     ---+
 *             |6.0|   |0.0|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
 * +---     ---+---     ---+---    +---+---     ---+
 * |     3     |     2     |     0     |     5     |
 * +---     ---+---     ---+---    +---+---     ---+
 * |   |   |   |   |   |   |   |   |   |   |   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |   |   |   |
 *             +---     ---+
 *             |     4     |
 *             +---     ---+
 *             |   |   |   |
 *             +---+---+---+
 * </pre>
 */
PocketCube.prototype.twistU=function() {
  this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
}

/**
 * F.
 * <pre>
 *             +---+---+---+
 *             |   |   |   |
 *             +---     ---+
 *             |     1     |
 *             +---     ---+
 *             |6.0|   |0.0|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |   |   |6.2|6.1|   |0.2|0.1|   |   |   |   |   |
 * +---     ---+---     ---+---    +---+---     ---+
 * |     3     |     2     |     0     |     5     |
 * +---     ---+---     ---+---    +---+---     ---+
 * |   |   |7.1|7.2|   |1.1|1.2|   |   |   |   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |7.0|   |1.0|
 *             +---     ---+
 *             |     4     |
 *             +---     ---+
 *             |   |   |   |
 *             +---+---+---+
 * </pre>
 */
PocketCube.prototype.twistF=function() {
  this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
}

/**
 * L.
 * <pre>
 *             +---+---+---+
 *             |4.0|   |   |
 *             +---     ---+
 *             |     1     |
 *             +---     ---+
 *             |6.0|   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|   |6.2|6.1|   |   |   |   |   |   |   |4.2|
 * +---     ---+---     ---+---    +---+---     ---+
 * |     3     |     2     |     0     |     5     |
 * +---     ---+---     ---+---    +---+---     ---+
 * |5.2|   |7.1|7.2|   |   |   |   |   |   |   |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |7.0|   |   |
 *             +---     ---+
 *             |     4     |
 *             +---     ---+
 *             |5.0|   |   |
 *             +---+---+---+
 * </pre>
 */
PocketCube.prototype.twistL=function() {
  this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
}

/**
 * D.
 * <pre>
 *             +---+---+---+
 *             |   |   |   |
 *             +---     ---+
 *             |     1     |
 *             +---     ---+
 *             |   |   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |   |   |   |   |   |   |   |   |   |   |   |   |
 * +---     ---+---     ---+---    +---+---     ---+
 * |     3     |     2     |     0     |     5     |
 * +---     ---+---     ---+---    +---+---     ---+
 * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |7.0|   |1.0|
 *             +---     ---+
 *             |     4     |
 *             +---     ---+
 *             |5.0|   |3.0|
 *             +---+---+---+
 * </pre>
 */
PocketCube.prototype.twistD=function() {
  this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
}

/**
 * B.
 * <pre>
 *             +---+---+---+
 *             |4.0|   |2.0|
 *             +---     ---+
 *             |     1     |
 *             +---     ---+
 *             |   |   |   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|   |   |   |   |   |   |   |2.2|2.1|   |4.2|
 * +---     ---+---     ---+---    +---+---     ---+
 * |     3     |     2     |     0     |     5     |
 * +---     ---+---     ---+---    +---+---     ---+
 * |5.2|   |   |   |   |   |   |   |3.1|3.2|   |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |   |   |   |
 *             +---     ---+
 *             |     4     |
 *             +---     ---+
 *             |5.0|   |3.0|
 *             +---+---+---+
 * </pre>
 */
PocketCube.prototype.twistB=function() {
  this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
}

/**
 * Returns an array of stickers which reflect the current state of the cube.
 * <p>
 * The following diagram shows the indices of the array. The number before
 * the comma is the first dimension (faces), the number after the comma
 * is the second dimension (stickers).
 * <p>
 * The values of the array elements is the face index: 0..5.
 * <pre>
 *         +---+---+
 *      ulb|1,0|1,1|ubr
 *         +--- ---+ 
 *      ufl|1,2|1,3|urf
 * +---+---+---+---+---+---+---+---+
 * |3,0|3,1|2,0|2,1|0,0|0,1|5,0|5,1|
 * +--- ---+--- ---+--- ---+--- ---+
 * |3,2|3,3|2,2|2,3|0,2|0,3|5,2|5,3|
 * +---+---+---+---+---+---+---+---+
 *      dlf|4,0|4,1|dfr
 *         +--- ---+
 *      dbl|4,2|4,3|drb
 *         +---+---+
 * </pre>
 * @return A two dimensional array. First dimension: faces.
 * Second dimension: sticker index on the faces.
 */
PocketCube.prototype.toStickers=function() {
  throw "Not supported yet.";
}

/**
 * Sets the cube to a state where the faces of the parts map to the provided
 * stickers array.
 *
 * @see #toStickers
 *
 * @param stickers An array of dimensions [6][9] containing sticker values
 *                 in the range [0,5] for the six faces right, up, front,
 *                 left, down, back.
 */
PocketCube.prototype.setToStickers=function(stickers) {
  throw "Not supported yet.";
}

PocketCube.prototype.clone=function() {
  var that=new PocketCube();
  that.setTo(this);
  return that;
}


// ------------------
// MODULE API    
// ------------------
return {
  PocketCube : PocketCube,
  newPocketCube : function() { return new PocketCube(); }
};
});
/*
 * @(#)PocketCubeS1Cube3D.js  1.0  2015-03-30
 *
 * Copyright (c) 2015 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("PocketCubeS1Cube3D", ["AbstractPocketCubeCube3D","CubeAttributes","PreloadPocketCubeS1"], 
function(AbstractPocketCubeCube3D,CubeAttributes,PreloadPocketCubeS1) { 

/** Constructor
 * Creates the 3D geometry of a "Rubik's Cube".
 * Subclasses must call initPocketCubeS1Cube3D(). 
 */
class PocketCubeS1Cube3D extends AbstractPocketCubeCube3D.AbstractPocketCubeCube3D {
  constructor(loadGeometry) {
    super(1.8);
  }
  loadGeometry() {
    super.loadGeometry();
    this.isDrawTwoPass=false;
  }

  getModelUrl() {
    return this.baseUrl+'/'+this.relativeUrl;
  }
  
  
  createAttributes() {
    var a=CubeAttributes.newCubeAttributes(this.partCount, 6*4, [4,4,4,4,4,4]);
    var partsPhong=[0.5,0.6,0.4,16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (var i=0;i<this.partCount;i++) {
      a.partsFillColor[i]=[24,24,24,255];
      a.partsPhong[i]=partsPhong;
    }
    a.partsFillColor[this.centerOffset]=[240,240,240,255];
    
  var faceColors=[//Right, Up, Front, Left, Down, Back
      [255, 210, 0,155], // Yellow
      [0, 51, 115,255], // Blue
      [140, 0, 15,255], // Red
      [248, 248, 248,255], // White
      [0, 115, 47,255], // Green
      [255, 70, 0,255], // Orange
  ];
    
    var stickersPhong=[0.8,0.2,0.1,8.0];//shiny paper [ambient, diffuse, specular, shininess]
   
    for (var i=0;i<6;i++) {
      for (var j=0;j<4;j++) {
        a.stickersFillColor[i*4+j]=faceColors[i];
        a.stickersPhong[i*4+j]=stickersPhong;
      }
    }
    
    a.faceCount=6;
    a.stickerOffsets=[0,4,8,12,16,20];
    a.stickerCounts=[4,4,4,4,4,4];
    
   return a;
  }
}
PocketCubeS1Cube3D.prototype.relativeUrl = 'models/pocketcubes1/';
PocketCubeS1Cube3D.prototype.baseUrl = 'lib/';


// ------------------
// MODULE API    
// ------------------
return {
  Cube3D : PocketCubeS1Cube3D,
  newCube3D : function () { const c = new PocketCubeS1Cube3D(); c.loadGeometry(); return c; }
};
});
/*
 * @(#)PocketCubeS4Cube3D.js  1.0  2015-03-30
 *
 * Copyright (c) 2015 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("PocketCubeS4Cube3D", ["AbstractPocketCubeCube3D","CubeAttributes","PreloadPocketCubeS4"], 
function(AbstractPocketCubeCube3D,CubeAttributes,PreloadPocketCubeS4) { 

/** Constructor
 * Creates the 3D geometry of a Rubik's Cube.
 * Subclasses must call initPocketCubeS4Cube3D(). 
 */
class PocketCubeS4Cube3D extends AbstractPocketCubeCube3D.AbstractPocketCubeCube3D  {
  constructor() {
    super(1.8);
  }
  loadGeometry() {
    super.loadGeometry();
    this.isDrawTwoPass=false;
  }

  getModelUrl() {
    return this.baseUrl+'/'+this.relativeUrl;
  }
  
  
  createAttributes() {
    var a=CubeAttributes.newCubeAttributes(this.partCount, 6*4, [4,4,4,4,4,4]);
    var partsPhong=[0.5,0.6,0.4,16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (var i=0;i<this.partCount;i++) {
      a.partsFillColor[i]=[24,24,24,255];
      a.partsPhong[i]=partsPhong;
    }
    a.partsFillColor[this.centerOffset]=[240,240,240,255];
    
  var faceColors=[//Right, Up, Front, Left, Down, Back
      [255, 210, 0,155], // Yellow
      [0, 51, 115,255], // Blue
      [140, 0, 15,255], // Red
      [248, 248, 248,255], // White
      [0, 115, 47,255], // Green
      [255, 70, 0,255], // Orange
  ];
    
    var stickersPhong=[0.8,0.2,0.1,8.0];//shiny paper [ambient, diffuse, specular, shininess]
   
    for (var i=0;i<6;i++) {
      for (var j=0;j<4;j++) {
        a.stickersFillColor[i*4+j]=faceColors[i];
        a.stickersPhong[i*4+j]=stickersPhong;
      }
    }
    
    a.faceCount=6;
    a.stickerOffsets=[0,4,8,12,16,20];
    a.stickerCounts=[4,4,4,4,4,4];
    
    return a;
  }
}

PocketCubeS4Cube3D.prototype.relativeUrl = 'models/pocketcubes4/';
PocketCubeS4Cube3D.prototype.baseUrl = 'lib/';


// ------------------
// MODULE API    
// ------------------
return {
  Cube3D : PocketCubeS4Cube3D,
  newCube3D : function() { const c = new PocketCubeS4Cube3D(); c.loadGeometry(); return c; }
};
});
/*
 * @(#)PreloadPocketCubeS1.js  1.0  2014-03-30
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Preloads the .obj files.
*/
// --------------
// require.js
// --------------
define("PreloadPocketCubeS1", ["J3DI"], 
function (J3DI) {

J3DI.setFileData("lib/models/pocketcubes1/corner.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner\nv 0.1 0 1.9\nv 1.9 0 1.9\nv 1.9 0 0.1\nv 0.1 0 0.1\nv 0.1 0.1 2\nv 1.9 0.1 2\nv 2 0.1 1.9\nv 2 0.1 0.1\nv 1.9 0.1 0\nv 0.1 0.1 0\nv 0 0.1 0.1\nv 0 0.1 1.9\nv 0.1 1.9 2\nv 1.9 1.9 2\nv 2 1.9 1.9\nv 2 1.9 0.1\nv 1.9 1.9 0\nv 0.1 1.9 0\nv 0 1.9 0.1\nv 0 1.9 1.9\nv 0.1 2 1.9\nv 1.9 2 1.9\nv 1.9 2 0.1\nv 0.1 2 0.1\n\nvt 0.959869 0 0\nvt 0.919738 0 0\nvt 0 1 0\nvt 0 0 0\nvt 0 0 0\nvt 0.959869 0 0\nvt 1 1 0\nvt 0.919738 0 0\nvt 0 0 0\nvt 0.959869 0 0\nvt 0.919738 0 0\nvt 1 0 0\nvt 0 0 0\nvt 0.959869 0 0\nvt 0.919738 0 0\nvt 1 0.074299 0\nvt 0 0.074299 0\nvt 0.919738 0.074299 0\nvt 0 0.074299 0\nvt 1 0.074299 0\nvt 0.919738 0.074299 0\nvt 0 0.074299 0\nvt 1 0.074299 0\nvt 0.919738 0.074299 0\nvt 0 0.074299 0\nvt 1 0.074299 0\nvt 0.919738 0.074299 0\nvt 1 0.925701 0\nvt 0 0.925701 0\nvt 0.919738 0.925701 0\nvt 0 0.925701 0\nvt 1 0.925701 0\nvt 0.919738 0.925701 0\nvt 0 0.925701 0\nvt 1 0.925701 0\nvt 0.919738 0.925701 0\nvt 0 0.925701 0\nvt 1 0.925701 0\nvt 0.919738 0.925701 0\nvt 0.919738 1 0\nvt 0.959869 1 0\nvt 0 1 0\nvt 0 1 0\nvt 0.959869 1 0\nvt 0.919738 1 0\nvt 0 1 0\nvt 0.959869 1 0\nvt 0.919738 1 0\nvt 0 1 0\nvt 0.959869 1 0\nvt 0.919738 1 0\n\nf 2/8 6/18 5/17 1/4 \nf 4/13 3/12 2/7 1/3 \nf 14/30 22/45 21/42 13/29 \nf 7/20 6/18 2/6 \nf 7/20 15/32 14/30 6/18 \nf 15/32 22/44 14/30 \nf 3/11 8/21 7/19 2/5 \nf 13/28 21/41 20/39 \nf 16/33 23/48 22/43 15/31 \nf 9/23 8/21 3/10 \nf 9/23 17/35 16/33 8/21 \nf 17/35 23/47 16/33 \nf 4/15 10/24 9/22 3/9 \nf 10/24 18/36 17/34 9/22 \nf 18/36 24/51 23/46 17/34 \nf 11/26 10/24 4/14 \nf 11/26 19/38 18/36 10/24 \nf 19/38 24/50 18/36 \nf 1/2 12/27 11/25 4/13 \nf 12/27 20/39 19/37 11/25 \nf 20/39 21/40 24/49 19/37 \nf 5/16 12/27 1/1 \nf 5/16 13/28 20/39 12/27 \n\n"
);
J3DI.setFileData("lib/models/pocketcubes1/corner_r.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner_r corner_f\nusemtl Stickers\nv 2 0.1 1.9\nv 2 1.9 1.9\nv 2 0.1 0.1\nv 2 1.9 0.1\nv 1.8 0.1 0.1\nv 1.8 1.9 0.1\nv 1.8 0.1 1.9\nv 1.8 1.9 1.9\n\nvt 0.05 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.05 0.05\nvt 0.95 0.95 0.05\n\nf 3/3 4/4 2/2 1/1 \n\n"
);
J3DI.setFileData("lib/models/pocketcubes1/corner_u.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner_u corner_f\nusemtl Stickers\nv 0.1 2 1.9\nv 0.1 2 0.1\nv 1.9 2 1.9\nv 1.9 2 0.1\nv 1.9 1.8 1.9\nv 1.9 1.8 0.1\nv 0.1 1.8 1.9\nv 0.1 1.8 0.1\n\nvt 0.05 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.05 0.05\nvt 0.95 0.95 0.05\n\nf 3/3 4/4 2/2 1/1 \n\n"
);
J3DI.setFileData("lib/models/pocketcubes1/corner_f.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner_f\nusemtl Stickers\nv 0.1 0.1 2\nv 0.1 1.9 2\nv 1.9 0.1 2\nv 1.9 1.9 2\nv 1.9 0.1 1.8\nv 1.9 1.9 1.8\nv 0.1 0.1 1.8\nv 0.1 1.9 1.8\n\nvt 0.05 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.05 0.05\nvt 0.95 0.95 0.05\n\nf 3/3 4/4 2/2 1/1 \n\n"
);

J3DI.setFileData("lib/models/pocketcubes1/center.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng center\nv 0 0.525731 0.850651\nv 0 -0.525731 0.850651\nv 0.850651 0 0.525731\nv 0.850651 0 -0.525731\nv 0 0.525731 -0.850651\nv 0 -0.525731 -0.850651\nv -0.850651 0 -0.525731\nv -0.850651 0 0.525731\nv 0.525731 0.850651 0\nv -0.525731 0.850651 0\nv -0.525731 -0.850651 0\nv 0.525731 -0.850651 0\n\nvt 0.5 0 0\nvt 1 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.5 0 0\nvt 0 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0.5 0 0\nvt 0 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0.5 0 0\nvt 0 1 0\nvt 1 1 0\nvt 0 1 0\nvt 1 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0 1 0\n\nf 1/1 9/25 10/26 \nf 1/1 3/8 9/24 \nf 3/7 4/11 9/24 \nf 4/9 5/14 9/24 \nf 5/13 10/27 9/24 \nf 7/20 10/27 5/12 \nf 8/23 10/27 7/19 \nf 8/23 1/2 10/26 \nf 2/5 11/29 12/32 \nf 2/5 12/31 3/6 \nf 12/30 4/11 3/6 \nf 12/30 6/16 4/10 \nf 12/30 11/29 6/17 \nf 11/28 7/18 6/17 \nf 11/28 8/21 7/19 \nf 11/28 2/3 8/22 \nf 1/1 8/21 2/4 \nf 1/1 2/3 3/6 \nf 4/9 6/16 5/12 \nf 6/15 7/18 5/12 \n\n"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

/*
 * @(#)PreloadPocketCubeS4.js  1.0  2015-03-30
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Preloads the .obj files.
*/
// --------------
// require.js
// --------------
define("PreloadPocketCubeS4", ["J3DI"], 
function (J3DI) {

J3DI.setFileData("lib/models/pocketcubes4/corner.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner\nv 0.1 0 1.9\nv 1.9 0 1.9\nv 1.9 0 0.1\nv 0.1 0 0.1\nv 0.1 0.013397 1.95\nv 1.9 0.013397 1.95\nv 1.925 0.013397 1.943301\nv 1.943301 0.013397 1.925\nv 1.95 0.013397 1.9\nv 1.95 0.013397 0.1\nv 1.943301 0.013397 0.075\nv 1.925 0.013397 0.056699\nv 1.9 0.013397 0.05\nv 0.1 0.013397 0.05\nv 0.075 0.013397 0.056699\nv 0.056699 0.013397 0.075\nv 0.05 0.013397 0.1\nv 0.05 0.013397 1.9\nv 0.056699 0.013397 1.925\nv 0.075 0.013397 1.943301\nv 0.1 0.05 1.986603\nv 1.9 0.05 1.986603\nv 1.943301 0.05 1.975\nv 1.975 0.05 1.943301\nv 1.986603 0.05 1.9\nv 1.986603 0.05 0.1\nv 1.975 0.05 0.056699\nv 1.943301 0.05 0.025\nv 1.9 0.05 0.013397\nv 0.1 0.05 0.013397\nv 0.056699 0.05 0.025\nv 0.025 0.05 0.056699\nv 0.013397 0.05 0.1\nv 0.013397 0.05 1.9\nv 0.025 0.05 1.943301\nv 0.056699 0.05 1.975\nv 0.1 0.1 2\nv 1.9 0.1 2\nv 1.95 0.1 1.986603\nv 1.986603 0.1 1.95\nv 2 0.1 1.9\nv 2 0.1 0.1\nv 1.986603 0.1 0.05\nv 1.95 0.1 0.013397\nv 1.9 0.1 0\nv 0.1 0.1 0\nv 0.05 0.1 0.013397\nv 0.013397 0.1 0.05\nv 0 0.1 0.1\nv 0 0.1 1.9\nv 0.013397 0.1 1.95\nv 0.05 0.1 1.986603\nv 0.1 1.9 2\nv 1.9 1.9 2\nv 1.95 1.9 1.986603\nv 1.986603 1.9 1.95\nv 2 1.9 1.9\nv 2 1.9 0.1\nv 1.986603 1.9 0.05\nv 1.95 1.9 0.013397\nv 1.9 1.9 0\nv 0.1 1.9 0\nv 0.05 1.9 0.013397\nv 0.013397 1.9 0.05\nv 0 1.9 0.1\nv 0 1.9 1.9\nv 0.013397 1.9 1.95\nv 0.05 1.9 1.986603\nv 0.1 1.95 1.986603\nv 1.9 1.95 1.986603\nv 1.943301 1.95 1.975\nv 1.975 1.95 1.943301\nv 1.986603 1.95 1.9\nv 1.986603 1.95 0.1\nv 1.975 1.95 0.056699\nv 1.943301 1.95 0.025\nv 1.9 1.95 0.013397\nv 0.1 1.95 0.013397\nv 0.056699 1.95 0.025\nv 0.025 1.95 0.056699\nv 0.013397 1.95 0.1\nv 0.013397 1.95 1.9\nv 0.025 1.95 1.943301\nv 0.056699 1.95 1.975\nv 0.1 1.986603 1.95\nv 1.9 1.986603 1.95\nv 1.925 1.986603 1.943301\nv 1.943301 1.986603 1.925\nv 1.95 1.986603 1.9\nv 1.95 1.986603 0.1\nv 1.943301 1.986603 0.075\nv 1.925 1.986603 0.056699\nv 1.9 1.986603 0.05\nv 0.1 1.986603 0.05\nv 0.075 1.986603 0.056699\nv 0.056699 1.986603 0.075\nv 0.05 1.986603 0.1\nv 0.05 1.986603 1.9\nv 0.056699 1.986603 1.925\nv 0.075 1.986603 1.943301\nv 0.1 2 1.9\nv 1.9 2 1.9\nv 1.9 2 0.1\nv 0.1 2 0.1\n\nvt 0.986623 0 0\nvt 0.959869 0 0\nvt 0.933115 0 0\nvt 0.919738 0 0\nvt 0 1 0\nvt 0 0 0\nvt 1 1 0\nvt 0 0 0\nvt 0.986623 0 0\nvt 0.959869 0 0\nvt 0.933115 0 0\nvt 0.919738 0 0\nvt 0 0 0\nvt 0.986623 0 0\nvt 0.959869 0 0\nvt 0.933115 0 0\nvt 1 0 0\nvt 0.919738 0 0\nvt 0 0 0\nvt 0.986623 0 0\nvt 0.959869 0 0\nvt 0.933115 0 0\nvt 0.919738 0 0\nvt 1 0.024766 0\nvt 0 0.024766 0\nvt 0.919738 0.024766 0\nvt 0.946492 0.024766 0\nvt 0.973246 0.024766 0\nvt 0 0.024766 0\nvt 1 0.024766 0\nvt 0.919738 0.024766 0\nvt 0.946492 0.024766 0\nvt 0.973246 0.024766 0\nvt 0 0.024766 0\nvt 1 0.024766 0\nvt 0.919738 0.024766 0\nvt 0.946492 0.024766 0\nvt 0.973246 0.024766 0\nvt 0 0.024766 0\nvt 1 0.024766 0\nvt 0.919738 0.024766 0\nvt 0.946492 0.024766 0\nvt 0.973246 0.024766 0\nvt 1 0.049533 0\nvt 0 0.049533 0\nvt 0.919738 0.049533 0\nvt 0.946492 0.049533 0\nvt 0.973246 0.049533 0\nvt 0 0.049533 0\nvt 1 0.049533 0\nvt 0.919738 0.049533 0\nvt 0.946492 0.049533 0\nvt 0.973246 0.049533 0\nvt 0 0.049533 0\nvt 1 0.049533 0\nvt 0.919738 0.049533 0\nvt 0.946492 0.049533 0\nvt 0.973246 0.049533 0\nvt 0 0.049533 0\nvt 1 0.049533 0\nvt 0.919738 0.049533 0\nvt 0.946492 0.049533 0\nvt 0.973246 0.049533 0\nvt 1 0.074299 0\nvt 0 0.074299 0\nvt 0.919738 0.074299 0\nvt 0.946492 0.074299 0\nvt 0.973246 0.074299 0\nvt 0 0.074299 0\nvt 1 0.074299 0\nvt 0.919738 0.074299 0\nvt 0.946492 0.074299 0\nvt 0.973246 0.074299 0\nvt 0 0.074299 0\nvt 1 0.074299 0\nvt 0.919738 0.074299 0\nvt 0.946492 0.074299 0\nvt 0.973246 0.074299 0\nvt 0 0.074299 0\nvt 1 0.074299 0\nvt 0.919738 0.074299 0\nvt 0.946492 0.074299 0\nvt 0.973246 0.074299 0\nvt 1 0.925701 0\nvt 0 0.925701 0\nvt 0.919738 0.925701 0\nvt 0.946492 0.925701 0\nvt 0.973246 0.925701 0\nvt 0 0.925701 0\nvt 1 0.925701 0\nvt 0.919738 0.925701 0\nvt 0.946492 0.925701 0\nvt 0.973246 0.925701 0\nvt 0 0.925701 0\nvt 1 0.925701 0\nvt 0.919738 0.925701 0\nvt 0.946492 0.925701 0\nvt 0.973246 0.925701 0\nvt 0 0.925701 0\nvt 1 0.925701 0\nvt 0.919738 0.925701 0\nvt 0.946492 0.925701 0\nvt 0.973246 0.925701 0\nvt 1 0.950467 0\nvt 0 0.950467 0\nvt 0.919738 0.950467 0\nvt 0.946492 0.950467 0\nvt 0.973246 0.950467 0\nvt 0 0.950467 0\nvt 1 0.950467 0\nvt 0.919738 0.950467 0\nvt 0.946492 0.950467 0\nvt 0.973246 0.950467 0\nvt 0 0.950467 0\nvt 1 0.950467 0\nvt 0.919738 0.950467 0\nvt 0.946492 0.950467 0\nvt 0.973246 0.950467 0\nvt 0 0.950467 0\nvt 1 0.950467 0\nvt 0.919738 0.950467 0\nvt 0.946492 0.950467 0\nvt 0.973246 0.950467 0\nvt 1 0.975234 0\nvt 0 0.975234 0\nvt 0.919738 0.975234 0\nvt 0.946492 0.975234 0\nvt 0.973246 0.975234 0\nvt 0 0.975234 0\nvt 1 0.975234 0\nvt 0.919738 0.975234 0\nvt 0.946492 0.975234 0\nvt 0.973246 0.975234 0\nvt 0 0.975234 0\nvt 1 0.975234 0\nvt 0.919738 0.975234 0\nvt 0.946492 0.975234 0\nvt 0.973246 0.975234 0\nvt 0 0.975234 0\nvt 1 0.975234 0\nvt 0.919738 0.975234 0\nvt 0.946492 0.975234 0\nvt 0.973246 0.975234 0\nvt 0.959869 1 0\nvt 0.933115 1 0\nvt 0.919738 1 0\nvt 0 1 0\nvt 0.986623 1 0\nvt 0 1 0\nvt 0.986623 1 0\nvt 0.959869 1 0\nvt 0.933115 1 0\nvt 0.919738 1 0\nvt 0 1 0\nvt 0.986623 1 0\nvt 0.959869 1 0\nvt 0.933115 1 0\nvt 0.919738 1 0\nvt 0 1 0\nvt 0.986623 1 0\nvt 0.959869 1 0\nvt 0.933115 1 0\nvt 0.919738 1 0\n\nf 2/12 6/26 5/25 1/6 \nf 6/26 22/46 21/45 5/25 \nf 22/46 38/66 37/65 21/45 \nf 85/124 101/148 100/143 \nf 54/86 70/106 69/105 53/85 \nf 70/106 86/126 85/125 69/105 \nf 86/126 102/153 101/147 85/125 \nf 7/27 6/26 2/11 \nf 7/27 23/47 22/46 6/26 \nf 23/47 39/67 38/66 22/46 \nf 39/67 55/87 54/86 38/66 \nf 55/87 71/107 70/106 54/86 \nf 71/107 87/127 86/126 70/106 \nf 87/127 102/152 86/126 \nf 8/28 7/27 2/10 \nf 8/28 24/48 23/47 7/27 \nf 24/48 40/68 39/67 23/47 \nf 40/68 56/88 55/87 39/67 \nf 56/88 72/108 71/107 55/87 \nf 72/108 88/128 87/127 71/107 \nf 88/128 102/151 87/127 \nf 9/30 8/28 2/9 \nf 9/30 25/50 24/48 8/28 \nf 25/50 41/70 40/68 24/48 \nf 41/70 57/90 56/88 40/68 \nf 57/90 73/110 72/108 56/88 \nf 73/110 89/130 88/128 72/108 \nf 89/130 102/150 88/128 \nf 3/18 10/31 9/29 2/8 \nf 10/31 26/51 25/49 9/29 \nf 26/51 42/71 41/69 25/49 \nf 4/19 3/17 2/7 1/5 \nf 58/91 74/111 73/109 57/89 \nf 74/111 90/131 89/129 73/109 \nf 90/131 103/158 102/149 89/129 \nf 11/32 10/31 3/16 \nf 11/32 27/52 26/51 10/31 \nf 27/52 43/72 42/71 26/51 \nf 43/72 59/92 58/91 42/71 \nf 59/92 75/112 74/111 58/91 \nf 75/112 91/132 90/131 74/111 \nf 91/132 103/157 90/131 \nf 12/33 11/32 3/15 \nf 12/33 28/53 27/52 11/32 \nf 28/53 44/73 43/72 27/52 \nf 44/73 60/93 59/92 43/72 \nf 60/93 76/113 75/112 59/92 \nf 76/113 92/133 91/132 75/112 \nf 92/133 103/156 91/132 \nf 13/35 12/33 3/14 \nf 13/35 29/55 28/53 12/33 \nf 29/55 45/75 44/73 28/53 \nf 45/75 61/95 60/93 44/73 \nf 61/95 77/115 76/113 60/93 \nf 77/115 93/135 92/133 76/113 \nf 93/135 103/155 92/133 \nf 4/23 14/36 13/34 3/13 \nf 14/36 30/56 29/54 13/34 \nf 30/56 46/76 45/74 29/54 \nf 46/76 62/96 61/94 45/74 \nf 62/96 78/116 77/114 61/94 \nf 78/116 94/136 93/134 77/114 \nf 94/136 104/163 103/154 93/134 \nf 15/37 14/36 4/22 \nf 15/37 31/57 30/56 14/36 \nf 31/57 47/77 46/76 30/56 \nf 47/77 63/97 62/96 46/76 \nf 63/97 79/117 78/116 62/96 \nf 79/117 95/137 94/136 78/116 \nf 95/137 104/162 94/136 \nf 16/38 15/37 4/21 \nf 16/38 32/58 31/57 15/37 \nf 32/58 48/78 47/77 31/57 \nf 48/78 64/98 63/97 47/77 \nf 64/98 80/118 79/117 63/97 \nf 80/118 96/138 95/137 79/117 \nf 96/138 104/161 95/137 \nf 17/40 16/38 4/20 \nf 17/40 33/60 32/58 16/38 \nf 33/60 49/80 48/78 32/58 \nf 49/80 65/100 64/98 48/78 \nf 65/100 81/120 80/118 64/98 \nf 81/120 97/140 96/138 80/118 \nf 97/140 104/160 96/138 \nf 1/4 18/41 17/39 4/19 \nf 18/41 34/61 33/59 17/39 \nf 34/61 50/81 49/79 33/59 \nf 50/81 66/101 65/99 49/79 \nf 66/101 82/121 81/119 65/99 \nf 82/121 98/141 97/139 81/119 \nf 98/141 101/146 104/159 97/139 \nf 19/42 18/41 1/3 \nf 19/42 35/62 34/61 18/41 \nf 35/62 51/82 50/81 34/61 \nf 51/82 67/102 66/101 50/81 \nf 67/102 83/122 82/121 66/101 \nf 83/122 99/142 98/141 82/121 \nf 99/142 101/145 98/141 \nf 20/43 19/42 1/2 \nf 20/43 36/63 35/62 19/42 \nf 36/63 52/83 51/82 35/62 \nf 52/83 68/103 67/102 51/82 \nf 68/103 84/123 83/122 67/102 \nf 84/123 100/143 99/142 83/122 \nf 100/143 101/144 99/142 \nf 5/24 20/43 1/1 \nf 5/24 21/44 36/63 20/43 \nf 21/44 37/64 52/83 36/63 \nf 37/64 53/84 68/103 52/83 \nf 53/84 69/104 84/123 68/103 \nf 69/104 85/124 100/143 84/123 \n\n"
);
J3DI.setFileData("lib/models/pocketcubes4/corner_r.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner_r corner_f\nusemtl Stickers\nv 2 0.1 1.9\nv 2 1.9 1.9\nv 2 0.1 0.1\nv 2 1.9 0.1\nv 1.8 0.1 0.1\nv 1.8 1.9 0.1\nv 1.8 0.1 1.9\nv 1.8 1.9 1.9\n\nvt 0.05 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.05 0.05\nvt 0.95 0.95 0.05\n\nf 3/3 4/4 2/2 1/1 \n\n"
);
J3DI.setFileData("lib/models/pocketcubes4/corner_u.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner_u corner_f\nusemtl Stickers\nv 0.1 2 1.9\nv 0.1 2 0.1\nv 1.9 2 1.9\nv 1.9 2 0.1\nv 1.9 1.8 1.9\nv 1.9 1.8 0.1\nv 0.1 1.8 1.9\nv 0.1 1.8 0.1\n\nvt 0.05 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.05 0.05\nvt 0.95 0.95 0.05\n\nf 3/3 4/4 2/2 1/1 \n\n"
);
J3DI.setFileData("lib/models/pocketcubes4/corner_f.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner_f\nusemtl Stickers\nv 0.1 0.1 2\nv 0.1 1.9 2\nv 1.9 0.1 2\nv 1.9 1.9 2\nv 1.9 0.1 1.8\nv 1.9 1.9 1.8\nv 0.1 0.1 1.8\nv 0.1 1.9 1.8\n\nvt 0.05 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.05 0.05\nvt 0.95 0.95 0.05\n\nf 3/3 4/4 2/2 1/1 \n\n"
);

J3DI.setFileData("lib/models/pocketcubes4/center.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng center\nv 0 0.525731 0.850651\nv 0 -0.525731 0.850651\nv 0.850651 0 0.525731\nv 0.850651 0 -0.525731\nv 0 0.525731 -0.850651\nv 0 -0.525731 -0.850651\nv -0.850651 0 -0.525731\nv -0.850651 0 0.525731\nv 0.525731 0.850651 0\nv -0.525731 0.850651 0\nv -0.525731 -0.850651 0\nv 0.525731 -0.850651 0\n\nvt 0.5 0 0\nvt 1 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.5 0 0\nvt 0 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0.5 0 0\nvt 0 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0.5 0 0\nvt 0 1 0\nvt 1 1 0\nvt 0 1 0\nvt 1 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0.5 0 0\nvt 1 1 0\nvt 0 1 0\n\nf 1/1 9/25 10/26 \nf 1/1 3/8 9/24 \nf 3/7 4/11 9/24 \nf 4/9 5/14 9/24 \nf 5/13 10/27 9/24 \nf 7/20 10/27 5/12 \nf 8/23 10/27 7/19 \nf 8/23 1/2 10/26 \nf 2/5 11/29 12/32 \nf 2/5 12/31 3/6 \nf 12/30 4/11 3/6 \nf 12/30 6/16 4/10 \nf 12/30 11/29 6/17 \nf 11/28 7/18 6/17 \nf 11/28 8/21 7/19 \nf 11/28 2/3 8/22 \nf 1/1 8/21 2/4 \nf 1/1 2/3 3/6 \nf 4/9 6/16 5/12 \nf 6/15 7/18 5/12 \n\n"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

/*
 * @(#)PreloadRubiksCubeS1.js  1.0  2014-01-17
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Preloads the .obj files.
*/
// --------------
// require.js
// --------------
define("PreloadRubiksCubeS1", ["J3DI"], 
function (J3DI) {

J3DI.setFileData("lib/models/rubikscubes1/corner.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng Boole Cube\nv 1.005 0.905 2.595\nv 2.595 0.905 2.595\nv 2.595 0.905 1.005\nv 1.005 1.005 2.695\nv 2.595 1.005 2.695\nv 2.695 1.005 2.595\nv 2.695 1.005 1.005\nv 2.595 1.005 0.905\nv 0.905 1.005 2.595\nv 1.005 2.595 2.695\nv 2.595 2.595 2.695\nv 2.695 2.595 2.595\nv 2.695 2.595 1.005\nv 2.595 2.595 0.905\nv 1.005 2.595 0.905\nv 0.905 2.595 1.005\nv 0.905 2.595 2.595\nv 1.005 2.695 2.595\nv 2.595 2.695 2.595\nv 2.595 2.695 1.005\nv 1.005 2.695 1.005\nv 1.35 1.005 0.905\nv 1.35 0.905 1.005\nv 0.905 1.35 1.005\nv 1.005 1.35 0.905\nv 1.005 0.905 1.35\nv 0.905 1.35 1.35\nv 0.905 1.005 1.35\nv 1.35 1.35 0.905\nv 1.35 0.905 1.35\n\nvt 0.955045 0 0\nvt 0.91009 0 0\nvt 0 1 0\nvt 0 0 0\nvt 1 1 0\nvt 0 0 0\nvt 0.955045 0 0\nvt 0.91009 0 0\nvt 0 0 0\nvt 0.955045 0 0\nvt 1 0 0\nvt 0.91009 0 0\nvt 1 0.082493 0\nvt 0 0.082493 0\nvt 0.91009 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 1 0.917507 0\nvt 0 0.917507 0\nvt 0.91009 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 0 1 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0.712618 0.082493 0\nvt 0.712618 0 0\nvt 0.216981 0 0\nvt 0 0.263675 0\nvt 1 0.263675 0\nvt 0.91009 0.263675 0\nvt 0.197472 0 0\nvt 0 0.216981 0\nvt 0.197472 0.263675 0\nvt 0.197472 0.082493 0\nvt 0.712618 0.263675 0\nvt 0.216981 0.216981 0\n\nf 2/8 5/15 4/14 1/4 \nf 30/57 2/5 1/3 26/53 \nf 11/24 19/39 18/36 10/23 \nf 6/17 5/15 2/7 \nf 6/17 12/26 11/24 5/15 \nf 12/26 19/38 11/24 \nf 3/12 7/18 6/16 2/6 \nf 30/57 23/48 3/11 2/5 \nf 13/27 20/42 19/37 12/25 \nf 8/20 7/18 3/10 \nf 8/20 14/29 13/27 7/18 \nf 14/29 20/41 13/27 \nf 22/46 8/19 3/9 23/47 \nf 29/56 14/28 8/19 22/46 \nf 29/56 25/51 15/30 14/28 \nf 15/30 21/45 20/40 14/28 \nf 24/50 16/32 15/30 25/51 \nf 16/32 21/44 15/30 \nf 9/21 28/55 26/52 1/2 \nf 24/49 27/54 17/33 16/31 \nf 27/54 28/55 9/21 17/33 \nf 17/33 18/35 21/43 16/31 \nf 4/13 9/21 1/1 \nf 4/13 10/22 17/33 9/21 \nf 10/22 18/34 17/33 \n\ng Boole Cube_1\nv 0.45 0.45 1.35\nv 0.45 1.35 1.35\nv 1.35 0.45 1.35\nv 1.35 0.45 0.45\nv 1.35 1.35 0.45\nv 0.45 0.45 0.45\nv 0.45 1.35 0.45\nv 0.905 1.35 1.35\nv 1.35 1.35 0.905\nv 1.35 0.905 1.35\nv 1.35 1.005 0.905\nv 1.35 0.905 1.005\nv 1.005 1.35 0.905\nv 1.005 0.905 1.35\nv 0.905 1.005 1.35\nv 0.905 1.35 1.005\n\nvt 0 1 0\nvt 1 0 0\nvt 0 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 1 1 0\nvt 0 0 0\nvt 1 0 0\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\nvt 0.505556 0 0\nvt 0.505556 1 0\nvt 1 0.494444 0\nvt 0.494444 1 0\nvt 0 0.505556 0\nvt 1 0.505556 0\nvt 0.494444 0.616667 0\nvt 0.383333 0.505556 0\nvt 0.616667 0.494444 0\nvt 0.616667 0.505556 0\nvt 0.505556 0.616667 0\nvt 0.505556 0.383333 0\n\nf 44/84 33/66 40/80 \nf 45/85 38/76 32/63 31/60 \nf 44/84 45/85 31/60 33/66 \nf 41/81 35/69 39/78 \nf 34/67 42/82 40/79 33/65 \nf 41/81 42/82 34/67 35/69 \nf 36/72 37/74 35/70 34/68 \nf 31/59 32/62 37/73 36/71 \nf 38/75 46/86 37/73 32/61 \nf 43/83 39/77 35/69 \nf 46/86 43/83 35/69 37/73 \nf 34/67 33/64 31/58 36/71 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes1/corner_r.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng StickerR\nv 2.69 1 2.6\nv 2.69 1 1\nv 2.69 2.6 2.6\nv 2.69 2.6 1\n\nvt 0.05 0.05 0.05\nvt 0.95 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.95 0.05\n\nf 2/2 4/4 3/3 1/1 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes1/corner_u.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng StickerU\nv 1.006716 2.69 2.595209\nv 2.606716 2.69 2.595209\nv 1.006716 2.69 0.995209\nv 2.606716 2.69 0.995209\n\nvt 0.05 0.05 0.05\nvt 0.95 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.95 0.05\n\nf 2/2 4/4 3/3 1/1 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes1/corner_f.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng StickerF\nv 1 1 2.69\nv 2.6 1 2.69\nv 1 2.6 2.69\nv 2.6 2.6 2.69\n\nvt 0.05 0.05 0.05\nvt 0.95 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.95 0.05\n\nf 2/2 4/4 3/3 1/1 \n\n"
);

J3DI.setFileData("lib/models/rubikscubes1/edge.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng Boole Cube\nv 0.45 0.45 0.45\nv 0.45 1.35 0.45\nv 1.35 0.45 0.45\nv 1.35 0.45 -0.45\nv 0.45 0.45 -0.45\nv 0.45 1.35 -0.45\nv 1.35 0.905 0.45\nv 0.905 1.35 0.45\nv 1.35 0.905 -0.45\nv 0.905 1.35 -0.45\nv 0.905 1.005 0.45\nv 1.005 0.905 0.45\nv 0.905 1.005 -0.45\nv 1.005 0.905 -0.45\n\nvt 0 1 0\nvt 1 0 0\nvt 0 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 1 1 0\nvt 0 0 0\nvt 1 0 0\nvt 1 0 0\nvt 0 0 0\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\nvt 0 0.505556 0\nvt 1 0.505556 0\nvt 0.505556 0 0\nvt 0.505556 1 0\nvt 0 0.505556 0\nvt 1 0.505556 0\nvt 0.505556 1 0\nvt 0.494444 1 0\nvt 0.505556 0.616667 0\nvt 0.616667 0.505556 0\nvt 0.494444 0.616667 0\nvt 0.383333 0.505556 0\n\nf 12/25 3/9 7/17 \nf 1/3 11/24 8/19 2/6 \nf 12/25 11/24 1/3 3/9 \nf 7/16 3/8 4/10 9/21 \nf 13/26 6/15 10/23 \nf 14/27 9/20 4/11 5/13 \nf 13/26 14/27 5/13 6/15 \nf 1/2 2/5 6/14 5/12 \nf 2/4 8/18 10/22 6/14 \nf 4/10 3/7 1/1 5/12 \n\ng Boole Cube_1\nv 1.005 0.905 0.795\nv 2.595 0.905 0.795\nv 2.595 0.905 -0.795\nv 1.005 0.905 -0.795\nv 1.005 1.005 0.895\nv 2.595 1.005 0.895\nv 2.695 1.005 0.795\nv 2.695 1.005 -0.795\nv 2.595 1.005 -0.895\nv 1.005 1.005 -0.895\nv 0.905 1.005 -0.795\nv 0.905 1.005 0.795\nv 1.005 2.595 0.895\nv 2.595 2.595 0.895\nv 2.695 2.595 0.795\nv 2.695 2.595 -0.795\nv 2.595 2.595 -0.895\nv 1.005 2.595 -0.895\nv 0.905 2.595 -0.795\nv 0.905 2.595 0.795\nv 1.005 2.695 0.795\nv 2.595 2.695 0.795\nv 2.595 2.695 -0.795\nv 1.005 2.695 -0.795\nv 0.905 1.005 0.45\nv 1.005 0.905 0.45\nv 0.905 1.35 -0.45\nv 1.35 0.905 0.45\nv 0.905 1.005 -0.45\nv 1.005 0.905 -0.45\nv 0.905 1.35 0.45\nv 1.35 0.905 -0.45\n\nvt 0 1 0\nvt 0.955045 0 0\nvt 0.91009 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 0 0\nvt 0.955045 0 0\nvt 0.91009 0 0\nvt 1 0 0\nvt 0 0 0\nvt 0.955045 0 0\nvt 0.91009 0 0\nvt 0 0 0\nvt 0.955045 0 0\nvt 0.91009 0 0\nvt 1 0.082493 0\nvt 0 0.082493 0\nvt 0.91009 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 1 0.917507 0\nvt 0 0.917507 0\nvt 0.91009 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 0 1 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0.712618 0.082493 0\nvt 0 0.783019 0\nvt 0.712618 0 0\nvt 0.197472 0.263675 0\nvt 0.216981 0.783019 0\nvt 0.197472 0.082493 0\nvt 0 0.216981 0\nvt 0.197472 0 0\nvt 0.712618 0.263675 0\nvt 0.216981 0.216981 0\n\nf 16/35 20/45 19/44 15/31 \nf 20/45 28/57 27/56 19/44 \nf 28/57 36/72 35/69 27/56 \nf 21/47 20/45 16/34 \nf 21/47 29/59 28/57 20/45 \nf 29/59 36/71 28/57 \nf 17/39 22/48 21/46 16/33 \nf 42/83 46/88 17/36 16/32 \nf 30/60 37/75 36/70 29/58 \nf 23/50 22/48 17/38 \nf 23/50 31/62 30/60 22/48 \nf 31/62 37/74 30/60 \nf 18/42 24/51 23/49 17/37 \nf 24/51 32/63 31/61 23/49 \nf 32/63 38/78 37/73 31/61 \nf 25/53 24/51 18/41 \nf 25/53 33/65 32/63 24/51 \nf 33/65 38/77 32/63 \nf 26/54 39/79 40/81 15/30 \nf 18/40 44/86 43/84 25/52 \nf 43/84 41/82 33/64 25/52 \nf 45/87 39/79 26/54 34/66 \nf 41/82 45/87 34/66 33/64 \nf 34/66 35/68 38/76 33/64 \nf 19/43 26/54 15/29 \nf 19/43 27/55 34/66 26/54 \nf 27/55 35/67 34/66 \nf 17/36 46/88 44/85 18/40 \nf 42/83 16/32 15/28 40/80 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes1/edge_r.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng StickerR\nv 2.69 1 0.8\nv 2.69 1 -0.8\nv 2.69 2.6 0.8\nv 2.69 2.6 -0.8\n\nvt 0.05 0.05 0.05\nvt 0.95 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.95 0.05\n\nf 2/2 4/4 3/3 1/1 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes1/edge_u.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng StickerU\nv 1 2.69 0.8\nv 2.6 2.69 0.8\nv 1 2.69 -0.8\nv 2.6 2.69 -0.8\n\nvt 0.05 0.05 0.05\nvt 0.95 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.95 0.05\n\nf 2/2 4/4 3/3 1/1 \n\n"
);

J3DI.setFileData("lib/models/rubikscubes1/side.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng Cylinder_Back\nv 0.9 -0.450003 0\nv 0.9 0 0.450003\nv 0.9 0 -0.450003\nv 0.9 0.450003 0\n\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\n\nf 2/2 4/4 3/3 1/1 \n\ng Cylinder\nv 0.905 -0.45 0\nv 1.695 -0.45 0\nv 0.905 0 -0.45\nv 1.695 0 -0.45\nv 0.905 0.45 0\nv 1.695 0.45 0\nv 0.905 0 0.45\nv 1.695 0 0.45\n\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0.25 0 0\nvt 0.25 1 0\nvt 0.5 0 0\nvt 0.5 1 0\nvt 0.75 0 0\nvt 0.75 1 0\n\nf 7/9 8/10 6/8 5/6 \nf 9/11 10/12 8/10 7/9 \nf 11/13 12/14 10/12 9/11 \nf 5/5 6/7 12/14 11/13 \n\ng Cube\nv 1.79 -0.895 0.795\nv 2.59 -0.895 0.795\nv 2.59 -0.895 -0.795\nv 1.79 -0.895 -0.795\nv 1.79 -0.795 0.895\nv 2.59 -0.795 0.895\nv 2.69 -0.795 0.795\nv 2.69 -0.795 -0.795\nv 2.59 -0.795 -0.895\nv 1.79 -0.795 -0.895\nv 1.69 -0.795 -0.795\nv 1.69 -0.795 0.795\nv 1.79 0.795 0.895\nv 2.59 0.795 0.895\nv 2.69 0.795 0.795\nv 2.69 0.795 -0.795\nv 2.59 0.795 -0.895\nv 1.79 0.795 -0.895\nv 1.69 0.795 -0.795\nv 1.69 0.795 0.795\nv 1.79 0.895 0.795\nv 2.59 0.895 0.795\nv 2.59 0.895 -0.795\nv 1.79 0.895 -0.795\n\nvt 0.955045 0 0\nvt 0.91009 0 0\nvt 0 1 0\nvt 0 0 0\nvt 1 1 0\nvt 0 0 0\nvt 0.917938 0 0\nvt 0.835876 0 0\nvt 0 0 0\nvt 0.955045 0 0\nvt 1 0 0\nvt 0.91009 0 0\nvt 0 0 0\nvt 0.917938 0 0\nvt 0.835876 0 0\nvt 1 0.082493 0\nvt 0 0.082493 0\nvt 0.835876 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.835876 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 1 0.917507 0\nvt 0 0.917507 0\nvt 0.835876 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.835876 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0 0 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 1 0 0\nvt 0 1 0\nvt 0.917938 1 0\nvt 0.835876 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.955045 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 0.917938 1 0\nvt 0.835876 1 0\n\nf 14/22 18/32 17/31 13/18 \nf 18/32 26/44 25/43 17/31 \nf 26/44 34/61 33/57 25/43 \nf 19/34 18/32 14/21 \nf 19/34 27/46 26/44 18/32 \nf 27/46 34/60 26/44 \nf 15/26 20/35 19/33 14/20 \nf 16/27 15/25 14/19 13/17 \nf 28/47 35/65 34/59 27/45 \nf 21/37 20/35 15/24 \nf 21/37 29/49 28/47 20/35 \nf 29/49 35/64 28/47 \nf 16/29 22/38 21/36 15/23 \nf 22/38 30/50 29/48 21/36 \nf 30/50 36/68 35/63 29/48 \nf 23/40 22/38 16/28 \nf 23/40 31/52 30/50 22/38 \nf 31/52 36/67 30/50 \nf 13/16 24/41 23/39 16/27 \nf 24/41 32/53 31/51 23/39 \nf 32/53 33/56 36/66 31/51 \nf 17/30 24/41 13/15 \nf 17/30 25/42 32/53 24/41 \nf 25/42 33/55 32/53 \nf 34/58 35/62 36/66 33/54 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes1/side_r.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng Sticker\nv 2.69 -0.8 0.8\nv 2.69 -0.8 -0.8\nv 2.69 0.8 0.8\nv 2.69 0.8 -0.8\n\nvt 0.05 0.05 0.05\nvt 0.95 0.05 0.05\nvt 0.05 0.95 0.05\nvt 0.95 0.95 0.05\n\nf 2/2 4/4 3/3 1/1 \n\n"
);

J3DI.setFileData("lib/models/rubikscubes1/center.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng CenterPart_Simple Plane_Front\nv 0 -0.450003 0.9\nv 0.450003 0 0.9\nv -0.450003 0 0.9\nv 0 0.450003 0.9\n\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\n\nf 2/2 4/4 3/3 1/1 \n\ng CenterPart_Simple Plane_Back\nv 0.450003 0 -0.9\nv 0 -0.450003 -0.9\nv 0 0.450003 -0.9\nv -0.450003 0 -0.9\n\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\n\nf 6/6 8/8 7/7 5/5 \n\ng CenterPart_Simple Plane_Right\nv 0.9 0 0.450003\nv 0.9 -0.450003 0\nv 0.9 0.450003 0\nv 0.9 0 -0.450003\n\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\n\nf 10/10 12/12 11/11 9/9 \n\ng CenterPart_Simple Plane_Left\nv -0.9 -0.450003 0\nv -0.9 0 0.450003\nv -0.9 0 -0.450003\nv -0.9 0.450003 0\n\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\n\nf 14/14 16/16 15/15 13/13 \n\ng CenterPart_Simple Plane_Down\nv -0.450003 -0.9 0\nv 0 -0.9 -0.450003\nv 0 -0.9 0.450003\nv 0.450003 -0.9 0\n\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\n\nf 18/18 20/20 19/19 17/17 \n\ng CenterPart_Simple Plane_Up\nv 0 0.9 0.450003\nv 0.450003 0.9 0\nv -0.450003 0.9 0\nv 0 0.9 -0.450003\n\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\n\nf 22/22 24/24 23/23 21/21 \n\ng CenterPart_Simple Boole\nv 0.45 -0.9 0\nv 0.45 0.9 0\nv 0 -0.9 -0.45\nv 0 0.9 -0.45\nv -0.45 -0.9 0\nv -0.45 0.9 0\nv 0 -0.9 0.45\nv 0 0.9 0.45\nv 0 -0.45 -0.45\nv 0.45 0.45 0\nv -0.45 0.45 0\nv 0 0.45 -0.45\nv 0 0.45 0.45\nv -0.45 -0.45 0\nv -0.225 -0.225 0.225\nv 0.225 0.225 -0.225\nv -0.225 0.225 0.225\nv 0.225 0.225 0.225\nv 0.45 0 0.9\nv 0.45 0 -0.9\nv 0 -0.45 0.9\nv 0 -0.45 -0.9\nv -0.45 0 0.9\nv -0.45 0 -0.9\nv 0 0.45 0.9\nv 0 0.45 -0.9\nv -0.225 -0.225 -0.225\nv -0.225 0.225 -0.225\nv 0 -0.45 0.45\nv 0.225 -0.225 0.225\nv -0.9 -0.45 0\nv 0.9 -0.45 0\nv -0.9 0 -0.45\nv 0.9 0 -0.45\nv -0.9 0.45 0\nv 0.9 0.45 0\nv -0.9 0 0.45\nv 0.9 0 0.45\nv 0.45 0 0.45\nv -0.45 0 -0.45\nv -0.45 0 0.45\nv 0.45 0 -0.45\nv 0.45 -0.45 0\nv 0.225 -0.225 -0.225\n\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0.25 0 0\nvt 0.25 1 0\nvt 0.5 0 0\nvt 0.5 1 0\nvt 0.75 0 0\nvt 0.75 1 0\nvt 0.25 0.75 0\nvt 0.25 0.25 0\nvt 0.5 0.75 0\nvt 1 0.75 0\nvt 0 0.75 0\nvt 0.5 0.25 0\nvt 0.5 0.75 0\nvt 0.75 0.75 0\nvt 0.25 0.75 0\nvt 0.75 0.25 0\nvt 0.75 0.75 0\nvt 1 0.25 0\nvt 0 0.25 0\nvt 0.5 0.25 0\nvt 0.875 0.375 0\nvt 0.375 0.375 0\nvt 0.625 0.375 0\nvt 0.375 0.625 0\nvt 0.875 0.625 0\nvt 0.125 0.625 0\nvt 0.625 0.375 0\nvt 0.625 0.375 0\nvt 0.625 0.625 0\nvt 0.625 0.625 0\nvt 0.875 0.375 0\nvt 0.875 0.625 0\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0.25 0 0\nvt 0.25 1 0\nvt 0.5 0 0\nvt 0.5 1 0\nvt 0.75 0 0\nvt 0.75 1 0\nvt 0.125 0.375 0\nvt 0.375 0.625 0\nvt 0.375 0.375 0\nvt 0.375 0.375 0\nvt 0.625 0.625 0\nvt 0.375 0.625 0\nvt 0.25 0.25 0\nvt 0.75 0.25 0\nvt 0.875 0.625 0\nvt 0.125 0.375 0\nvt 0.875 0.375 0\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0.25 0 0\nvt 0.25 1 0\nvt 0.5 0 0\nvt 0.5 1 0\nvt 0.75 0 0\nvt 0.75 1 0\nvt 0.75 0.75 0\nvt 1 0.25 0\nvt 0 0.25 0\nvt 0.25 0.25 0\nvt 0.5 0.75 0\nvt 0.75 0.25 0\nvt 0.5 0.25 0\nvt 0.25 0.75 0\nvt 1 0.75 0\nvt 0 0.75 0\nvt 1 0.75 0\nvt 0 0.75 0\nvt 1 0.25 0\nvt 0 0.25 0\nvt 0.125 0.625 0\nvt 0.125 0.625 0\nvt 0.125 0.375 0\n\nf 68/108 67/105 25/26 \nf 40/54 26/28 34/39 \nf 68/108 25/26 27/29 33/36 \nf 26/28 40/54 36/43 28/30 \nf 52/76 28/30 36/43 \nf 51/73 33/36 27/29 \nf 52/76 35/41 30/32 28/30 \nf 38/48 51/73 27/29 29/31 \nf 41/57 37/45 32/34 30/32 \nf 39/51 29/31 31/33 53/78 \nf 39/51 38/48 29/31 \nf 41/57 30/32 35/41 \nf 42/60 32/34 37/45 \nf 42/60 34/38 26/27 32/34 \nf 67/104 54/81 31/33 25/25 \nf 54/81 53/78 31/33 \nf 68/107 33/35 46/66 44/64 \nf 68/107 44/64 66/101 \nf 54/80 63/94 43/62 \nf 53/77 54/80 43/62 45/65 \nf 39/50 53/77 45/65 \nf 65/98 39/50 45/65 47/67 \nf 51/72 46/66 33/35 \nf 48/68 46/66 51/72 64/96 \nf 64/96 36/42 50/70 48/68 \nf 36/42 64/96 52/75 \nf 37/44 41/56 65/98 \nf 37/44 65/98 47/67 49/69 \nf 36/42 40/53 66/100 \nf 50/70 36/42 66/100 44/63 \nf 37/44 63/93 42/59 \nf 43/61 63/93 37/44 49/69 \nf 68/106 66/99 58/87 \nf 67/103 68/106 58/87 56/85 \nf 51/71 38/47 55/83 \nf 51/71 55/83 57/86 64/95 \nf 35/40 52/74 57/86 59/88 \nf 52/74 64/95 57/86 \nf 34/37 66/99 40/52 \nf 66/99 34/37 60/89 58/87 \nf 35/40 65/97 41/55 \nf 65/97 35/40 59/88 61/90 \nf 34/37 42/58 63/92 \nf 34/37 63/92 62/91 60/89 \nf 67/102 63/92 54/79 \nf 67/102 56/84 62/91 63/92 \nf 38/46 39/49 65/97 \nf 55/82 38/46 65/97 61/90 \n\n"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

/*
 * @(#)PreloadRubiksCubeS4.js  1.0  2014-01-17
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Preloads the .obj files.
*/
// --------------
// require.js
// --------------
define("PreloadRubiksCubeS4", ["J3DI"], 
function (J3DI) {

J3DI.setFileData("lib/models/rubikscubes4/corner.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner Cube_1\nv 0.45 0.45 1.35\nv 0.45 1.35 1.35\nv 1.35 0.45 1.35\nv 1.35 1.35 1.35\nv 1.35 0.45 0.45\nv 1.35 1.35 0.45\nv 0.45 0.45 0.45\nv 0.45 1.35 0.45\n\nvt 0 1 0\nvt 1 0 0\nvt 0 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 1 1 0\nvt 0 0 0\nvt 1 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\n\nf 3/9 4/12 2/6 1/3 \nf 5/13 6/15 4/11 3/8 \nf 7/18 8/20 6/16 5/14 \nf 1/2 2/5 8/19 7/17 \nf 4/10 6/15 8/19 2/4 \nf 5/13 3/7 1/1 7/17 \n\ng corner Cube\nv 1.005 0.905 2.595\nv 2.595 0.905 2.595\nv 2.595 0.905 1.005\nv 1.005 0.905 1.005\nv 1.005 0.918397 2.645\nv 2.595 0.918397 2.645\nv 2.62 0.918397 2.638301\nv 2.638301 0.918397 2.62\nv 2.645 0.918397 2.595\nv 2.645 0.918397 1.005\nv 2.638301 0.918397 0.98\nv 2.62 0.918397 0.961699\nv 2.595 0.918397 0.955\nv 1.005 0.918397 0.955\nv 0.98 0.918397 0.961699\nv 0.961699 0.918397 0.98\nv 0.955 0.918397 1.005\nv 0.955 0.918397 2.595\nv 0.961699 0.918397 2.62\nv 0.98 0.918397 2.638301\nv 1.005 0.955 2.681602\nv 2.595 0.955 2.681602\nv 2.638301 0.955 2.67\nv 2.67 0.955 2.638301\nv 2.681602 0.955 2.595\nv 2.681602 0.955 1.005\nv 2.67 0.955 0.961699\nv 2.638301 0.955 0.93\nv 2.595 0.955 0.918397\nv 1.005 0.955 0.918397\nv 0.961699 0.955 0.93\nv 0.93 0.955 0.961699\nv 0.918397 0.955 1.005\nv 0.918397 0.955 2.595\nv 0.93 0.955 2.638301\nv 0.961699 0.955 2.67\nv 1.005 1.005 2.695\nv 2.595 1.005 2.695\nv 2.645 1.005 2.681602\nv 2.681602 1.005 2.645\nv 2.695 1.005 2.595\nv 2.695 1.005 1.005\nv 2.681602 1.005 0.955\nv 2.645 1.005 0.918397\nv 2.595 1.005 0.905\nv 1.005 1.005 0.905\nv 0.955 1.005 0.918397\nv 0.918397 1.005 0.955\nv 0.905 1.005 1.005\nv 0.905 1.005 2.595\nv 0.918397 1.005 2.645\nv 0.955 1.005 2.681602\nv 1.005 2.595 2.695\nv 2.595 2.595 2.695\nv 2.645 2.595 2.681602\nv 2.681602 2.595 2.645\nv 2.695 2.595 2.595\nv 2.695 2.595 1.005\nv 2.681602 2.595 0.955\nv 2.645 2.595 0.918397\nv 2.595 2.595 0.905\nv 1.005 2.595 0.905\nv 0.955 2.595 0.918397\nv 0.918397 2.595 0.955\nv 0.905 2.595 1.005\nv 0.905 2.595 2.595\nv 0.918397 2.595 2.645\nv 0.955 2.595 2.681602\nv 1.005 2.645 2.681602\nv 2.595 2.645 2.681602\nv 2.638301 2.645 2.67\nv 2.67 2.645 2.638301\nv 2.681602 2.645 2.595\nv 2.681602 2.645 1.005\nv 2.67 2.645 0.961699\nv 2.638301 2.645 0.93\nv 2.595 2.645 0.918397\nv 1.005 2.645 0.918397\nv 0.961699 2.645 0.93\nv 0.93 2.645 0.961699\nv 0.918397 2.645 1.005\nv 0.918397 2.645 2.595\nv 0.93 2.645 2.638301\nv 0.961699 2.645 2.67\nv 1.005 2.681602 2.645\nv 2.595 2.681602 2.645\nv 2.62 2.681602 2.638301\nv 2.638301 2.681602 2.62\nv 2.645 2.681602 2.595\nv 2.645 2.681602 1.005\nv 2.638301 2.681602 0.98\nv 2.62 2.681602 0.961699\nv 2.595 2.681602 0.955\nv 1.005 2.681602 0.955\nv 0.98 2.681602 0.961699\nv 0.961699 2.681602 0.98\nv 0.955 2.681602 1.005\nv 0.955 2.681602 2.595\nv 0.961699 2.681602 2.62\nv 0.98 2.681602 2.638301\nv 1.005 2.695 2.595\nv 2.595 2.695 2.595\nv 2.595 2.695 1.005\nv 1.005 2.695 1.005\n\nvt 0 1 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 0 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 1 0 0\nvt 0 0 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 0 0 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 1 0.027498 0\nvt 0 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 0 0.027498 0\nvt 1 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 0 0.027498 0\nvt 1 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 0 0.027498 0\nvt 1 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 1 0.054995 0\nvt 0 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 0 0.054995 0\nvt 1 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 0 0.054995 0\nvt 1 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 0 0.054995 0\nvt 1 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 1 0.082493 0\nvt 0 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 1 0.917507 0\nvt 0 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 1 0.945005 0\nvt 0 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 0 0.945005 0\nvt 1 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 0 0.945005 0\nvt 1 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 0 0.945005 0\nvt 1 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 1 0.972502 0\nvt 0 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0.972502 0\nvt 1 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0.972502 0\nvt 1 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0.972502 0\nvt 1 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 1 0 0\nvt 0 1 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\n\nf 10/32 14/46 13/45 9/26 \nf 14/46 30/66 29/65 13/45 \nf 30/66 46/86 45/85 29/65 \nf 46/86 62/106 61/105 45/85 \nf 62/106 78/126 77/125 61/105 \nf 78/126 94/146 93/145 77/125 \nf 94/146 110/175 109/169 93/145 \nf 15/47 14/46 10/31 \nf 15/47 31/67 30/66 14/46 \nf 31/67 47/87 46/86 30/66 \nf 47/87 63/107 62/106 46/86 \nf 63/107 79/127 78/126 62/106 \nf 79/127 95/147 94/146 78/126 \nf 95/147 110/174 94/146 \nf 16/48 15/47 10/30 \nf 16/48 32/68 31/67 15/47 \nf 32/68 48/88 47/87 31/67 \nf 48/88 64/108 63/107 47/87 \nf 64/108 80/128 79/127 63/107 \nf 80/128 96/148 95/147 79/127 \nf 96/148 110/173 95/147 \nf 17/50 16/48 10/29 \nf 17/50 33/70 32/68 16/48 \nf 33/70 49/90 48/88 32/68 \nf 49/90 65/110 64/108 48/88 \nf 65/110 81/130 80/128 64/108 \nf 81/130 97/150 96/148 80/128 \nf 97/150 110/172 96/148 \nf 11/38 18/51 17/49 10/28 \nf 18/51 34/71 33/69 17/49 \nf 34/71 50/91 49/89 33/69 \nf 50/91 66/111 65/109 49/89 \nf 66/111 82/131 81/129 65/109 \nf 82/131 98/151 97/149 81/129 \nf 98/151 111/181 110/171 97/149 \nf 19/52 18/51 11/37 \nf 19/52 35/72 34/71 18/51 \nf 35/72 51/92 50/91 34/71 \nf 51/92 67/112 66/111 50/91 \nf 67/112 83/132 82/131 66/111 \nf 83/132 99/152 98/151 82/131 \nf 99/152 111/180 98/151 \nf 20/53 19/52 11/36 \nf 20/53 36/73 35/72 19/52 \nf 36/73 52/93 51/92 35/72 \nf 52/93 68/113 67/112 51/92 \nf 68/113 84/133 83/132 67/112 \nf 84/133 100/153 99/152 83/132 \nf 100/153 111/179 99/152 \nf 21/55 20/53 11/35 \nf 21/55 37/75 36/73 20/53 \nf 37/75 53/95 52/93 36/73 \nf 53/95 69/115 68/113 52/93 \nf 69/115 85/135 84/133 68/113 \nf 85/135 101/155 100/153 84/133 \nf 101/155 111/178 100/153 \nf 12/43 22/56 21/54 11/34 \nf 22/56 38/76 37/74 21/54 \nf 38/76 54/96 53/94 37/74 \nf 54/96 70/116 69/114 53/94 \nf 70/116 86/136 85/134 69/114 \nf 86/136 102/156 101/154 85/134 \nf 102/156 112/186 111/177 101/154 \nf 23/57 22/56 12/42 \nf 23/57 39/77 38/76 22/56 \nf 39/77 55/97 54/96 38/76 \nf 55/97 71/117 70/116 54/96 \nf 71/117 87/137 86/136 70/116 \nf 87/137 103/157 102/156 86/136 \nf 103/157 112/185 102/156 \nf 24/58 23/57 12/41 \nf 24/58 40/78 39/77 23/57 \nf 40/78 56/98 55/97 39/77 \nf 56/98 72/118 71/117 55/97 \nf 72/118 88/138 87/137 71/117 \nf 88/138 104/158 103/157 87/137 \nf 104/158 112/184 103/157 \nf 25/60 24/58 12/40 \nf 25/60 41/80 40/78 24/58 \nf 41/80 57/100 56/98 40/78 \nf 57/100 73/120 72/118 56/98 \nf 73/120 89/140 88/138 72/118 \nf 89/140 105/160 104/158 88/138 \nf 105/160 112/183 104/158 \nf 9/25 26/61 25/59 12/39 \nf 26/61 42/81 41/79 25/59 \nf 42/81 58/101 57/99 41/79 \nf 58/101 74/121 73/119 57/99 \nf 74/121 90/141 89/139 73/119 \nf 90/141 106/161 105/159 89/139 \nf 106/161 109/168 112/182 105/159 \nf 27/62 26/61 9/24 \nf 27/62 43/82 42/81 26/61 \nf 43/82 59/102 58/101 42/81 \nf 59/102 75/122 74/121 58/101 \nf 75/122 91/142 90/141 74/121 \nf 91/142 107/162 106/161 90/141 \nf 107/162 109/167 106/161 \nf 28/63 27/62 9/23 \nf 28/63 44/83 43/82 27/62 \nf 44/83 60/103 59/102 43/82 \nf 60/103 76/123 75/122 59/102 \nf 76/123 92/143 91/142 75/122 \nf 92/143 108/163 107/162 91/142 \nf 108/163 109/166 107/162 \nf 13/44 28/63 9/22 \nf 13/44 29/64 44/83 28/63 \nf 29/64 45/84 60/103 44/83 \nf 45/84 61/104 76/123 60/103 \nf 61/104 77/124 92/143 76/123 \nf 77/124 93/144 108/163 92/143 \nf 93/144 109/165 108/163 \nf 110/170 111/176 112/182 109/164 \nf 12/39 11/33 10/27 9/21 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes4/corner_r.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner_r StickerR\nusemtl Stickers\nv 2.61 1 2.6\nv 2.61 2.6 2.6\nv 2.71 1 2.6\nv 2.71 2.6 2.6\nv 2.71 1 1\nv 2.71 2.6 1\nv 2.61 1 1\nv 2.61 2.6 1\n\nvt 0.05 0.00 0\nvt 0.95 0.05 0\nvt 0.00 0.05 0\nvt 0.05 1.00 0\nvt 0.95 0.95 0\n#6:\nvt 0.00 0.95 0\nvt 0.05 0.05 0\nvt 0.05 0.05 0.05\nvt 0.05 0.05 0\nvt 0.05 0.95 0\n#11:\nvt 0.05 0.95 0.05\nvt 0.05 0.95 0\nvt 0.95 0.05 0\nvt 0.95 0.05 0\nvt 0.95 0.95 0\n#16:\nvt 0.95 0.95 0\nvt 0.95 0.00 0\nvt 1.00 0.05 0\nvt 0.95 1.00 0\nvt 1.00 0.95 0\n\n#front:\nf 3/9 4/12 2/6 1/3 \n#right:\nf 5/13 6/15 4/11 3/8 \n#back:\nf 7/18 8/20 6/16 5/14 \n#left:\nf 1/13 2/15 8/11 7/8 \n#up:\nf 4/10 6/15 8/19 2/4 \n#down:\nf 5/13 3/7 1/1 7/17 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes4/corner_u.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner_u StickerU\nusemtl Stickers\nv 1 2.61 2.6\nv 1 2.71 2.6\nv 2.6 2.61 2.6\nv 2.6 2.71 2.6\nv 2.6 2.61 1\nv 2.6 2.71 1\nv 1 2.61 1\nv 1 2.71 1\n\nvt 0.05 0.95 0\nvt 0.00 0.05 0 \nvt 0.05 0.00 0\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 1 1 0\nvt 0.95 0.05 0\nvt 0.95 0.00 0\nvt 0.95 0.05 0\n#11:\nvt 0.95 0.05 0\nvt 0.95 0.05 0\nvt 1.00 0.95 0\nvt 0.95 1.00 0\nvt 0.95 0.95 0\nvt 0.95 0.95 0\nvt 0.00 0.95 0\nvt 0.05 1.00 0\nvt 0.05 0.95 0\nvt 0.05 0.95 0\n\n#front:\nf 3/9 4/12 2/6 1/3 \n#right:\nf 5/13 6/15 4/11 3/8 \n#back:\nf 7/18 8/20 6/16 5/14 \n#left:\nf 1/2 2/5 8/1 7/17 \n#up:\nf 4/10 6/15 8/19 2/4 \n#down:\nf 5/10 3/15 1/19 7/4 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes4/corner_f.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng corner_f StickerF\nusemtl Stickers\nv 1 1 2.71\nv 1 2.6 2.71\nv 2.6 1 2.71\nv 2.6 2.6 2.71\nv 2.6 1 2.61\nv 2.6 2.6 2.61\nv 1 1 2.61\nv 1 2.6 2.61\n\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 0.05 0.95 0\nvt 0.05 0.95 0\n#6:\nvt 0.05 0.95 0\nvt 0.95 0.05 0\nvt 0.95 0.05 0\nvt 0.95 0.05 0\nvt 0.95 0.95 0\n#11:\nvt 0.95 0.95 0\nvt 0.95 0.95 0\nvt 1.00 0.05 0\nvt 0.95 0.00 0\nvt 1.00 0.95 0\n#16:\nvt 0.05 0.00 0\nvt 0.05 0.05 0\nvt 0.00 0.05 0\nvt 0.00 0.95 0\nvt 0.05 1.00 0\n#21:\nvt 0.95 1.00 0\n\n#front:\nf 3/9 4/12 2/6 1/3 \n#right:\nf 5/13 6/15 4/11 3/8 \n#back:\nf 7/9 8/12 6/6 5/3 \n#front:\nf 1/2 2/5 8/19 7/17 \n#up:\nf 4/10 6/21 8/20 2/4 \n#down:\nf 5/14 3/7 1/1 7/16\n\n"
);

J3DI.setFileData("lib/models/rubikscubes4/edge.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng edge Cube_1\nv 2.595 0.905 0.795\nv 2.595 0.905 -0.795\nv 1.005 0.905 -0.795\nv 1.005 0.905 0.795\nv 2.645 0.918397 0.795\nv 2.645 0.918397 -0.795\nv 2.638301 0.918397 -0.82\nv 2.62 0.918397 -0.838301\nv 2.595 0.918397 -0.845\nv 1.005 0.918397 -0.845\nv 0.98 0.918397 -0.838301\nv 0.961699 0.918397 -0.82\nv 0.955 0.918397 -0.795\nv 0.955 0.918397 0.795\nv 0.961699 0.918397 0.82\nv 0.98 0.918397 0.838301\nv 1.005 0.918397 0.845\nv 2.595 0.918397 0.845\nv 2.62 0.918397 0.838301\nv 2.638301 0.918397 0.82\nv 2.681602 0.955 0.795\nv 2.681602 0.955 -0.795\nv 2.67 0.955 -0.838301\nv 2.638301 0.955 -0.87\nv 2.595 0.955 -0.881603\nv 1.005 0.955 -0.881602\nv 0.961699 0.955 -0.87\nv 0.93 0.955 -0.838301\nv 0.918397 0.955 -0.795\nv 0.918397 0.955 0.795\nv 0.93 0.955 0.838301\nv 0.961699 0.955 0.87\nv 1.005 0.955 0.881603\nv 2.595 0.955 0.881602\nv 2.638301 0.955 0.87\nv 2.67 0.955 0.838301\nv 2.695 1.005 0.795\nv 2.695 1.005 -0.795\nv 2.681602 1.005 -0.845\nv 2.645 1.005 -0.881603\nv 2.595 1.005 -0.895\nv 1.005 1.005 -0.895\nv 0.955 1.005 -0.881602\nv 0.918397 1.005 -0.845\nv 0.905 1.005 -0.795\nv 0.905 1.005 0.795\nv 0.918397 1.005 0.845\nv 0.955 1.005 0.881603\nv 1.005 1.005 0.895\nv 2.595 1.005 0.895\nv 2.645 1.005 0.881602\nv 2.681602 1.005 0.845\nv 2.695 2.595 0.795\nv 2.695 2.595 -0.795\nv 2.681602 2.595 -0.845\nv 2.645 2.595 -0.881603\nv 2.595 2.595 -0.895\nv 1.005 2.595 -0.895\nv 0.955 2.595 -0.881602\nv 0.918397 2.595 -0.845\nv 0.905 2.595 -0.795\nv 0.905 2.595 0.795\nv 0.918397 2.595 0.845\nv 0.955 2.595 0.881603\nv 1.005 2.595 0.895\nv 2.595 2.595 0.895\nv 2.645 2.595 0.881602\nv 2.681602 2.595 0.845\nv 2.681602 2.645 0.795\nv 2.681602 2.645 -0.795\nv 2.67 2.645 -0.838301\nv 2.638301 2.645 -0.87\nv 2.595 2.645 -0.881603\nv 1.005 2.645 -0.881602\nv 0.961699 2.645 -0.87\nv 0.93 2.645 -0.838301\nv 0.918397 2.645 -0.795\nv 0.918397 2.645 0.795\nv 0.93 2.645 0.838301\nv 0.961699 2.645 0.87\nv 1.005 2.645 0.881603\nv 2.595 2.645 0.881602\nv 2.638301 2.645 0.87\nv 2.67 2.645 0.838301\nv 2.645 2.681602 0.795\nv 2.645 2.681602 -0.795\nv 2.638301 2.681602 -0.82\nv 2.62 2.681602 -0.838301\nv 2.595 2.681602 -0.845\nv 1.005 2.681602 -0.845\nv 0.98 2.681602 -0.838301\nv 0.961699 2.681602 -0.82\nv 0.955 2.681602 -0.795\nv 0.955 2.681602 0.795\nv 0.961699 2.681602 0.82\nv 0.98 2.681602 0.838301\nv 1.005 2.681602 0.845\nv 2.595 2.681602 0.845\nv 2.62 2.681602 0.838301\nv 2.638301 2.681602 0.82\nv 2.595 2.695 0.795\nv 2.595 2.695 -0.795\nv 1.005 2.695 -0.795\nv 1.005 2.695 0.795\n\nvt 0 1 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 0 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 1 0 0\nvt 0 0 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 0 0 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 1 0.027498 0\nvt 0 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 0 0.027498 0\nvt 1 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 0 0.027498 0\nvt 1 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 0 0.027498 0\nvt 1 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 1 0.054995 0\nvt 0 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 0 0.054995 0\nvt 1 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 0 0.054995 0\nvt 1 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 0 0.054995 0\nvt 1 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 1 0.082493 0\nvt 0 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 1 0.917507 0\nvt 0 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 1 0.945005 0\nvt 0 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 0 0.945005 0\nvt 1 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 0 0.945005 0\nvt 1 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 0 0.945005 0\nvt 1 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 1 0.972502 0\nvt 0 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0.972502 0\nvt 1 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0.972502 0\nvt 1 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0.972502 0\nvt 1 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 1 0 0\nvt 0 1 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\nvt 0 1 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\n\nf 2/12 6/26 5/25 1/6 \nf 6/26 22/46 21/45 5/25 \nf 22/46 38/66 37/65 21/45 \nf 38/66 54/86 53/85 37/65 \nf 54/86 70/106 69/105 53/85 \nf 70/106 86/126 85/125 69/105 \nf 86/126 102/155 101/149 85/125 \nf 7/27 6/26 2/11 \nf 7/27 23/47 22/46 6/26 \nf 23/47 39/67 38/66 22/46 \nf 39/67 55/87 54/86 38/66 \nf 55/87 71/107 70/106 54/86 \nf 71/107 87/127 86/126 70/106 \nf 87/127 102/154 86/126 \nf 8/28 7/27 2/10 \nf 8/28 24/48 23/47 7/27 \nf 24/48 40/68 39/67 23/47 \nf 40/68 56/88 55/87 39/67 \nf 56/88 72/108 71/107 55/87 \nf 72/108 88/128 87/127 71/107 \nf 88/128 102/153 87/127 \nf 9/30 8/28 2/9 \nf 9/30 25/50 24/48 8/28 \nf 25/50 41/70 40/68 24/48 \nf 41/70 57/90 56/88 40/68 \nf 57/90 73/110 72/108 56/88 \nf 73/110 89/130 88/128 72/108 \nf 89/130 102/152 88/128 \nf 3/18 10/31 9/29 2/8 \nf 10/31 26/51 25/49 9/29 \nf 26/51 42/71 41/69 25/49 \nf 42/71 58/91 57/89 41/69 \nf 58/91 74/111 73/109 57/89 \nf 74/111 90/131 89/129 73/109 \nf 90/131 103/161 102/151 89/129 \nf 11/32 10/31 3/17 \nf 11/32 27/52 26/51 10/31 \nf 27/52 43/72 42/71 26/51 \nf 43/72 59/92 58/91 42/71 \nf 59/92 75/112 74/111 58/91 \nf 75/112 91/132 90/131 74/111 \nf 91/132 103/160 90/131 \nf 12/33 11/32 3/16 \nf 12/33 28/53 27/52 11/32 \nf 28/53 44/73 43/72 27/52 \nf 44/73 60/93 59/92 43/72 \nf 60/93 76/113 75/112 59/92 \nf 76/113 92/133 91/132 75/112 \nf 92/133 103/159 91/132 \nf 13/35 12/33 3/15 \nf 13/35 29/55 28/53 12/33 \nf 29/55 45/75 44/73 28/53 \nf 45/75 61/95 60/93 44/73 \nf 61/95 77/115 76/113 60/93 \nf 77/115 93/135 92/133 76/113 \nf 93/135 103/158 92/133 \nf 4/23 14/36 13/34 3/14 \nf 14/36 30/56 29/54 13/34 \nf 30/56 46/76 45/74 29/54 \nf 46/76 62/96 61/94 45/74 \nf 62/96 78/116 77/114 61/94 \nf 78/116 94/136 93/134 77/114 \nf 94/136 104/166 103/157 93/134 \nf 15/37 14/36 4/22 \nf 15/37 31/57 30/56 14/36 \nf 31/57 47/77 46/76 30/56 \nf 47/77 63/97 62/96 46/76 \nf 63/97 79/117 78/116 62/96 \nf 79/117 95/137 94/136 78/116 \nf 95/137 104/165 94/136 \nf 16/38 15/37 4/21 \nf 16/38 32/58 31/57 15/37 \nf 32/58 48/78 47/77 31/57 \nf 48/78 64/98 63/97 47/77 \nf 64/98 80/118 79/117 63/97 \nf 80/118 96/138 95/137 79/117 \nf 96/138 104/164 95/137 \nf 17/40 16/38 4/20 \nf 17/40 33/60 32/58 16/38 \nf 33/60 49/80 48/78 32/58 \nf 49/80 65/100 64/98 48/78 \nf 65/100 81/120 80/118 64/98 \nf 81/120 97/140 96/138 80/118 \nf 97/140 104/163 96/138 \nf 1/5 18/41 17/39 4/19 \nf 18/41 34/61 33/59 17/39 \nf 34/61 50/81 49/79 33/59 \nf 50/81 66/101 65/99 49/79 \nf 66/101 82/121 81/119 65/99 \nf 82/121 98/141 97/139 81/119 \nf 98/141 101/148 104/162 97/139 \nf 19/42 18/41 1/4 \nf 19/42 35/62 34/61 18/41 \nf 35/62 51/82 50/81 34/61 \nf 51/82 67/102 66/101 50/81 \nf 67/102 83/122 82/121 66/101 \nf 83/122 99/142 98/141 82/121 \nf 99/142 101/147 98/141 \nf 20/43 19/42 1/3 \nf 20/43 36/63 35/62 19/42 \nf 36/63 52/83 51/82 35/62 \nf 52/83 68/103 67/102 51/82 \nf 68/103 84/123 83/122 67/102 \nf 84/123 100/143 99/142 83/122 \nf 100/143 101/146 99/142 \nf 5/24 20/43 1/2 \nf 5/24 21/44 36/63 20/43 \nf 21/44 37/64 52/83 36/63 \nf 37/64 53/84 68/103 52/83 \nf 53/84 69/104 84/123 68/103 \nf 69/104 85/124 100/143 84/123 \nf 85/124 101/145 100/143 \nf 102/150 103/156 104/162 101/144 \nf 4/19 3/13 2/7 1/1 \n\ng edge Cube\nv 1.35 0.45 0.45\nv 1.35 1.35 0.45\nv 1.35 0.45 -0.45\nv 1.35 1.35 -0.45\nv 0.45 0.45 -0.45\nv 0.45 1.35 -0.45\nv 0.45 0.45 0.45\nv 0.45 1.35 0.45\n\nvt 0 1 0\nvt 1 0 0\nvt 0 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 1 1 0\nvt 0 0 0\nvt 1 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0 0 0\nvt 1 0 0\nvt 0 1 0\nvt 1 1 0\n\nf 107/175 108/178 106/172 105/169 \nf 109/179 110/181 108/177 107/174 \nf 111/184 112/186 110/182 109/180 \nf 105/168 106/171 112/185 111/183 \nf 108/176 110/181 112/185 106/170 \nf 109/179 107/173 105/167 111/183 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes4/edge_r.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng edge_r StickerF\nusemtl Stickers\nv 2.71 1 0.8\nv 2.71 2.6 0.8\nv 2.71 1 -0.8\nv 2.71 2.6 -0.8\nv 2.61 1 -0.8\nv 2.61 2.6 -0.8\nv 2.61 1 0.8\nv 2.61 2.6 0.8\n\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 0.05 0.95 0\nvt 0.05 0.95 0\n#6:\nvt 0.05 0.95 0\nvt 0.95 0.05 0\nvt 0.95 0.05 0\nvt 0.95 0.05 0\nvt 0.95 0.95 0\n#11:\nvt 0.95 0.95 0\nvt 0.95 0.95 0\nvt 1.00 0.05 0\nvt 0.95 0.00 0\nvt 1.00 0.95 0\n#16:\nvt 0.05 0.00 0\nvt 0.05 0.05 0\nvt 0.00 0.05 0\nvt 0.00 0.95 0\nvt 0.05 1.00 0\n#21:\nvt 0.95 1.00 0\n\n#front:\nf 3/9 4/12 2/6 1/3 \n#right:\nf 5/13 6/15 4/11 3/8 \n#back:\nf 7/9 8/12 6/6 5/3 \n#front:\nf 1/2 2/5 8/19 7/17 \n#up:\nf 4/10 6/21 8/20 2/4 \n#down:\nf 5/14 3/7 1/1 7/16\n\n"
);
J3DI.setFileData("lib/models/rubikscubes4/edge_u.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng edge_u_1 StickerU\nusemtl Stickers\nv 1 2.61 0.8\nv 1 2.71 0.8\nv 2.6 2.61 0.8\nv 2.6 2.71 0.8\nv 2.6 2.61 -0.8\nv 2.6 2.71 -0.8\nv 1 2.61 -0.8\nv 1 2.71 -0.8\n\nvt 0.05 0.95 0\nvt 0.00 0.05 0 \nvt 0.05 0.00 0\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 1 1 0\nvt 0.95 0.05 0\nvt 0.95 0.00 0\nvt 0.95 0.05 0\n#11:\nvt 0.95 0.05 0\nvt 0.95 0.05 0\nvt 1.00 0.95 0\nvt 0.95 1.00 0\nvt 0.95 0.95 0\nvt 0.95 0.95 0\nvt 0.00 0.95 0\nvt 0.05 1.00 0\nvt 0.05 0.95 0\nvt 0.05 0.95 0\n\n#front:\nf 3/9 4/12 2/6 1/3 \n#right:\nf 5/13 6/15 4/11 3/8 \n#back:\nf 7/18 8/20 6/16 5/14 \n#left:\nf 1/2 2/5 8/1 7/17 \n#up:\nf 4/10 6/15 8/19 2/4 \n#down:\nf 5/10 3/15 1/19 7/4 \n\n"
);

J3DI.setFileData("lib/models/rubikscubes4/side.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng side Disc\nv 0.915 0 0\nv 0.915 0 -0.45\nv 0.915 -0.172208 -0.415746\nv 0.915 -0.318198 -0.318198\nv 0.915 -0.415746 -0.172207\nv 0.915 -0.45 0\nv 0.915 -0.415746 0.172208\nv 0.915 -0.318198 0.318198\nv 0.915 -0.172207 0.415746\nv 0.915 0 0.45\nv 0.915 0.172208 0.415746\nv 0.915 0.318198 0.318198\nv 0.915 0.415746 0.172207\nv 0.915 0.45 0\nv 0.915 0.415746 -0.172208\nv 0.915 0.318198 -0.318198\nv 0.915 0.172208 -0.415746\n\nvt 0.5 0.5 0\nvt 1 0.5 0\nvt 0.96194 0.691342 0\nvt 0.853553 0.853553 0\nvt 0.691342 0.96194 0\nvt 0.5 1 0\nvt 0.308658 0.96194 0\nvt 0.146447 0.853553 0\nvt 0.03806 0.691342 0\nvt 0 0.5 0\nvt 0.03806 0.308658 0\nvt 0.146447 0.146447 0\nvt 0.308658 0.03806 0\nvt 0.5 0 0\nvt 0.691342 0.03806 0\nvt 0.853554 0.146447 0\nvt 0.96194 0.308658 0\n\nf 3/3 1/1 2/2 \nf 4/4 1/1 3/3 \nf 5/5 1/1 4/4 \nf 6/6 1/1 5/5 \nf 7/7 1/1 6/6 \nf 8/8 1/1 7/7 \nf 9/9 1/1 8/8 \nf 10/10 1/1 9/9 \nf 11/11 1/1 10/10 \nf 12/12 1/1 11/11 \nf 13/13 1/1 12/12 \nf 14/14 1/1 13/13 \nf 15/15 1/1 14/14 \nf 16/16 1/1 15/15 \nf 17/17 1/1 16/16 \nf 2/2 1/1 17/17 \n\ng side Cylinder\nv 1.705 0 -0.45\nv 0.915 0 -0.45\nv 1.705 -0.172208 -0.415746\nv 0.915 -0.172208 -0.415746\nv 1.705 -0.318198 -0.318198\nv 0.915 -0.318198 -0.318198\nv 1.705 -0.415746 -0.172208\nv 0.915 -0.415746 -0.172208\nv 1.705 -0.45 0\nv 0.915 -0.45 0\nv 1.705 -0.415746 0.172208\nv 0.915 -0.415746 0.172208\nv 1.705 -0.318198 0.318198\nv 0.915 -0.318198 0.318198\nv 1.705 -0.172207 0.415746\nv 0.915 -0.172207 0.415746\nv 1.705 0 0.45\nv 0.915 0 0.45\nv 1.705 0.172208 0.415746\nv 0.915 0.172208 0.415746\nv 1.705 0.318198 0.318198\nv 0.915 0.318198 0.318198\nv 1.705 0.415746 0.172207\nv 0.915 0.415746 0.172207\nv 1.705 0.45 0\nv 0.915 0.45 0\nv 1.705 0.415746 -0.172208\nv 0.915 0.415746 -0.172208\nv 1.705 0.318198 -0.318198\nv 0.915 0.318198 -0.318198\nv 1.705 0.172208 -0.415746\nv 0.915 0.172208 -0.415746\n\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 0.0625 0 0\nvt 0.0625 1 0\nvt 0.125 0 0\nvt 0.125 1 0\nvt 0.1875 0 0\nvt 0.1875 1 0\nvt 0.25 0 0\nvt 0.25 1 0\nvt 0.3125 0 0\nvt 0.3125 1 0\nvt 0.375 0 0\nvt 0.375 1 0\nvt 0.4375 0 0\nvt 0.4375 1 0\nvt 0.5 0 0\nvt 0.5 1 0\nvt 0.5625 0 0\nvt 0.5625 1 0\nvt 0.625 0 0\nvt 0.625 1 0\nvt 0.6875 0 0\nvt 0.6875 1 0\nvt 0.75 0 0\nvt 0.75 1 0\nvt 0.8125 0 0\nvt 0.8125 1 0\nvt 0.875 0 0\nvt 0.875 1 0\nvt 0.9375 0 0\nvt 0.9375 1 0\n\nf 20/22 21/23 19/21 18/19 \nf 22/24 23/25 21/23 20/22 \nf 24/26 25/27 23/25 22/24 \nf 26/28 27/29 25/27 24/26 \nf 28/30 29/31 27/29 26/28 \nf 30/32 31/33 29/31 28/30 \nf 32/34 33/35 31/33 30/32 \nf 34/36 35/37 33/35 32/34 \nf 36/38 37/39 35/37 34/36 \nf 38/40 39/41 37/39 36/38 \nf 40/42 41/43 39/41 38/40 \nf 42/44 43/45 41/43 40/42 \nf 44/46 45/47 43/45 42/44 \nf 46/48 47/49 45/47 44/46 \nf 48/50 49/51 47/49 46/48 \nf 18/18 19/20 49/51 48/50 \n\ng side Cube\nv 2.6 -0.895 0.795\nv 2.6 -0.895 -0.795\nv 1.8 -0.895 -0.795\nv 1.8 -0.895 0.795\nv 2.65 -0.881603 0.795\nv 2.65 -0.881603 -0.795\nv 2.643301 -0.881603 -0.82\nv 2.625 -0.881603 -0.838301\nv 2.6 -0.881603 -0.845\nv 1.8 -0.881603 -0.845\nv 1.775 -0.881603 -0.838301\nv 1.756699 -0.881603 -0.82\nv 1.75 -0.881603 -0.795\nv 1.75 -0.881603 0.795\nv 1.756699 -0.881603 0.82\nv 1.775 -0.881603 0.838301\nv 1.8 -0.881603 0.845\nv 2.6 -0.881603 0.845\nv 2.625 -0.881603 0.838301\nv 2.643301 -0.881603 0.82\nv 2.686603 -0.845 0.795\nv 2.686603 -0.845 -0.795\nv 2.675 -0.845 -0.838301\nv 2.643301 -0.845 -0.87\nv 2.6 -0.845 -0.881603\nv 1.8 -0.845 -0.881603\nv 1.756699 -0.845 -0.87\nv 1.725 -0.845 -0.838301\nv 1.713398 -0.845 -0.795\nv 1.713398 -0.845 0.795\nv 1.725 -0.845 0.838301\nv 1.756699 -0.845 0.87\nv 1.8 -0.845 0.881603\nv 2.6 -0.845 0.881603\nv 2.643301 -0.845 0.87\nv 2.675 -0.845 0.838301\nv 2.7 -0.795 0.795\nv 2.7 -0.795 -0.795\nv 2.686603 -0.795 -0.845\nv 2.65 -0.795 -0.881603\nv 2.6 -0.795 -0.895\nv 1.8 -0.795 -0.895\nv 1.75 -0.795 -0.881603\nv 1.713398 -0.795 -0.845\nv 1.7 -0.795 -0.795\nv 1.7 -0.795 0.795\nv 1.713398 -0.795 0.845\nv 1.75 -0.795 0.881603\nv 1.8 -0.795 0.895\nv 2.6 -0.795 0.895\nv 2.65 -0.795 0.881603\nv 2.686603 -0.795 0.845\nv 2.7 0.795 0.795\nv 2.7 0.795 -0.795\nv 2.686603 0.795 -0.845\nv 2.65 0.795 -0.881603\nv 2.6 0.795 -0.895\nv 1.8 0.795 -0.895\nv 1.75 0.795 -0.881603\nv 1.713398 0.795 -0.845\nv 1.7 0.795 -0.795\nv 1.7 0.795 0.795\nv 1.713398 0.795 0.845\nv 1.75 0.795 0.881603\nv 1.8 0.795 0.895\nv 2.6 0.795 0.895\nv 2.65 0.795 0.881603\nv 2.686603 0.795 0.845\nv 2.686603 0.845 0.795\nv 2.686603 0.845 -0.795\nv 2.675 0.845 -0.838301\nv 2.643301 0.845 -0.87\nv 2.6 0.845 -0.881603\nv 1.8 0.845 -0.881603\nv 1.756699 0.845 -0.87\nv 1.725 0.845 -0.838301\nv 1.713398 0.845 -0.795\nv 1.713398 0.845 0.795\nv 1.725 0.845 0.838301\nv 1.756699 0.845 0.87\nv 1.8 0.845 0.881603\nv 2.6 0.845 0.881603\nv 2.643301 0.845 0.87\nv 2.675 0.845 0.838301\nv 2.65 0.881603 0.795\nv 2.65 0.881603 -0.795\nv 2.643301 0.881603 -0.82\nv 2.625 0.881603 -0.838301\nv 2.6 0.881603 -0.845\nv 1.8 0.881603 -0.845\nv 1.775 0.881603 -0.838301\nv 1.756699 0.881603 -0.82\nv 1.75 0.881603 -0.795\nv 1.75 0.881603 0.795\nv 1.756699 0.881603 0.82\nv 1.775 0.881603 0.838301\nv 1.8 0.881603 0.845\nv 2.6 0.881603 0.845\nv 2.625 0.881603 0.838301\nv 2.643301 0.881603 0.82\nv 2.6 0.895 0.795\nv 2.6 0.895 -0.795\nv 1.8 0.895 -0.795\nv 1.8 0.895 0.795\n\nvt 0 1 0\nvt 0.972646 0 0\nvt 0.917938 0 0\nvt 0.86323 0 0\nvt 0.835876 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 0 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 1 0 0\nvt 0 0 0\nvt 0.972646 0 0\nvt 0.917938 0 0\nvt 0.86323 0 0\nvt 0.835876 0 0\nvt 0 0 0\nvt 0.985015 0 0\nvt 0.955045 0 0\nvt 0.925075 0 0\nvt 0.91009 0 0\nvt 1 0.027498 0\nvt 0 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 0 0.027498 0\nvt 1 0.027498 0\nvt 0.835876 0.027498 0\nvt 0.890584 0.027498 0\nvt 0.945292 0.027498 0\nvt 0 0.027498 0\nvt 1 0.027498 0\nvt 0.91009 0.027498 0\nvt 0.94006 0.027498 0\nvt 0.97003 0.027498 0\nvt 0 0.027498 0\nvt 1 0.027498 0\nvt 0.835876 0.027498 0\nvt 0.890584 0.027498 0\nvt 0.945292 0.027498 0\nvt 1 0.054995 0\nvt 0 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 0 0.054995 0\nvt 1 0.054995 0\nvt 0.835876 0.054995 0\nvt 0.890584 0.054995 0\nvt 0.945292 0.054995 0\nvt 0 0.054995 0\nvt 1 0.054995 0\nvt 0.91009 0.054995 0\nvt 0.94006 0.054995 0\nvt 0.97003 0.054995 0\nvt 0 0.054995 0\nvt 1 0.054995 0\nvt 0.835876 0.054995 0\nvt 0.890584 0.054995 0\nvt 0.945292 0.054995 0\nvt 1 0.082493 0\nvt 0 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.835876 0.082493 0\nvt 0.890584 0.082493 0\nvt 0.945292 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.91009 0.082493 0\nvt 0.94006 0.082493 0\nvt 0.97003 0.082493 0\nvt 0 0.082493 0\nvt 1 0.082493 0\nvt 0.835876 0.082493 0\nvt 0.890584 0.082493 0\nvt 0.945292 0.082493 0\nvt 1 0.917507 0\nvt 0 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.835876 0.917507 0\nvt 0.890584 0.917507 0\nvt 0.945292 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.91009 0.917507 0\nvt 0.94006 0.917507 0\nvt 0.97003 0.917507 0\nvt 0 0.917507 0\nvt 1 0.917507 0\nvt 0.835876 0.917507 0\nvt 0.890584 0.917507 0\nvt 0.945292 0.917507 0\nvt 1 0.945005 0\nvt 0 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 0 0.945005 0\nvt 1 0.945005 0\nvt 0.835876 0.945005 0\nvt 0.890584 0.945005 0\nvt 0.945292 0.945005 0\nvt 0 0.945005 0\nvt 1 0.945005 0\nvt 0.91009 0.945005 0\nvt 0.94006 0.945005 0\nvt 0.97003 0.945005 0\nvt 0 0.945005 0\nvt 1 0.945005 0\nvt 0.835876 0.945005 0\nvt 0.890584 0.945005 0\nvt 0.945292 0.945005 0\nvt 1 0.972502 0\nvt 0 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0.972502 0\nvt 1 0.972502 0\nvt 0.835876 0.972502 0\nvt 0.890584 0.972502 0\nvt 0.945292 0.972502 0\nvt 0 0.972502 0\nvt 1 0.972502 0\nvt 0.91009 0.972502 0\nvt 0.94006 0.972502 0\nvt 0.97003 0.972502 0\nvt 0 0.972502 0\nvt 1 0.972502 0\nvt 0.835876 0.972502 0\nvt 0.890584 0.972502 0\nvt 0.945292 0.972502 0\nvt 0 0 0\nvt 0.972646 1 0\nvt 0.917938 1 0\nvt 0.86323 1 0\nvt 0.835876 1 0\nvt 0 1 0\nvt 1 0 0\nvt 0 1 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\nvt 1 1 0\nvt 0 1 0\nvt 0.972646 1 0\nvt 0.917938 1 0\nvt 0.86323 1 0\nvt 0.835876 1 0\nvt 0 1 0\nvt 0.985015 1 0\nvt 0.955045 1 0\nvt 0.925075 1 0\nvt 0.91009 1 0\n\nf 51/63 55/77 54/76 50/57 \nf 55/77 71/97 70/96 54/76 \nf 71/97 87/117 86/116 70/96 \nf 87/117 103/137 102/136 86/116 \nf 103/137 119/157 118/156 102/136 \nf 119/157 135/177 134/176 118/156 \nf 135/177 151/206 150/200 134/176 \nf 56/78 55/77 51/62 \nf 56/78 72/98 71/97 55/77 \nf 72/98 88/118 87/117 71/97 \nf 88/118 104/138 103/137 87/117 \nf 104/138 120/158 119/157 103/137 \nf 120/158 136/178 135/177 119/157 \nf 136/178 151/205 135/177 \nf 57/79 56/78 51/61 \nf 57/79 73/99 72/98 56/78 \nf 73/99 89/119 88/118 72/98 \nf 89/119 105/139 104/138 88/118 \nf 105/139 121/159 120/158 104/138 \nf 121/159 137/179 136/178 120/158 \nf 137/179 151/204 136/178 \nf 58/81 57/79 51/60 \nf 58/81 74/101 73/99 57/79 \nf 74/101 90/121 89/119 73/99 \nf 90/121 106/141 105/139 89/119 \nf 106/141 122/161 121/159 105/139 \nf 122/161 138/181 137/179 121/159 \nf 138/181 151/203 137/179 \nf 52/69 59/82 58/80 51/59 \nf 59/82 75/102 74/100 58/80 \nf 75/102 91/122 90/120 74/100 \nf 91/122 107/142 106/140 90/120 \nf 107/142 123/162 122/160 106/140 \nf 123/162 139/182 138/180 122/160 \nf 139/182 152/212 151/202 138/180 \nf 60/83 59/82 52/68 \nf 60/83 76/103 75/102 59/82 \nf 76/103 92/123 91/122 75/102 \nf 92/123 108/143 107/142 91/122 \nf 108/143 124/163 123/162 107/142 \nf 124/163 140/183 139/182 123/162 \nf 140/183 152/211 139/182 \nf 61/84 60/83 52/67 \nf 61/84 77/104 76/103 60/83 \nf 77/104 93/124 92/123 76/103 \nf 93/124 109/144 108/143 92/123 \nf 109/144 125/164 124/163 108/143 \nf 125/164 141/184 140/183 124/163 \nf 141/184 152/210 140/183 \nf 62/86 61/84 52/66 \nf 62/86 78/106 77/104 61/84 \nf 78/106 94/126 93/124 77/104 \nf 94/126 110/146 109/144 93/124 \nf 110/146 126/166 125/164 109/144 \nf 126/166 142/186 141/184 125/164 \nf 142/186 152/209 141/184 \nf 53/74 63/87 62/85 52/65 \nf 63/87 79/107 78/105 62/85 \nf 79/107 95/127 94/125 78/105 \nf 95/127 111/147 110/145 94/125 \nf 111/147 127/167 126/165 110/145 \nf 127/167 143/187 142/185 126/165 \nf 143/187 153/217 152/208 142/185 \nf 64/88 63/87 53/73 \nf 64/88 80/108 79/107 63/87 \nf 80/108 96/128 95/127 79/107 \nf 96/128 112/148 111/147 95/127 \nf 112/148 128/168 127/167 111/147 \nf 128/168 144/188 143/187 127/167 \nf 144/188 153/216 143/187 \nf 65/89 64/88 53/72 \nf 65/89 81/109 80/108 64/88 \nf 81/109 97/129 96/128 80/108 \nf 97/129 113/149 112/148 96/128 \nf 113/149 129/169 128/168 112/148 \nf 129/169 145/189 144/188 128/168 \nf 145/189 153/215 144/188 \nf 66/91 65/89 53/71 \nf 66/91 82/111 81/109 65/89 \nf 82/111 98/131 97/129 81/109 \nf 98/131 114/151 113/149 97/129 \nf 114/151 130/171 129/169 113/149 \nf 130/171 146/191 145/189 129/169 \nf 146/191 153/214 145/189 \nf 50/56 67/92 66/90 53/70 \nf 67/92 83/112 82/110 66/90 \nf 83/112 99/132 98/130 82/110 \nf 99/132 115/152 114/150 98/130 \nf 115/152 131/172 130/170 114/150 \nf 131/172 147/192 146/190 130/170 \nf 147/192 150/199 153/213 146/190 \nf 68/93 67/92 50/55 \nf 68/93 84/113 83/112 67/92 \nf 84/113 100/133 99/132 83/112 \nf 100/133 116/153 115/152 99/132 \nf 116/153 132/173 131/172 115/152 \nf 132/173 148/193 147/192 131/172 \nf 148/193 150/198 147/192 \nf 69/94 68/93 50/54 \nf 69/94 85/114 84/113 68/93 \nf 85/114 101/134 100/133 84/113 \nf 101/134 117/154 116/153 100/133 \nf 117/154 133/174 132/173 116/153 \nf 133/174 149/194 148/193 132/173 \nf 149/194 150/197 148/193 \nf 54/75 69/94 50/53 \nf 54/75 70/95 85/114 69/94 \nf 70/95 86/115 101/134 85/114 \nf 86/115 102/135 117/154 101/134 \nf 102/135 118/155 133/174 117/154 \nf 118/155 134/175 149/194 133/174 \nf 134/175 150/196 149/194 \nf 151/201 152/207 153/213 150/195 \nf 53/70 52/64 51/58 50/52 \n\n"
);
J3DI.setFileData("lib/models/rubikscubes4/side_r.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng side_r Sticker\nusemtl Stickers\nv 2.71 -0.8 0.8\nv 2.71 0.8 0.8\nv 2.71 -0.8 -0.8\nv 2.71 0.8 -0.8\nv 2.61 -0.8 -0.8\nv 2.61 0.8 -0.8\nv 2.61 -0.8 0.8\nv 2.61 0.8 0.8\n\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 0.05 0.05 0\nvt 0.05 0.95 0\nvt 0.05 0.95 0\n#6:\nvt 0.05 0.95 0\nvt 0.95 0.05 0\nvt 0.95 0.05 0\nvt 0.95 0.05 0\nvt 0.95 0.95 0\n#11:\nvt 0.95 0.95 0\nvt 0.95 0.95 0\nvt 1.00 0.05 0\nvt 0.95 0.00 0\nvt 1.00 0.95 0\n#16:\nvt 0.05 0.00 0\nvt 0.05 0.05 0\nvt 0.00 0.05 0\nvt 0.00 0.95 0\nvt 0.00 0.95 0\nvt 0.05 1.00 0\n#21:\nvt 0.95 1.00 0\n\n#right:\nf 3/9 4/12 2/6 1/3 \n#back:\nf 5/13 6/15 4/11 3/8 \n#left:\nf 7/9 8/12 6/6 5/3 \n#front:\nf 1/2 2/5 8/19 7/17 \n#up:\nf 4/10 6/21 8/20 2/4 \n#down:\nf 5/14 3/7 1/1 7/16\n\n"
);

J3DI.setFileData("lib/models/rubikscubes4/center.obj",
"# WaveFront *.obj file (generated by CINEMA 4D)\n\ng CenterPart Cylinder_Y\nv -0.008281 -0.9 0.004201\nv -0.008281 0.9 0.004201\nv 0.441719 -0.9 0.004201\nv 0.441719 -0.9 0.004201\nv 0.441719 0.9 0.004201\nv 0.441719 0.9 0.004201\nv 0.407465 -0.9 -0.168007\nv 0.407465 -0.9 -0.168007\nv 0.407465 0.9 -0.168007\nv 0.407465 0.9 -0.168007\nv 0.309917 -0.9 -0.313997\nv 0.309917 -0.9 -0.313997\nv 0.309917 0.9 -0.313997\nv 0.309917 0.9 -0.313997\nv 0.163927 -0.9 -0.411545\nv 0.163927 -0.9 -0.411545\nv 0.163927 0.9 -0.411545\nv 0.163927 0.9 -0.411545\nv -0.008281 -0.9 -0.445799\nv -0.008281 -0.9 -0.445799\nv -0.008281 0.9 -0.445799\nv -0.008281 0.9 -0.445799\nv -0.180488 -0.9 -0.411545\nv -0.180488 -0.9 -0.411545\nv -0.180488 0.9 -0.411545\nv -0.180488 0.9 -0.411545\nv -0.326479 -0.9 -0.313997\nv -0.326479 -0.9 -0.313997\nv -0.326479 0.9 -0.313997\nv -0.326479 0.9 -0.313997\nv -0.424027 -0.9 -0.168007\nv -0.424027 -0.9 -0.168007\nv -0.424027 0.9 -0.168007\nv -0.424027 0.9 -0.168007\nv -0.458281 -0.9 0.004201\nv -0.458281 -0.9 0.004201\nv -0.458281 0.9 0.004201\nv -0.458281 0.9 0.004201\nv -0.424027 -0.9 0.176408\nv -0.424027 -0.9 0.176408\nv -0.424027 0.9 0.176408\nv -0.424027 0.9 0.176408\nv -0.326479 -0.9 0.322399\nv -0.326479 -0.9 0.322399\nv -0.326479 0.9 0.322399\nv -0.326479 0.9 0.322399\nv -0.180488 -0.9 0.419947\nv -0.180488 -0.9 0.419947\nv -0.180488 0.9 0.419947\nv -0.180488 0.9 0.419947\nv -0.008281 -0.9 0.454201\nv -0.008281 -0.9 0.454201\nv -0.008281 0.9 0.454201\nv -0.008281 0.9 0.454201\nv 0.163927 -0.9 0.419947\nv 0.163927 -0.9 0.419947\nv 0.163927 0.9 0.419947\nv 0.163927 0.9 0.419947\nv 0.309917 -0.9 0.322399\nv 0.309917 -0.9 0.322399\nv 0.309917 0.9 0.322399\nv 0.309917 0.9 0.322399\nv 0.407465 -0.9 0.176408\nv 0.407465 -0.9 0.176408\nv 0.407465 0.9 0.176408\nv 0.407465 0.9 0.176408\n\nvt 0.5 0.5 0\nvt 0.5 0.5 0\nvt 0 0.5 0\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 1 0.5 0\nvt 0.03806 0.691342 0\nvt 0.0625 0 0\nvt 0.0625 1 0\nvt 0.96194 0.691342 0\nvt 0.146447 0.853553 0\nvt 0.125 0 0\nvt 0.125 1 0\nvt 0.853553 0.853553 0\nvt 0.308658 0.96194 0\nvt 0.1875 0 0\nvt 0.1875 1 0\nvt 0.691342 0.96194 0\nvt 0.5 1 0\nvt 0.25 0 0\nvt 0.25 1 0\nvt 0.5 1 0\nvt 0.691342 0.96194 0\nvt 0.3125 0 0\nvt 0.3125 1 0\nvt 0.308658 0.96194 0\nvt 0.853553 0.853553 0\nvt 0.375 0 0\nvt 0.375 1 0\nvt 0.146447 0.853553 0\nvt 0.96194 0.691342 0\nvt 0.4375 0 0\nvt 0.4375 1 0\nvt 0.03806 0.691342 0\nvt 1 0.5 0\nvt 0.5 0 0\nvt 0.5 1 0\nvt 0 0.5 0\nvt 0.96194 0.308658 0\nvt 0.5625 0 0\nvt 0.5625 1 0\nvt 0.03806 0.308658 0\nvt 0.853553 0.146447 0\nvt 0.625 0 0\nvt 0.625 1 0\nvt 0.146447 0.146447 0\nvt 0.691342 0.03806 0\nvt 0.6875 0 0\nvt 0.6875 1 0\nvt 0.308658 0.03806 0\nvt 0.5 0 0\nvt 0.75 0 0\nvt 0.75 1 0\nvt 0.5 0 0\nvt 0.308658 0.03806 0\nvt 0.8125 0 0\nvt 0.8125 1 0\nvt 0.691342 0.03806 0\nvt 0.146446 0.146447 0\nvt 0.875 0 0\nvt 0.875 1 0\nvt 0.853554 0.146447 0\nvt 0.03806 0.308658 0\nvt 0.9375 0 0\nvt 0.9375 1 0\nvt 0.96194 0.308658 0\n\nf 7/9 3/3 1/1 \nf 8/10 9/11 5/7 4/5 \nf 10/12 2/2 6/8 \nf 11/13 7/9 1/1 \nf 12/14 13/15 9/11 8/10 \nf 14/16 2/2 10/12 \nf 15/17 11/13 1/1 \nf 16/18 17/19 13/15 12/14 \nf 18/20 2/2 14/16 \nf 19/21 15/17 1/1 \nf 20/22 21/23 17/19 16/18 \nf 22/24 2/2 18/20 \nf 23/25 19/21 1/1 \nf 24/26 25/27 21/23 20/22 \nf 26/28 2/2 22/24 \nf 27/29 23/25 1/1 \nf 28/30 29/31 25/27 24/26 \nf 30/32 2/2 26/28 \nf 31/33 27/29 1/1 \nf 32/34 33/35 29/31 28/30 \nf 34/36 2/2 30/32 \nf 35/37 31/33 1/1 \nf 36/38 37/39 33/35 32/34 \nf 38/40 2/2 34/36 \nf 39/41 35/37 1/1 \nf 40/42 41/43 37/39 36/38 \nf 42/44 2/2 38/40 \nf 43/45 39/41 1/1 \nf 44/46 45/47 41/43 40/42 \nf 46/48 2/2 42/44 \nf 47/49 43/45 1/1 \nf 48/50 49/51 45/47 44/46 \nf 50/52 2/2 46/48 \nf 51/53 47/49 1/1 \nf 52/54 53/55 49/51 48/50 \nf 54/56 2/2 50/52 \nf 55/57 51/53 1/1 \nf 56/58 57/59 53/55 52/54 \nf 58/60 2/2 54/56 \nf 59/61 55/57 1/1 \nf 60/62 61/63 57/59 56/58 \nf 62/64 2/2 58/60 \nf 63/65 59/61 1/1 \nf 64/66 65/67 61/63 60/62 \nf 66/68 2/2 62/64 \nf 3/3 63/65 1/1 \nf 4/4 5/6 65/67 64/66 \nf 6/8 2/2 66/68 \n\ng CenterPart Cylinder_X\nv -0.908281 0 0.004201\nv 0.891719 0 0.004201\nv -0.908281 -0.45 0.004201\nv -0.908281 -0.45 0.004201\nv 0.891719 -0.45 0.004201\nv 0.891719 -0.45 0.004201\nv -0.908281 -0.415746 -0.168007\nv -0.908281 -0.415746 -0.168007\nv 0.891719 -0.415746 -0.168007\nv 0.891719 -0.415746 -0.168007\nv -0.908281 -0.318198 -0.313997\nv -0.908281 -0.318198 -0.313997\nv 0.891719 -0.318198 -0.313997\nv 0.891719 -0.318198 -0.313997\nv -0.908281 -0.172208 -0.411545\nv -0.908281 -0.172208 -0.411545\nv 0.891719 -0.172208 -0.411545\nv 0.891719 -0.172208 -0.411545\nv -0.908281 0 -0.445799\nv -0.908281 0 -0.445799\nv 0.891719 0 -0.445799\nv 0.891719 0 -0.445799\nv -0.908281 0.172208 -0.411545\nv -0.908281 0.172208 -0.411545\nv 0.891719 0.172208 -0.411545\nv 0.891719 0.172208 -0.411545\nv -0.908281 0.318198 -0.313997\nv -0.908281 0.318198 -0.313997\nv 0.891719 0.318198 -0.313997\nv 0.891719 0.318198 -0.313997\nv -0.908281 0.415746 -0.168007\nv -0.908281 0.415746 -0.168007\nv 0.891719 0.415746 -0.168007\nv 0.891719 0.415746 -0.168007\nv -0.908281 0.45 0.004201\nv -0.908281 0.45 0.004201\nv 0.891719 0.45 0.004201\nv 0.891719 0.45 0.004201\nv -0.908281 0.415746 0.176408\nv -0.908281 0.415746 0.176408\nv 0.891719 0.415746 0.176408\nv 0.891719 0.415746 0.176408\nv -0.908281 0.318198 0.322399\nv -0.908281 0.318198 0.322399\nv 0.891719 0.318198 0.322399\nv 0.891719 0.318198 0.322399\nv -0.908281 0.172207 0.419947\nv -0.908281 0.172207 0.419947\nv 0.891719 0.172207 0.419947\nv 0.891719 0.172207 0.419947\nv -0.908281 0 0.454201\nv -0.908281 0 0.454201\nv 0.891719 0 0.454201\nv 0.891719 0 0.454201\nv -0.908281 -0.172208 0.419947\nv -0.908281 -0.172208 0.419947\nv 0.891719 -0.172208 0.419947\nv 0.891719 -0.172208 0.419947\nv -0.908281 -0.318198 0.322399\nv -0.908281 -0.318198 0.322399\nv 0.891719 -0.318198 0.322399\nv 0.891719 -0.318198 0.322399\nv -0.908281 -0.415746 0.176408\nv -0.908281 -0.415746 0.176408\nv 0.891719 -0.415746 0.176408\nv 0.891719 -0.415746 0.176408\n\nvt 0.5 0.5 0\nvt 0.5 0.5 0\nvt 0 0.5 0\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 1 0.5 0\nvt 0.03806 0.691342 0\nvt 0.0625 0 0\nvt 0.0625 1 0\nvt 0.96194 0.691342 0\nvt 0.146447 0.853553 0\nvt 0.125 0 0\nvt 0.125 1 0\nvt 0.853553 0.853553 0\nvt 0.308658 0.96194 0\nvt 0.1875 0 0\nvt 0.1875 1 0\nvt 0.691342 0.96194 0\nvt 0.5 1 0\nvt 0.25 0 0\nvt 0.25 1 0\nvt 0.5 1 0\nvt 0.691342 0.96194 0\nvt 0.3125 0 0\nvt 0.3125 1 0\nvt 0.308658 0.96194 0\nvt 0.853553 0.853553 0\nvt 0.375 0 0\nvt 0.375 1 0\nvt 0.146447 0.853553 0\nvt 0.96194 0.691342 0\nvt 0.4375 0 0\nvt 0.4375 1 0\nvt 0.03806 0.691342 0\nvt 1 0.5 0\nvt 0.5 0 0\nvt 0.5 1 0\nvt 0 0.5 0\nvt 0.96194 0.308658 0\nvt 0.5625 0 0\nvt 0.5625 1 0\nvt 0.03806 0.308658 0\nvt 0.853553 0.146447 0\nvt 0.625 0 0\nvt 0.625 1 0\nvt 0.146447 0.146447 0\nvt 0.691342 0.03806 0\nvt 0.6875 0 0\nvt 0.6875 1 0\nvt 0.308658 0.03806 0\nvt 0.5 0 0\nvt 0.75 0 0\nvt 0.75 1 0\nvt 0.5 0 0\nvt 0.308658 0.03806 0\nvt 0.8125 0 0\nvt 0.8125 1 0\nvt 0.691342 0.03806 0\nvt 0.146446 0.146447 0\nvt 0.875 0 0\nvt 0.875 1 0\nvt 0.853554 0.146447 0\nvt 0.03806 0.308658 0\nvt 0.9375 0 0\nvt 0.9375 1 0\nvt 0.96194 0.308658 0\n\nf 73/77 69/71 67/69 \nf 74/78 75/79 71/75 70/73 \nf 76/80 68/70 72/76 \nf 77/81 73/77 67/69 \nf 78/82 79/83 75/79 74/78 \nf 80/84 68/70 76/80 \nf 81/85 77/81 67/69 \nf 82/86 83/87 79/83 78/82 \nf 84/88 68/70 80/84 \nf 85/89 81/85 67/69 \nf 86/90 87/91 83/87 82/86 \nf 88/92 68/70 84/88 \nf 89/93 85/89 67/69 \nf 90/94 91/95 87/91 86/90 \nf 92/96 68/70 88/92 \nf 93/97 89/93 67/69 \nf 94/98 95/99 91/95 90/94 \nf 96/100 68/70 92/96 \nf 97/101 93/97 67/69 \nf 98/102 99/103 95/99 94/98 \nf 100/104 68/70 96/100 \nf 101/105 97/101 67/69 \nf 102/106 103/107 99/103 98/102 \nf 104/108 68/70 100/104 \nf 105/109 101/105 67/69 \nf 106/110 107/111 103/107 102/106 \nf 108/112 68/70 104/108 \nf 109/113 105/109 67/69 \nf 110/114 111/115 107/111 106/110 \nf 112/116 68/70 108/112 \nf 113/117 109/113 67/69 \nf 114/118 115/119 111/115 110/114 \nf 116/120 68/70 112/116 \nf 117/121 113/117 67/69 \nf 118/122 119/123 115/119 114/118 \nf 120/124 68/70 116/120 \nf 121/125 117/121 67/69 \nf 122/126 123/127 119/123 118/122 \nf 124/128 68/70 120/124 \nf 125/129 121/125 67/69 \nf 126/130 127/131 123/127 122/126 \nf 128/132 68/70 124/128 \nf 129/133 125/129 67/69 \nf 130/134 131/135 127/131 126/130 \nf 132/136 68/70 128/132 \nf 69/71 129/133 67/69 \nf 70/72 71/74 131/135 130/134 \nf 72/76 68/70 132/136 \n\ng CenterPart Cylinder_Z\nv -0.008281 0 0.904201\nv -0.008281 0 -0.895799\nv 0.441719 0 0.904201\nv 0.441719 0 0.904201\nv 0.441719 0 -0.895799\nv 0.441719 0 -0.895799\nv 0.407465 -0.172208 0.904201\nv 0.407465 -0.172208 0.904201\nv 0.407465 -0.172208 -0.895799\nv 0.407465 -0.172208 -0.895799\nv 0.309917 -0.318198 0.904201\nv 0.309917 -0.318198 0.904201\nv 0.309917 -0.318198 -0.895799\nv 0.309917 -0.318198 -0.895799\nv 0.163927 -0.415746 0.904201\nv 0.163927 -0.415746 0.904201\nv 0.163927 -0.415746 -0.895799\nv 0.163927 -0.415746 -0.895799\nv -0.008281 -0.45 0.904201\nv -0.008281 -0.45 0.904201\nv -0.008281 -0.45 -0.895799\nv -0.008281 -0.45 -0.895799\nv -0.180488 -0.415746 0.904201\nv -0.180488 -0.415746 0.904201\nv -0.180488 -0.415746 -0.895799\nv -0.180488 -0.415746 -0.895799\nv -0.326479 -0.318198 0.904201\nv -0.326479 -0.318198 0.904201\nv -0.326479 -0.318198 -0.895799\nv -0.326479 -0.318198 -0.895799\nv -0.424027 -0.172207 0.904201\nv -0.424027 -0.172207 0.904201\nv -0.424027 -0.172207 -0.895799\nv -0.424027 -0.172207 -0.895799\nv -0.458281 0 0.904201\nv -0.458281 0 0.904201\nv -0.458281 0 -0.895799\nv -0.458281 0 -0.895799\nv -0.424027 0.172208 0.904201\nv -0.424027 0.172208 0.904201\nv -0.424027 0.172208 -0.895799\nv -0.424027 0.172208 -0.895799\nv -0.326479 0.318198 0.904201\nv -0.326479 0.318198 0.904201\nv -0.326479 0.318198 -0.895799\nv -0.326479 0.318198 -0.895799\nv -0.180488 0.415746 0.904201\nv -0.180488 0.415746 0.904201\nv -0.180488 0.415746 -0.895799\nv -0.180488 0.415746 -0.895799\nv -0.008281 0.45 0.904201\nv -0.008281 0.45 0.904201\nv -0.008281 0.45 -0.895799\nv -0.008281 0.45 -0.895799\nv 0.163927 0.415746 0.904201\nv 0.163927 0.415746 0.904201\nv 0.163927 0.415746 -0.895799\nv 0.163927 0.415746 -0.895799\nv 0.309917 0.318198 0.904201\nv 0.309917 0.318198 0.904201\nv 0.309917 0.318198 -0.895799\nv 0.309917 0.318198 -0.895799\nv 0.407465 0.172208 0.904201\nv 0.407465 0.172208 0.904201\nv 0.407465 0.172208 -0.895799\nv 0.407465 0.172208 -0.895799\n\nvt 0.5 0.5 0\nvt 0.5 0.5 0\nvt 0 0.5 0\nvt 1 0 0\nvt 0 0 0\nvt 1 1 0\nvt 0 1 0\nvt 1 0.5 0\nvt 0.03806 0.691342 0\nvt 0.0625 0 0\nvt 0.0625 1 0\nvt 0.96194 0.691342 0\nvt 0.146447 0.853553 0\nvt 0.125 0 0\nvt 0.125 1 0\nvt 0.853553 0.853553 0\nvt 0.308658 0.96194 0\nvt 0.1875 0 0\nvt 0.1875 1 0\nvt 0.691342 0.96194 0\nvt 0.5 1 0\nvt 0.25 0 0\nvt 0.25 1 0\nvt 0.5 1 0\nvt 0.691342 0.96194 0\nvt 0.3125 0 0\nvt 0.3125 1 0\nvt 0.308658 0.96194 0\nvt 0.853553 0.853553 0\nvt 0.375 0 0\nvt 0.375 1 0\nvt 0.146447 0.853553 0\nvt 0.96194 0.691342 0\nvt 0.4375 0 0\nvt 0.4375 1 0\nvt 0.03806 0.691342 0\nvt 1 0.5 0\nvt 0.5 0 0\nvt 0.5 1 0\nvt 0 0.5 0\nvt 0.96194 0.308658 0\nvt 0.5625 0 0\nvt 0.5625 1 0\nvt 0.03806 0.308658 0\nvt 0.853553 0.146447 0\nvt 0.625 0 0\nvt 0.625 1 0\nvt 0.146447 0.146447 0\nvt 0.691342 0.03806 0\nvt 0.6875 0 0\nvt 0.6875 1 0\nvt 0.308658 0.03806 0\nvt 0.5 0 0\nvt 0.75 0 0\nvt 0.75 1 0\nvt 0.5 0 0\nvt 0.308658 0.03806 0\nvt 0.8125 0 0\nvt 0.8125 1 0\nvt 0.691342 0.03806 0\nvt 0.146446 0.146447 0\nvt 0.875 0 0\nvt 0.875 1 0\nvt 0.853554 0.146447 0\nvt 0.03806 0.308658 0\nvt 0.9375 0 0\nvt 0.9375 1 0\nvt 0.96194 0.308658 0\n\nf 139/145 135/139 133/137 \nf 140/146 141/147 137/143 136/141 \nf 142/148 134/138 138/144 \nf 143/149 139/145 133/137 \nf 144/150 145/151 141/147 140/146 \nf 146/152 134/138 142/148 \nf 147/153 143/149 133/137 \nf 148/154 149/155 145/151 144/150 \nf 150/156 134/138 146/152 \nf 151/157 147/153 133/137 \nf 152/158 153/159 149/155 148/154 \nf 154/160 134/138 150/156 \nf 155/161 151/157 133/137 \nf 156/162 157/163 153/159 152/158 \nf 158/164 134/138 154/160 \nf 159/165 155/161 133/137 \nf 160/166 161/167 157/163 156/162 \nf 162/168 134/138 158/164 \nf 163/169 159/165 133/137 \nf 164/170 165/171 161/167 160/166 \nf 166/172 134/138 162/168 \nf 167/173 163/169 133/137 \nf 168/174 169/175 165/171 164/170 \nf 170/176 134/138 166/172 \nf 171/177 167/173 133/137 \nf 172/178 173/179 169/175 168/174 \nf 174/180 134/138 170/176 \nf 175/181 171/177 133/137 \nf 176/182 177/183 173/179 172/178 \nf 178/184 134/138 174/180 \nf 179/185 175/181 133/137 \nf 180/186 181/187 177/183 176/182 \nf 182/188 134/138 178/184 \nf 183/189 179/185 133/137 \nf 184/190 185/191 181/187 180/186 \nf 186/192 134/138 182/188 \nf 187/193 183/189 133/137 \nf 188/194 189/195 185/191 184/190 \nf 190/196 134/138 186/192 \nf 191/197 187/193 133/137 \nf 192/198 193/199 189/195 188/194 \nf 194/200 134/138 190/196 \nf 195/201 191/197 133/137 \nf 196/202 197/203 193/199 192/198 \nf 198/204 134/138 194/200 \nf 135/139 195/201 133/137 \nf 136/140 137/142 197/203 196/202 \nf 138/144 134/138 198/204 \n\n"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

/*
 * @(#)PreloadWebglShaders.js  1.0  2014-01-17
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Preloads the shaders used by WebglPlayerApplet. 
*/
// --------------
// require.js
// --------------
define("PreloadWebglShaders", ["J3DI"], 
function (J3DI) {

J3DI.setFileData("lib/shaders/texture.fshader",
"/*\n * @(#)texture.fshader  1.1  2012-07-15\n *\n * Copyright (c) 2011-2012 Werner Randelshofer, Immensee, Switzerland.\n * All rights reserved.\n *\n * You may not use, copy or modify this file, except in compliance with the\n * license agreement you entered into with Werner Randelshofer.\n * For details see accompanying license terms.\n */\n\n// WebGL Fragment Shader\n#ifdef GL_ES\n    precision mediump float;\n#endif\n\n// World information\n// -----------------\nuniform vec3 camPos;         // camera position in world coordinates\nuniform vec3 lightPos;       // light position in world coordinates\n\n// Model information\n// -----------------\nuniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess\nuniform sampler2D mTexture;  // texture\nuniform bool mHasTexture; \n\n\n// Fragment information\n// --------------------\nvarying vec4 fColor;\nvarying vec4 fNormal;\nvarying vec4 fPos;\nvarying vec2 fTexture;       // fragment texture cooordinates\n\n\nvoid main() {\n  vec3 wi = normalize(lightPos - fPos.xyz); // direction to light source\n  vec3 wo = normalize(camPos - fPos.xyz); // direction to observer\n  vec3 n = normalize(fNormal.xyz);\n  float specular=pow( max(0.0,-dot(reflect(wi, n), wo)), mPhong.w)*mPhong.z;\n  float diffuse=max(0.0,dot(wi,n))*mPhong.y;\n  float ambient=mPhong.x;\n  \n  vec4 color=(mHasTexture)?texture2D(mTexture, fTexture):fColor;\n  \n  gl_FragColor=vec4(color.rgb*(diffuse+ambient)+specular*vec3(1,1,1), color.a);\n  //gl_FragColor=vec4(n.x,n.y,n.z, color.a);\n}\n \n \n"
);

J3DI.setFileData("lib/shaders/texture.vshader",
"/*\n * @(#)texture.vshader  1.1  2012-07-15\n *\n * Copyright (c) 2011-2012 Werner Randelshofer, Immensee, Switzerland.\n * All rights reserved.\n *\n * You may not use, copy or modify this file, except in compliance with the\n * license agreement you entered into with Werner Randelshofer.\n * For details see accompanying license terms.\n */\n \n// WebGL Vertex Shader\n#ifdef GL_ES\n    precision mediump float;\n#endif\n\n// World information\n// -----------------\nuniform vec3 camPos;         // camera position in view coordinates\nuniform vec3 lightPos;       // light position in world coordinates\n\n// Model information\n// -----------------\nuniform mat4 mvMatrix;       // model-view matrix\nuniform mat4 mvNormalMatrix; // model-view normal matrix\nuniform mat4 mvpMatrix;      // model-view-perspective matrix\nuniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess\n\n// Vertex information\n// ------------------\nattribute vec4 vPos;         // vertex position in model coordinates\nattribute vec3 vNormal;      // vertex normal in model coordinates\nattribute vec4 vColor;       // vertex color\nattribute vec2 vTexture;     // vertex texture uv coordinates\n\n// Fragment information\n// ------------------\nvarying vec4 fPos;           // fragment position in view coordinates\nvarying vec4 fColor;         // fragment color\nvarying vec4 fNormal;        // fragment normal in view coordinates\nvarying vec2 fTexture;       // fragment texture cooordinates\n		\nvoid main() {\n fPos = mvMatrix * vPos;\n fNormal = mvNormalMatrix * vec4(vNormal, 1);\n fColor=vColor/255.0;\n gl_Position = mvpMatrix * vPos;\n fTexture=vTexture;\n}\n\n"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

/*
 * @(#)RubiksCube.js  1.0.2  2014-01-17
 *
 * Copyright (c) 2011-2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("RubiksCube", ["Cube"], 
function(Cube) { 

/**
 * Represents the state of a 3-times sliced cube (Rubik's Cube) by the location 
 * and orientation of its parts.
 * <p>
 * A Rubik's Cube has 8 corner parts, 12 edge parts, 6 face parts and one
 * center part. The parts divide each face of the cube into 3 x 3 layers.
 * <p>
 * <b>Corner parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the corner parts:
 * <pre>
 *             +---+---+---+
 *             |4.0|   |2.0|
 *             +---     ---+
 *             |     1     |
 *             +---     ---+
 *             |6.0|   |0.0|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
 * +---     ---+---     ---+---    +---+---     ---+
 * |     3     |     2     |     0     |     5     |
 * +---     ---+---     ---+---    +---+---     ---+
 * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |7.0|   |1.0|
 *             +---     ---+
 *             |     4     |
 *             +---     ---+
 *             |5.0|   |3.0|
 *             +---+---+---+
 * </pre>
 * <p>
 * <b>Edge parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the edge parts:
 * <pre>
 *             +---+---+---+
 *             |   |3.1|   |
 *             +--- --- ---+
 *             |6.0| 1 |0.0|
 *             +--- --- ---+
 *             |   |9.1|   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |   |6.1|   |   |9.0|   |   |0.1|   |   |3.0|   |
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |7.0| 3 10.0|10.1 2 |1.1|1.0| 0 |4.0|4.1| 5 |7.1|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |   |8.1|   |   |11.0   |   |2.1|   |   |5.0|   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |   |11.1   |
 *             +--- --- ---+
 *             |8.0| 4 |2.0|
 *             +--- --- ---+
 *             |   |5.1|   |
 *             +---+---+---+
 * </pre>
 * <p>
 * <b>Side parts</b>
 * <p>
 * The following diagram shows the initial orientation and location of 
 * the face parts:
 * <pre>
 *             +------------+
 *             |     .1     |
 *             |    ---     |
 *             | .0| 1 |.2  |
 *             |    ---     |
 *             |     .3     |
 * +-----------+------------+-----------+-----------+
 * |     .0    |     .2     |     .3    |    .1     |
 * |    ---    |    ---     |    ---    |    ---    |
 * | .3| 3 |.1 | .1| 2 |.3  | .2| 0 |.0 | .0| 5 |.2 |
 * |    ---    |    ---     |    ---    |    ---    |
 * |     .2    |    .0      |     .1    |     .3    |
 * +-----------+------------+-----------+-----------+
 *             |     .0     |
 *             |    ---     |
 *             | .3| 4 |.1  |
 *             |    ---     |
 *             |     .2     |
 *             +------------+
 * </pre>
 * <p>
 * For more information about the location and orientation of the parts see
 * {@link Cube}.
 * <p>
 * <b>Stickers</b>
 * <p>
 * The following diagram shows the arrangement of stickers on a Rubik's Cube:
 * The number before the comma is the first dimension (faces), the number
 * after the comma is the second dimension (stickers).
 * <pre>
 *             +---+---+---+
 *             |1,0|1,1|1,2|
 *             +--- --- ---+
 *             |1,3|1,4|1,5|
 *             +--- --- ---+
 *             |1,6|1,7|1,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,6|3,7|3,8|2,6|2,7|2,8|0,6|0,7|0,8|5,6|5,7|5,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |4,0|4,1|4,2|
 *             +--- --- ---+
 *             |4,3|4,4|4,5|
 *             +--- --- ---+
 *             |4,6|4,7|4,8|
 *             +---+---+---+
 * </pre>
 */
 

/** Creates a new instance. */
class RubiksCube extends Cube.Cube {
  constructor() {
    super(3);
    this.reset();
  }
}

/**
 * Set this variable to true to get debug output when the cube is transformed.
 */
RubiksCube.prototype.DEBUG = false;
/**
 * Holds the number of side parts, which is 6.
 */
RubiksCube.prototype.NUMBER_OF_SIDE_PARTS = 6;
/**
 * Holds the number of edge parts, which is 12.
 */
RubiksCube.prototype.NUMBER_OF_EDGE_PARTS = 12;
/**
 * This is used for mapping face part locations
 * to/from sticker positions on the cube.
 *
 * @see #toStickers
 */
RubiksCube.prototype.SIDE_TRANSLATION = [
        [0, 4],
        [1, 4],
        [2, 4],
        [3, 4],
        [4, 4],
        [5, 4]
    ];
/**
 * This is used for mapping edge part locations and orientations
 * to/from sticker positions on the cube.
 * <p>
 * Description:<br>
 * edge orientation 0: face index, sticker index.
 * edge orientation 1: face index, sticker index.
 *
 * @see #toStickers
 */
RubiksCube.prototype.EDGE_TRANSLATION = [
        [1, 5, 0, 1], // edge 0 ur
        [0, 3, 2, 5], //      1 rf
        [4, 5, 0, 7], //      2 dr
        [5, 1, 1, 1], //      3 bu
        [0, 5, 5, 3], //      4 rb
        [5, 7, 4, 7], //      5 bd
        [1, 3, 3, 1], //      6 ul
        [3, 3, 5, 5], //      7 lb
        [4, 3, 3, 7], //      8 dl
        [2, 1, 1, 7], //      9 fu
        [3, 5, 2, 3], //     10 lf
        [2, 7, 4, 1] //     11 fd
    ];
/**
 * This is used for mapping corner part locations and orientations
 * to/from sticker positions on the cube.
 * <p>
 * Description:<br>
 * corner orientation 0, face index, 
 * corner orientation 1, face index, 
 * corner orientation 2, face index
 *
 * @see #toStickers
 */
RubiksCube.prototype.CORNER_TRANSLATION = [
        [1, 8, 0, 0, 2, 2], // 0 urf 
        [4, 2, 2, 8, 0, 6], // 1 dfr
        [1, 2, 5, 0, 0, 2], // 2 ubr
        [4, 8, 0, 8, 5, 6], // 3 drb
        [1, 0, 3, 0, 5, 2], // 4 ulb
        [4, 6, 5, 8, 3, 6], // 5 dbl
        [1, 6, 2, 0, 3, 2], // 6 ufl
        [4, 0, 3, 8, 2, 6] // 7 dlf
    ];
/**
 * First dimension: edge part index.
 * Second dimension: orientation.
 * Third dimension: swipe direction
 * Fourth dimension: axis,layermask,angle
 * <pre>
 *             +---+---+---+
 *             |   |3.1|   |
 *             +--- --- ---+
 *             |6.0| 1 |0.0|
 *             +--- --- ---+
 *             |   |9.1|   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |   |6.1|   |   |9.0|   |   |0.1|   |   |3.0|   |
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |7.0| 3 10.0|10.1 2 |1.1|1.0| 0 |4.0|4.1| 5 |7.1|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |   |8.1|   |   |11.0   |   |2.1|   |   |5.0|   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |   |11.1   |
 *             +--- --- ---+
 *             |8.0| 4 |2.0|
 *             +--- --- ---+
 *             |   |5.1|   |
 *             +---+---+---+
 * </pre>
 */
RubiksCube.prototype.EDGE_SWIPE_TABLE = [
        [ // edge 0 ur
            [//u
                [2, 2, 1], // axis, layerMask, angle
                [0, 4, -1],
                [2, 2, -1],
                [0, 4, 1]
            ],
            [//r
                [2, 2, -1], // axis, layerMask, angle
                [1, 4, -1],
                [2, 2, 1],
                [1, 4, 1]
            ],],
        [ //      1 rf
            [//r
                [1, 2, 1], // axis, layerMask, angle
                [2, 4, -1],
                [1, 2, -1],
                [2, 4, 1]
            ],
            [//f
                [1, 2, -1], // axis, layerMask, angle
                [0, 4, -1],
                [1, 2, 1],
                [0, 4, 1]
            ],],
        [ //      2 dr
            [//d
                [2, 2, -1], // axis, layerMask, angle
                [0, 4, -1],
                [2, 2, 1],
                [0, 4, 1]
            ],
            [//r
                [2, 2, 1], // axis, layerMask, angle
                [1, 1, 1],
                [2, 2, -1],
                [1, 1, -1]
            ],],
        [ //      3 bu
            [//b
                [0, 2, -1], // axis, layerMask, angle
                [1, 4, -1],
                [0, 2, 1],
                [1, 4, 1]
            ],
            [//u
                [0, 2, 1], // axis, layerMask, angle
                [2, 1, 1],
                [0, 2, -1],
                [2, 1, -1]
            ],],
        [ //      4 rb
            [//r
                [1, 2, -1], // axis, layerMask, angle
                [2, 1, 1],
                [1, 2, 1],
                [2, 1, -1]
            ],
            [//b
                [1, 2, 1], // axis, layerMask, angle
                [0, 4, -1],
                [1, 2, -1],
                [0, 4, 1]
            ],],
        [ //      5 bd
            [//b
                [0, 2, 1], // axis, layerMask, angle
                [1, 1, 1],
                [0, 2, -1],
                [1, 1, -1]
            ],
            [//d
                [0, 2, -1], // axis, layerMask, angle
                [2, 1, 1],
                [0, 2, 1],
                [2, 1, -1]
            ],],
        [ //      6 ul
            [//u
                [2, 2, -1], // axis, layerMask, angle
                [0, 1, 1],
                [2, 2, 1],
                [0, 1, -1]
            ],
            [//l
                [2, 2, 1], // axis, layerMask, angle
                [1, 4, -1],
                [2, 2, -1],
                [1, 4, 1]
            ],],
        [ //      7 lb
            [//l
                [1, 2, 1], // axis, layerMask, angle
                [2, 1, 1],
                [1, 2, -1],
                [2, 1, -1]
            ],
            [//b
                [1, 2, -1], // axis, layerMask, angle
                [0, 1, 1],
                [1, 2, 1],
                [0, 1, -1]
            ],],
        [ //      8 dl
            [//d
                [2, 2, 1], // axis, layerMask, angle
                [0, 1, 1],
                [2, 2, -1],
                [0, 1, -1]
            ],
            [//l
                [2, 2, -1], // axis, layerMask, angle
                [1, 1, 1],
                [2, 2, 1],
                [1, 1, -1]
            ],],
        [ //      9 fu
            [//f
                [0, 2, 1], // axis, layerMask, angle
                [1, 4, -1],
                [0, 2, -1],
                [1, 4, 1]
            ],
            [//u
                [0, 2, -1], // axis, layerMask, angle
                [2, 4, -1],
                [0, 2, 1],
                [2, 4, 1]
            ],],
        [ //     10 lf
            [//l
                [1, 2, -1], // axis, layerMask, angle
                [2, 4, -1],
                [1, 2, 1],
                [2, 4, 1]
            ],
            [//f
                [1, 2, 1], // axis, layerMask, angle
                [0, 1, 1],
                [1, 2, -1],
                [0, 1, -1]
            ],],
        [ //     11 fd
            [//f
                [0, 2, -1], // axis, layerMask, angle
                [1, 1, 1],
                [0, 2, 1],
                [1, 1, -1]
            ],
            [//d
                [0, 2, 1], // axis, layerMask, angle
                [2, 4, -1],
                [0, 2, -1],
                [2, 4, 1]
            ],]
    ];
/** Side swipe table.
 * First dimension: side part index.
 * Second dimension: swipe direction
 * Third dimension: axis,layermask,angle
 *
 * <pre>
 *             +------------+
 *             |     .1     |
 *             |    ---     |
 *             | .0| 1 |.2  |
 *             |    ---     |
 *             |     .3     |
 * +-----------+------------+-----------+-----------+
 * |     .0    |     .2     |     .3    |    .1     |
 * |    ---    |    ---     |    ---    |    ---    |
 * | .3| 3 |.1 | .1| 2 |.3  | .2| 0 |.0 | .0| 5 |.2 |
 * |    ---    |    ---     |    ---    |    ---    |
 * |     .2    |    .0      |     .1    |     .3    |
 * +-----------+------------+-----------+-----------+
 *             |     .0     |
 *             |    ---     |
 *             | .3| 4 |.1  |
 *             |    ---     |
 *             |     .2     |
 *             +------------+
 * </pre>
 */
RubiksCube.prototype.SIDE_SWIPE_TABLE = [
        [// 0 r
            [1, 2, -1], // axis, layerMask, angle
            [2, 2, 1],
            [1, 2, 1],
            [2, 2, -1]
        ],
        [// 1 u
            [2, 2, -1],
            [0, 2, 1],
            [2, 2, 1],
            [0, 2, -1]
        ],
        [// 2 f
            [0, 2, -1],
            [1, 2, 1],
            [0, 2, 1],
            [1, 2, -1]
        ],
        [// 3 l
            [2, 2, 1],
            [1, 2, -1],
            [2, 2, -1],
            [1, 2, 1]
        ],
        [// 4 d
            [0, 2, 1],
            [2, 2, -1],
            [0, 2, -1],
            [2, 2, 1]
        ],
        [ // 5 b
            [1, 2, 1],
            [0, 2, -1],
            [1, 2, -1],
            [0, 2, 1]
        ]
    ];
 

/**
 * Returns the current layer mask on which the orientation of the part lies.
 * Returns 0 if no mask can be determined (the center part).
 */
RubiksCube.prototype.getPartLayerMask = function(part, orientation) {
  var face = this.getPartFace(part, orientation);
  if (part < this.cornerLoc.length) {
    // corner parts
    return (face < 3) ? 4 : 1;
  } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
    // edge parts
    return 2;
  } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
    // side parts
    return (face < 3) ? 4 : 1;
  } else {
    // center part
    return 0;
  }
}

RubiksCube.prototype.getPartSwipeAxis = function(part, orientation, swipeDirection) {
  if (part < this.cornerLoc.length) {
    // corner parts
    var loc = this.getCornerLocation(part);
    var ori = (3 - this.getPartOrientation(part) + orientation) % 3;
    return this.CORNER_SWIPE_TABLE[loc][ori][swipeDirection][0];
  } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
    // edge parts
    var edgeIndex = part - this.cornerLoc.length;
    var loc = this.getEdgeLocation(edgeIndex);
    var ori = (2 - this.getPartOrientation(part) + orientation) % 2;
    return this.EDGE_SWIPE_TABLE[loc][ori][swipeDirection][0];
  } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
    // side parts
    var loc = this.getSideLocation(part - this.cornerLoc.length - this.edgeLoc.length);
    var ori = (4 - this.getPartOrientation(part) + swipeDirection) % 4;
    return this.SIDE_SWIPE_TABLE[loc][ori][0];
  } else {
    // center part
    return -1;
  }
}

RubiksCube.prototype.getPartSwipeLayerMask= function(part, orientation, swipeDirection) {
  if (part < this.cornerLoc.length) {
    // corner parts
    var loc = this.getCornerLocation(part);
    var ori = (3 - this.getPartOrientation(part) + orientation) % 3;
    return this.CORNER_SWIPE_TABLE[loc][ori][swipeDirection][1];
  } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
    // edge parts
    var edgeIndex = part - this.cornerLoc.length;
    var loc = this.getEdgeLocation(edgeIndex);
    var ori = (2 - this.getPartOrientation(part) + orientation) % 2;
    return this.EDGE_SWIPE_TABLE[loc][ori][swipeDirection][1];
  } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
    // side parts
    var loc = this.getSideLocation(part - this.cornerLoc.length - this.edgeLoc.length);
    var ori = (4 - this.getPartOrientation(part) + swipeDirection) % 4;
    return this.SIDE_SWIPE_TABLE[loc][ori][1];
  } else {
    // center part
    return 0;
  }
}

RubiksCube.prototype.getPartSwipeAngle = function(part, orientation, swipeDirection) {
  if (part < this.cornerLoc.length) {
    // corner parts
    var loc = this.getCornerLocation(part);
    var ori = this.getPartOrientation(part);
    var sori = (3 - ori + orientation) % 3;
    var dir = swipeDirection;
    var angle = this.CORNER_SWIPE_TABLE[loc][sori][dir][2];
    if (ori == 2 && (sori == 0 || sori == 2)) {
        angle = -angle;
    } else if (ori == 1 && (sori == 1 || sori == 2)) {
        angle = -angle;
    }
    return angle;
  } else if (part < this.cornerLoc.length + this.edgeLoc.length) {
    // edge parts
    var edgeIndex = part - this.cornerLoc.length;
    var loc = this.getEdgeLocation(edgeIndex);
    var ori = this.getEdgeOrientation(edgeIndex);
    var sori = (2 - ori + orientation) % 2;
    var dir = swipeDirection;
    var angle = this.EDGE_SWIPE_TABLE[loc][sori][dir][2];
    return angle;
  } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {
    // side parts
    var loc = this.getSideLocation(part - this.cornerLoc.length - this.edgeLoc.length);
    var ori = (4 - this.getPartOrientation(part) + swipeDirection) % 4;
    return this.SIDE_SWIPE_TABLE[loc][ori][2];
  } else {
    // center part
    return 0;
  }
}

/**
 * Transforms the cube without firing an event.
 *
 * @param  axis  0=x, 1=y, 2=z axis.
 * @param  layerMask A bitmask specifying the layers to be transformed.
 *           The size of the layer mask depends on the value returned by
 *           <code>getLayerCount(axis)</code>. The layer mask has the
 *           following meaning:
 *           7=rotate the whole cube;<br>
 *           1=twist slice near the axis (left, down, back)<br>
 *           2=twist slice in the middle of the axis<br>
 *           4=twist slice far away from the axis (right, top, up)
 * @param  angle  positive values=clockwise rotation<br>
 *                negative values=counterclockwise rotation<br>
 *               1=90 degrees<br>
 *               2=180 degrees
 */
RubiksCube.prototype.transform0 = function(axis, layerMask, angle) {
  if (this.DEBUG) {
      window.console.log("RubiksCube#" + (this) + ".transform(ax=" + axis + ",msk=" + layerMask + ",ang:" + angle + ")");
  }
  {
    if (axis < 0 || axis > 2) {
        throw ("axis: " + axis);
    }

    if (layerMask < 0 || layerMask >= 1 << this.layerCount) {
        throw ("layerMask: " + layerMask);
    }

    if (angle < -2 || angle > 2) {
        throw ("angle: " + angle);
    }

    if (angle == 0) {
        return; // NOP
    }

    // Convert angle -2 to 2 to simplify the switch statements
    var an = (angle == -2) ? 2 : angle;

    if ((layerMask & 1) != 0) {
      // twist at left, bottom, back
      switch (axis) {
        case 0: // x
          switch (an) {
            case -1:
              this.twistL();
              break;
            case 1:
              this.twistL();
              this.twistL();
              this.twistL();
              break;
            case 2:
              this.twistL();
              this.twistL();
              break;
          }
          break;
        case 1: // y
          switch (an) {
            case -1:
              this.twistD();
              break;
            case 1:
              this.twistD();
              this.twistD();
              this.twistD();
              break;
            case 2:
              this.twistD();
              this.twistD();
              break;
          }
          break;
        case 2: // z
          switch (an) {
            case -1:
              this.twistB();
              break;
            case 1:
              this.twistB();
              this.twistB();
              this.twistB();
              break;
            case 2:
              this.twistB();
              this.twistB();
              break;
          }
      }
    }
    if ((layerMask & 2) != 0) {
      // twist at left middle, bottom middle, back middle
      switch (axis) {
        case 0: // x
          switch (an) {
            case 1:
              this.twistMR();
              break;
            case -1:
              this.twistMR();
              this.twistMR();
              this.twistMR();
              break;
            case 2:
              this.twistMR();
              this.twistMR();
              break;
          }
          break;
        case 1: // y
          switch (an) {
            case 1:
              this.twistMU();
              break;
            case -1:
              this.twistMU();
              this.twistMU();
              this.twistMU();
              break;
            case 2:
              this.twistMU();
              this.twistMU();
              break;
          }
          break;
        case 2: // z
          switch (an) {
            case 1:
              this.twistMF();
              break;
            case -1:
              this.twistMF();
              this.twistMF();
              this.twistMF();
              break;
            case 2:
              this.twistMF();
              this.twistMF();
              break;
          }
      }
    }

    if ((layerMask & 4) != 0) {
      // twist at right, top, front
      switch (axis) {
        case 0: // x
          switch (an) {
            case 1:
              this.twistR();
              break;
            case -1:
              this.twistR();
              this.twistR();
              this.twistR();
              break;
            case 2:
              this.twistR();
              this.twistR();
              break;
          }
          break;
        case 1: // y
          switch (an) {
            case 1:
              this.twistU();
              break;
            case -1:
              this.twistU();
              this.twistU();
              this.twistU();
              break;
            case 2:
              this.twistU();
              this.twistU();
              break;
          }
          break;
        case 2: // z
          switch (an) {
            case 1:
              this.twistF();
              break;
            case -1:
              this.twistF();
              this.twistF();
              this.twistF();
              break;
            case 2:
              this.twistF();
              this.twistF();
              break;
          }
      }
    }
  }
}

/**
 * R.
 * <pre>
 *                +----+----+----+
 *                |    |    | 2.0|
 *                +---- ---- ----+
 *                |    |    | 0.0|
 *                +---- ---- ----+
 *                |    |    | 0.0|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * |    |    |    |    |    | 0.2| 0.1| 0.1| 2.2| 2.1|    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    |    |    |    | 1.1| 1.0| 0.0| 4.0| 4.1|    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    |    |    |    | 1.1| 1.2| 2.1| 3.1| 3.2|    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                |    |    | 1.0|
 *                +---- ---- ----+
 *                |    |    | 2.0|
 *                +---- ---- ----+
 *                |    |    | 3.0|
 *                +----+----+----+
 * </pre>
 */
RubiksCube.prototype.twistR=function() {
  this.fourCycle(this.cornerLoc, 0, 1, 3, 2, this.cornerOrient, 1, 2, 1, 2, 3);
  this.fourCycle(this.edgeLoc, 0, 1, 2, 4, this.edgeOrient, 1, 1, 1, 1, 2);
  this.sideOrient[0] = (this.sideOrient[0] + 3) % 4;
}

/**
 * U.
 * <pre>
 *                +----+----+----+
 *                | 4.0| 3.1| 2.0|
 *                +---- ---- ----+
 *                | 6.0| 1.2| 0.0|
 *                +---- ---- ----+
 *                | 6.0| 9.1| 0.0|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * | 4.1| 6.1| 6.2| 6.1| 9.0| 0.2| 0.1| 0.1| 2.2| 2.1| 3.0| 4.2|
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    |    |    |    |    |    |    |    |    |    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    |    |    |    |    |    |    |    |    |    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 *                +----+----+----+
 * </pre>
 */
RubiksCube.prototype.twistU=function() {
  this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
  this.fourCycle(this.edgeLoc, 0, 3, 6, 9, this.edgeOrient, 1, 1, 1, 1, 2);
  this.sideOrient[1] = (this.sideOrient[1] + 3) % 4;
}

/**
 * F.
 * <pre>
 *                +----+----+----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                | 6.0| 9.1| 0.0|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * |    |    | 6.2| 6.1| 9.0| 0.2| 0.1|    |    |    |    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    |10.0|10.1| 2.3| 1.1| 1.0|    |    |    |    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    | 7.1| 7.2|11.0| 1.1| 1.2|    |    |    |    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                | 7.0|11.1| 1.0|
 *                +---- ---- ----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 *                +----+----+----+
 * </pre>
 */
RubiksCube.prototype.twistF=function() {
  this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
  this.fourCycle(this.edgeLoc, 9, 10, 11, 1, this.edgeOrient, 1, 1, 1, 1, 2);
  this.sideOrient[2] = (this.sideOrient[2] + 3) % 4;
}

/**
 * L.
 * <pre>
 *                +----+----+----+
 *                | 4.0|    |    |
 *                +---- ---- ----+
 *                | 6.0|    |    |
 *                +---- ---- ----+
 *                | 6.0|    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * | 4.1| 6.1| 6.2| 6.1|    |    |    |    |    |    |    | 4.2|
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * | 7.0| 3.1|10.0|10.1|    |    |    |    |    |    |    | 7.1|
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * | 5.2| 8.1| 7.1| 7.2|    |    |    |    |    |    |    | 5.1|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                | 7.0|    |    |
 *                +---- ---- ----+
 *                | 8.0|    |    |
 *                +---- ---- ----+
 *                | 5.0|    |    |
 *                +----+----+----+
 * </pre>
 */
RubiksCube.prototype.twistL=function() {
  this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
  this.fourCycle(this.edgeLoc, 6, 7, 8, 10, this.edgeOrient, 1, 1, 1, 1, 2);
  this.sideOrient[3] = (this.sideOrient[3] + 3) % 4;
}

/**
 * D.
 * <pre>
 *                +----+----+----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * |    |    |    |    |    |    |    |    |    |    |    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    |    |    |    |    |    |    |    |    |    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * | 5.2| 8.1| 7.1| 7.2|11.0| 1.1| 1.2| 2.1| 3.1| 3.2| 5.0| 5.1|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                | 7.0|11.1| 1.0|
 *                +---- ---- ----+
 *                | 8.0| 4.1| 2.0|
 *                +---- ---- ----+
 *                | 5.0| 5.1| 3.0|
 *                +----+----+----+
 * </pre>
 */
RubiksCube.prototype.twistD=function() {
  this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
  this.fourCycle(this.edgeLoc, 2, 11, 8, 5, this.edgeOrient, 1, 1, 1, 1, 2);
  this.sideOrient[4] = (this.sideOrient[4] + 3) % 4;
}

/**
 * B.
 * <pre>
 *                +----+----+----+
 *                | 4.0| 3.1| 2.0|
 *                +---- ---- ----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * | 4.1|    |    |    |    |    |    |    | 2.2| 2.1| 3.0| 4.2|
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * | 7.0|    |    |    |    |    |    |    | 4.0| 4.1| 5.2| 7.1|
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * | 5.2|    |    |    |    |    |    |    | 3.1| 3.2| 5.0| 5.1|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                | 5.0| 5.1| 3.0|
 *                +----+----+----+
 * </pre>
 */
RubiksCube.prototype.twistB=function() {
  this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
  this.fourCycle(this.edgeLoc, 3, 4, 5, 7, this.edgeOrient, 1, 1, 1, 1, 2);
  this.sideOrient[5] = (this.sideOrient[5] + 3) % 4;
}

/**
 * MR.
 * <pre>
 *                +----+----+----+
 *                |    | 3.1|    |
 *                +---- ---- ----+
 *                |    | 1.2|    |
 *                +---- ---- ----+
 *                |    | 9.1|    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * |    |    |    |    | 9.0|    |    |    |    |    | 3.0|    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    |    |    | 2.3|    |    |    |    |    | 5.2|    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    |    |    |11.0|    |    |    |    |    | 5.0|    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                |    |11.1|    |
 *                +---- ---- ----+
 *                |    | 4.1|    |
 *                +---- ---- ----+
 *                |    | 5.1|    |
 *                +----+----+----+
 * </pre>
 */
RubiksCube.prototype.twistMR=function() {
  this.fourCycle(this.edgeLoc, 3, 9, 11, 5, this.edgeOrient, 1, 1, 1, 1, 2);
  this.fourCycle(this.sideLoc, 2, 4, 5, 1, this.sideOrient, 2, 3, 2, 1, 4);
}

/**
 * MU.
 * <pre>
 *                +----+----+----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * |    |    |    |    |    |    |    |    |    |    |    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * | 7.0| 3.1|10.0|10.1| 2.3| 1.1| 1.0| 0.0| 5.0| 4.1| 5.2| 7.1|
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    |    |    |    |    |    |    |    |    |    |    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                |    |    |    |
 *                +----+----+----+
 * </pre>
 */
RubiksCube.prototype.twistMU=function() {
  this.fourCycle(this.edgeLoc, 1, 4, 7, 10, this.edgeOrient, 1, 1, 1, 1, 2);
  this.fourCycle(this.sideLoc, 3, 2, 0, 5, this.sideOrient, 2, 1, 2, 3, 4);
}

/**
 * MF.
 * <pre>
 *                +----+----+----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                | 6.0| 1.2| 0.0|
 *                +---- ---- ----+
 *                |    |    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * |    | 6.1|    |    |    |    |    | 0.1|    |    |    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    | 3.1|    |    |    |    |    | 0.0|    |    |    |    |
 * +---- ---- ----+---- ---- ----+---- ---- ----+---- ---- ----+
 * |    | 8.1|    |    |    |    |    | 2.1|    |    |    |    |
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *                |    |    |    |
 *                +---- ---- ----+
 *                | 8.0| 4.1| 2.0|
 *                +---- ---- ----+
 *                |    |    |    |
 *                +----+----+----+
 * </pre>
 */
RubiksCube.prototype.twistMF=function() {
  this.fourCycle(this.edgeLoc, 0, 6, 8, 2, this.edgeOrient, 1, 1, 1, 1, 2);
  this.fourCycle(this.sideLoc, 0, 1, 3, 4, this.sideOrient, 1, 2, 3, 2, 4);
}

/**
 * Returns an array of stickers which reflect the current state of the cube.
 * <p>
 * The following diagram shows the indices of the array. The number before
 * the comma is the first dimension (faces), the number after the comma
 * is the second dimension (stickers).
 * <p>
 * The values of the array elements is the face index: 0..5.
 * <pre>
 *             +---+---+---+
 *             |1,0|1,1|1,2|
 *             +--- --- ---+
 *             |1,3|1,4|1,5|
 *             +--- --- ---+
 *             |1,6|1,7|1,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,6|3,7|3,8|2,6|2,7|2,8|0,0|0,1|0,2|5,0|5,1|5,2|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |4,0|4,1|4,2|
 *             +--- --- ---+
 *             |4,3|4,4|4,5|
 *             +--- --- ---+
 *             |4,6|4,7|4,8|
 *             +---+---+---+
 * </pre>
 * @return A two dimensional array. First dimension: faces.
 * Second dimension: sticker index on the faces.
 */
RubiksCube.prototype.toStickers=function() {
  var stickers = new Array(6);
  for (var i=0;i<6;i++) {
    stickers[i]=new Array(9);
  }

  // Map face parts onto stickers.
  for (var i = 0; i < 6; i++) {
      var loc = this.sideLoc[i];
      stickers[this.SIDE_TRANSLATION[i][0]][this.SIDE_TRANSLATION[i][1]] = this.SIDE_TRANSLATION[loc][0];
  }

  // Map edge parts onto stickers
  for (var i = 0; i < 12; i++) {
      var loc = this.edgeLoc[i];
      var orient = this.edgeOrient[i];
      stickers[this.EDGE_TRANSLATION[i][0]][this.EDGE_TRANSLATION[i][1]] =
              (orient == 0) ? this.EDGE_TRANSLATION[loc][0] : this.EDGE_TRANSLATION[loc][2];
      stickers[this.EDGE_TRANSLATION[i][2]][this.EDGE_TRANSLATION[i][3]] =
              (orient == 0) ? this.EDGE_TRANSLATION[loc][2] : this.EDGE_TRANSLATION[loc][0];
  }

  // Map corner parts onto stickers
  for (var i = 0; i < 8; i++) {
      var loc = this.cornerLoc[i];
      var orient = this.cornerOrient[i];
      stickers[this.CORNER_TRANSLATION[i][0]][this.CORNER_TRANSLATION[i][1]] =
              (orient == 0)
              ? this.CORNER_TRANSLATION[loc][0]
              : ((orient == 1)
              ? this.CORNER_TRANSLATION[loc][2]
              : this.CORNER_TRANSLATION[loc][4]);
      stickers[this.CORNER_TRANSLATION[i][2]][this.CORNER_TRANSLATION[i][3]] =
              (orient == 0)
              ? this.CORNER_TRANSLATION[loc][2]
              : ((orient == 1)
              ? this.CORNER_TRANSLATION[loc][4]
              : this.CORNER_TRANSLATION[loc][0]);
      stickers[this.CORNER_TRANSLATION[i][4]][this.CORNER_TRANSLATION[i][5]] =
              (orient == 0)
              ? this.CORNER_TRANSLATION[loc][4]
              : ((orient == 1)
              ? this.CORNER_TRANSLATION[loc][0]
              : this.CORNER_TRANSLATION[loc][2]);
  }
  /*
  for (var i = 0; i < stickers.length; i++) {
  System.out.prvar("  " + i + ":");
  for (var j = 0; j < stickers[i].length; j++) {
  if (j != 0) {
  System.out.prvar(',');
  }
  System.out.prvar(stickers[i][j]);
  }
  window.console.log();
  }*/

  return stickers;
}

/**
 * Sets the cube to a state where the faces of the parts map to the provided
 * stickers array.
 *
 * @see #toStickers
 *
 * @param stickers An array of dimensions [6][9] containing sticker values
 *                 in the range [0,5] for the six faces right, up, front,
 *                 left, down, back.
 */
RubiksCube.prototype.setToStickers=function(stickers) {
  var i = 0, j = 0, cube;

  var tempSideLoc = new Array(6);
  var tempSideOrient = new Array(6);
  var tempEdgeLoc = new Array(12);
  var tempEdgeOrient = new Array(12);
  var tempCornerLoc = new Array(8);
  var tempCornerOrient = new Array(8);

  // Translate face cubes to match stickers.
  try {
    for (i = 0; i < 6; i++) {
      for (j = 0; j < 6; j++) {
        if (this.SIDE_TRANSLATION[j][0] == stickers[i][this.SIDE_TRANSLATION[j][1]]) {
          tempSideLoc[i] = this.SIDE_TRANSLATION[j][0];
          break;
        }
      }
      //this.sideOrient[i] = 0; // already done by reset
    }
  } catch (e) {
      throw ("Invalid side cube " + i);
  }

  for (i = 0; i < 5; i++) {
    for (j = i + 1; j < 6; j++) {
      if (tempSideLoc[i] == tempSideLoc[j]) {
        throw ("Duplicate side cubes " + i + "+" + j);
      }
    }
  }
  // Translate edge cubes to match stickers.
  for (i = 0; i < 12; i++) {
      var f0 = stickers[this.EDGE_TRANSLATION[i][0]][this.EDGE_TRANSLATION[i][1]];
      var f1 = stickers[this.EDGE_TRANSLATION[i][2]][this.EDGE_TRANSLATION[i][3]];
      for (cube = 0; cube < 12; cube++) {
        if (this.EDGE_TRANSLATION[cube][0] == f0
            && this.EDGE_TRANSLATION[cube][2] == f1) {
          tempEdgeOrient[i] = 0; //??
          break;

        } else if (this.EDGE_TRANSLATION[cube][0] == f1
                   && this.EDGE_TRANSLATION[cube][2] == f0) {
          tempEdgeOrient[i] = 1;
          break;
        }
      }
      if (cube == 12) {
          throw ("Invalid edge cube " + i);
      }

      tempEdgeLoc[i] = cube;
  }

  for (i = 0; i < 11; i++) {
    for (j = i + 1; j < 12; j++) {
      if (tempEdgeLoc[i] == tempEdgeLoc[j]) {
          throw "Duplicate edge cubes tempEdgeLoc[" + i + "]=" + tempEdgeLoc[i] + " tempEdgeLoc[" + j + "]=" + tempEdgeLoc[j];
      }
    }
  }

  // Translate corner cubes to match stickers.
  for (i = 0; i < 8; i++) {
    var f0 = stickers[this.CORNER_TRANSLATION[i][0]][this.CORNER_TRANSLATION[i][1]];
    var f1 = stickers[this.CORNER_TRANSLATION[i][2]][this.CORNER_TRANSLATION[i][3]];
    var f2 = stickers[this.CORNER_TRANSLATION[i][4]][this.CORNER_TRANSLATION[i][5]];
    for (cube = 0; cube < 8; cube++) {
      if (this.CORNER_TRANSLATION[cube][0] == f0
          && this.CORNER_TRANSLATION[cube][2] == f1
          && this.CORNER_TRANSLATION[cube][4] == f2) {
        tempCornerOrient[i] = 0;
        break;

      } else if (this.CORNER_TRANSLATION[cube][0] == f2
                 && this.CORNER_TRANSLATION[cube][2] == f0
                 && this.CORNER_TRANSLATION[cube][4] == f1) {
        tempCornerOrient[i] = 1;
        break;

      } else if (this.CORNER_TRANSLATION[cube][0] == f1
                 && this.CORNER_TRANSLATION[cube][2] == f2
                 && this.CORNER_TRANSLATION[cube][4] == f0) {
        tempCornerOrient[i] = 2;
        break;
      }
    }
    if (cube == 8) {
      throw "Invalid corner cube " + i;
    }
    tempCornerLoc[i] = cube;
  }

  for (i = 0; i < 7; i++) {
    for (j = i + 1; j < 8; j++) {
      if (tempCornerLoc[i] == tempCornerLoc[j]) {
        throw "Duplicate corner cubes tempCornerLoc[" + i + "]=" + tempCornerLoc[i] + " tempCornerLoc[" + j + "]=" + tempCornerLoc[j];
      }
    }
  }

  this.sideLoc = tempSideLoc;
  this.sideOrient = tempSideOrient;
  this.edgeLoc = tempEdgeLoc;
  this.edgeOrient = tempEdgeOrient;
  this.cornerLoc = tempCornerLoc;
  this.cornerOrient = tempCornerOrient;

  if (!isQuiet()) {
    fireCubeChanged(new CubeEvent(this, 0, 0, 0));
  }
}

RubiksCube.prototype.clone=function() {
  var that=new RubiksCube();
  that.setTo(this);
  return that;
}


// ------------------
// MODULE API    
// ------------------
return {
  RubiksCube : RubiksCube,
  newRubiksCube : function() { return new RubiksCube(); }
};
});
/*
 * @(#)RubiksCubeS1Cube3D.js  1.0  2015-01-09
 *
 * Copyright (c) 2015 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("RubiksCubeS1Cube3D", ["AbstractRubiksCubeCube3D","CubeAttributes","PreloadRubiksCubeS1"], 
function(AbstractRubiksCubeCube3D,CubeAttributes,PreloadRubiksCubeS1) { 

class RubiksCubeS1Cube3D extends AbstractRubiksCubeCube3D.AbstractRubiksCubeCube3D {
  /** Constructor
   * Creates the 3D geometry of a "Rubik's Cube".
   * You must call loadGeometry() after constructing a new instance. 
   */
  constructor() {
    super(1.8);
  }
  loadGeometry() {
    super.loadGeometry();
  }

  getModelUrl() {
    return this.baseUrl+'/'+this.relativeUrl;
  }
  createAttributes() {
    var a=CubeAttributes.newCubeAttributes(this.partCount, 6*9, [9,9,9,9,9,9]);
    var partsPhong=[0.5,0.6,0.4,16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (var i=0;i<this.partCount;i++) {
      a.partsFillColor[i]=[24,24,24,255];
      a.partsPhong[i]=partsPhong;
    }
    a.partsFillColor[this.centerOffset]=[240,240,240,255];
    
  var faceColors=[//Right, Up, Front, Left, Down, Back
      [255, 210, 0,155], // Yellow
      [0, 51, 115,255], // Blue
      [140, 0, 15,255], // Red
      [248, 248, 248,255], // White
      [0, 115, 47,255], // Green
      [255, 70, 0,255], // Orange
  ];
    
    var stickersPhong=[0.8,0.2,0.1,8.0];//shiny paper [ambient, diffuse, specular, shininess]
   
    for (var i=0;i<6;i++) {
      for (var j=0;j<9;j++) {
        a.stickersFillColor[i*9+j]=faceColors[i];
        a.stickersPhong[i*9+j]=stickersPhong;
      }
    }
    
    a.faceCount=6;
    a.stickerOffsets=[0,9,18,27,36,45];
    a.stickerCounts=[9,9,9,9,9,9];
    
    return a;
  }
}

RubiksCubeS1Cube3D.prototype.relativeUrl = 'models/rubikscubes1/';
RubiksCubeS1Cube3D.prototype.baseUrl = 'lib/';

// ------------------
// MODULE API    
// ------------------
return {
  Cube3D : RubiksCubeS1Cube3D,
  newCube3D : function () { const c = new RubiksCubeS1Cube3D(); c.loadGeometry(); return c; }
};
});
/*
 * @(#)RubiksCubeS4Cube3D.js  1.0  2015-01-09
 *
 * Copyright (c) 2015 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("RubiksCubeS4Cube3D", ["AbstractRubiksCubeCube3D","CubeAttributes","PreloadRubiksCubeS4"], 
function(AbstractRubiksCubeCube3D,CubeAttributes,PreloadRubiksCubeS4) { 

class RubiksCubeS4Cube3D extends AbstractRubiksCubeCube3D.AbstractRubiksCubeCube3D {
  /** Constructor
   * Creates the 3D geometry of a Rubik's Cube.
   * You must call loadGeometry() after instantation. 
   */
  constructor() {
    super(1.8);
  }
  loadGeometry() {
    super.loadGeometry();
    this.isDrawTwoPass=false;
  }

  getModelUrl() {
    return this.baseUrl+'/'+this.relativeUrl;
  }
  
  createAttributes() {
    var a=CubeAttributes.newCubeAttributes(this.partCount, 6*9, [9,9,9,9,9,9]);
    var partsPhong=[0.5,0.6,0.4,16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (var i=0;i<this.partCount;i++) {
      a.partsFillColor[i]=[24,24,24,255];
      a.partsPhong[i]=partsPhong;
    }
    a.partsFillColor[this.centerOffset]=[240,240,240,255];
    
    var faceColors=[//Right, Up, Front, Left, Down, Back
      [255, 210, 0,155], // Yellow
      [0, 51, 115,255], // Blue
      [140, 0, 15,255], // Red
      [248, 248, 248,255], // White
      [0, 115, 47,255], // Green
      [255, 70, 0,255], // Orange
    ];
    
    var stickersPhong=[0.8,0.2,0.1,8.0];//glossy paper [ambient, diffuse, specular, shininess]
   
    for (var i=0;i<6;i++) {
      for (var j=0;j<9;j++) {
        a.stickersFillColor[i*9+j]=faceColors[i];
        a.stickersPhong[i*9+j]=stickersPhong;
      }
    }
    
    a.faceCount=6;
    a.stickerOffsets=[0,9,18,27,36,45];
    a.stickerCounts=[9,9,9,9,9,9];
    
    return a;
  }
}

RubiksCubeS4Cube3D.prototype.relativeUrl = 'models/rubikscubes4/';
RubiksCubeS4Cube3D.prototype.baseUrl = 'lib/';

// ------------------
// MODULE API    
// ------------------
return {
  Cube3D : RubiksCubeS4Cube3D,
  newCube3D : function () { const c = new RubiksCubeS4Cube3D(); c.loadGeometry(); return c; }
};
});
/*
 * @(#)ScriptParser.js  0.1  2011-08-12
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("ScriptParser", [], 
function(h) {
 
/**
 * A customizable parser for cube scripts.
 */

/** Script nodes. */
const TwistNode = function(axis, layerMask, angle) {
  this.axis=axis;
  this.angle=angle;
  this.layerMask=layerMask;
}

/** Applies the node to the specified cube. */
TwistNode.prototype.applyTo = function(cube)  {
  if (! this.doesNothing()) {
   cube.transform(this.axis,this.layerMask,this.angle);
  }
}
/** Applies the inverse of the node to the specified cube. */
TwistNode.prototype.applyInverseTo = function(cube)  {
  if (! this.doesNothing()) {
   cube.transform(this.axis,this.layerMask,-this.angle);
  }
}
/** Returns true if this node does nothing. */
TwistNode.prototype.doesNothing = function() {
  return this.angle == 0 || this.layerMask == 0;
}
/** Tries to consume the given TwistNode. 
 * Returns true if successful.
 * This TwistNode may return true for doesNothing afterwards!);
 */
TwistNode.prototype.consume = function(that) {
  if (that.axis == this.axis
    && that.layerMask == this.layerMask) {
//var ts=this.toString();
    this.angle = (this.angle + that.angle) % 4;
    if (this.angle == 3) this.angle = -1;
    else if (this.angle == -3) this.angle = 1;
//console.log('consume:'+ts+' + '+that+" => "+this);    
    return true;
  }
  return false;
}
TwistNode.prototype.toString = function() {
  return 'TwistNode{ax:'+this.axis+' an:'+this.angle+' lm:'+this.layerMask+'}';
}

/**
 * Creates a new parser.
 */
const ScriptParser = function()  {
  this.layerCount=3;
}

/** Returns an array of script nodes. */
ScriptParser.prototype.createRandomScript = function(scrambleCount,scrambleMinCount)  {
  if (scrambleCount==null) scrambleCount=21;
  if (scrambleMinCount==null) scrambleMinCount=6;
  
  var scrambler=new Array(Math.floor(Math.random()*scrambleCount-scrambleMinCount)+scrambleMinCount);
  
  // Keep track of previous axis, to avoid two subsequent moves on
  // the same axis.
  var prevAxis = -1;
  var axis, layerMask, angle;
  for (var i = 0; i < scrambleCount; i++) {
    while ((axis = Math.floor(Math.random()*3)) == prevAxis) {}
    prevAxis = axis;
//    while ((layerMask = Math.floor(Math.random()*(1 << this.layerCount))) == 0) {}
    layerMask = 1<<Math.floor(Math.random()*this.layerCount);
    while ((angle = Math.floor(Math.random()*5) - 2) == 0) {}
    scrambler[i]=new TwistNode(axis, layerMask, angle);
  }
  
  return scrambler;
}

// ------------------
// MODULE API    
// ------------------
return {
	newTwistNode : function (axis, layerMask, angle) { return new TwistNode(axis, layerMask, angle); },
	newScriptParser : function () { return new ScriptParser(); }
};
});
/*
 * @(#)SplineInterpolator.js  1.0  2011-06-24
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("SplineInterpolator", [], 
function () {

 
/** Constructor.
 *
 * @param x1 The x coordinate for the first bezier control point.
 * @param y1 The y coordinate for the first bezier control point.
 * @param x2 The x coordinate for the second bezier control point.
 * @param y2 The x coordinate for the second bezier control point.
 */
class SplineInterpolator {
  constructor(x1,y1,x2,y2) {
    this.x1=x1;
    this.y1=y1;
    this.x2=x2;
    this.y2=y2;
  }
}

/**
 * Evaluates the bezier function, and clamps the result value between 0
 * and 1.
 *
 * @param t A time value between 0 and 1.
 */
SplineInterpolator.prototype.getFraction=function(t) {
    var invT = (1 - t);
    var b1 = 3 * t * (invT * invT);
    var b2 = 3 * (t * t) * invT;
    var b3 = t * t * t;
    var result = (b1 * this.y1) + (b2 * this.y2) + b3;
    return Math.min(1, Math.max(0, result));
}


// ------------------
// MODULE API    
// ------------------
return {
	newSplineInterpolator : function (x1,y1,x2,y2) { return new SplineInterpolator(x1,y1,x2,y2); }
};
});

/*
 * @(#)TwodPlayerApplet.js  1.0  2013-12-30
 *
 * Copyright (c) 2013 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Renders a Cube3D into an HTML 5 canvas 
    using its 2D context. 
*/
// --------------
// require.js
// --------------
define("TwodPlayerApplet", ["AbstractPlayerApplet","Node3D","J3DI"], 
function (AbstractPlayerApplet,Node3D,J3DI) {



// ===============================
//
// TwodPlayerApplet
//
// ===============================

/** Creates a TwodPlayerApplet. 
    Subclasses must call initTwoDCube3DCanvas(). */
class TwodPlayerApplet extends AbstractPlayerApplet.AbstractPlayerApplet {
  constructor() {
    this.initTwoDCube3DCanvas();
  }
}


/** Initializes the TwodPlayerApplet object. */
TwodPlayerApplet.prototype.initTwoDCube3DCanvas = function() {
  this.initCube3DCanvas();
  this.g=null; //2d context
  this.useFullModel=false; //to prevent performance problems
  
}

/** Opens the canvas for rendering. Protected method. */
TwodPlayerApplet.prototype.openCanvas = function() {
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
TwodPlayerApplet.prototype.closeCanvas = function() {
	// empty
}
/**
 * This function is called before we draw.
 * It adjusts the perspective matrix to the dimensions of the canvas.
 */
TwodPlayerApplet.prototype.reshape = function() {
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

/** Draws the scene. * /
TwodPlayerApplet.prototype.drawOFF = function() {
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

TwodPlayerApplet.prototype.clearCanvas = function() {
  var g=this.g;
  g.clearRect(0, 0, this.canvas.width, this.canvas.height);
}
TwodPlayerApplet.prototype.flushCanvas = function() {
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
TwodPlayerApplet.prototype.drawSinglePassOFF = function() {
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
TwodPlayerApplet.prototype.drawTwoPassOFF = function() {
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
TwodPlayerApplet.prototype.drawObject = function(obj, mvMatrix, color, phong, forceColorUpdate) {
  this.drawObjectCanvas2D(obj,mvMatrix,color,phong,forceColorUpdate);
}



// ------------------
// MODULE API    
// ------------------
return {
  TwodPlayerApplet : TwodPlayerApplet
};
});

/*
 * @(#)VirtualCubeMain.js  2.0  2014-01-05
 *
 * Copyright (c) 2011-2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

/** Integrates a virtual cube into a HTML page.
 */

// --------------
// require.js
// --------------
define("VirtualCubeMain", ["WebglPlayerApplet", "TwodPlayerApplet"],
function (WebglPlayerApplet, TwodPlayerApplet) {

  let module = {
    log: (false) // Enable or disable logging for this module.
    ? function (msg) {
      console.log('VirtualCubeMain.js ' + msg);
    }
    : function () {}
  }

  var nextId = 0;


  /** 
   * Attaches a VirtualCube object to the specified <div> or <canvas> element.
   *
   * If a <div>-Element is specified, then the following child elements
   * are added to it:
   *
   * <canvas class="cube-canvas"/>
   * <div class="button-toolbar">
   *    <div class="reset-button" />
   *    <div class="undo-button" />
   *    <div class="redo-button" />
   *    <div class="scramble-button" />
   * </div>
   *
   * @param parameters applet parameters (key,names)
   * @param divOrCanvas 
   *               Optional <div> or <canvas> object.
   *               If divOrCanvas is null, a rubik's cube is attached to all
   *               <div> and <canvas>  elements in the document with 
   *               class "virtualcube".
   *               If a <canvas>-Element is specified, then a VirtualCube
   *               object is added to it as the property virtualcube.
   */
  function attachVirtualCube(parameters, divOrCanvas) {
    if (parameters == null) {
      parameters = [];
    }

    // if we have been called before the document was loaded, we install a
    // listener and retry.
    if (document.body == null) {
      var f = function () {
        try {
          window.removeEventListener('load', f, false);
        } catch (err) {
          // => IE does not support event listeners 
          window.detachEvent('onload', f, false);
        }
        attachVirtualCube(parameters, divOrCanvas);
      }
      try {
        window.addEventListener('load', f, false);
      } catch (err) {
        // => IE does not support event listeners 
        window.attachEvent('onload', f, false);
      }
      return;
    }


    if (divOrCanvas == null) {
      // => no element was provided, attach to all elements with class "virtualcube"
      try {
        var htmlCollection = document.getElementsByClassName("virtualcube");
        if (htmlCollection.length == 0) {
          console.log('Error: virtualcube.js no canvas or div element with class name "virtualcube" found.');
          return;
        }
      } catch (err) {
        // => IE does not support getElementsByClassName
        return;
      }
      for (let i = 0; i < htmlCollection.length; i++) {
        var elem = htmlCollection[i];
        attachVirtualCube(parameters, elem);
      }
    } else {
      // => an element was provided, attach VirtualCube to it
      var canvasElem = null;
      if (divOrCanvas.tagName == "CANVAS") {
        // => A <canvas> element was provided, attach to it
        canvasElem = divOrCanvas;
      } else if (divOrCanvas.tagName == "DIV") {
        // => A <div> element was provided, remove content, then insert a canvas element and buttons
        while (divOrCanvas.lastChild) {
          divOrCanvas.removeChild(divOrCanvas.lastChild);
        }

        var id = "virtualcube_" + nextId++;
        canvasElem = document.createElement("canvas");
        canvasElem.setAttribute("class", "cube-canvas");
        canvasElem.setAttribute("id", id);

        // copy attributes from divOrCanvas over to the canvasElem
        for (let i = 0; i < divOrCanvas.attributes.length; i++) {
          let attr = divOrCanvas.attributes[i];
          if (attr.name != "id" && attr.name != "class") {
            module.log('.attachVirtualCube copying attribute attr.name:' + attr.name + ' attr.value:' + attr.value);
            canvasElem.setAttribute(attr.name, attr.value);
          }
        }
        if (!divOrCanvas.hasAttribute("width")) {
          canvasElem.setAttribute("width", "220");
        }
        if (!divOrCanvas.hasAttribute("height")) {
          canvasElem.setAttribute("height", "220");
        }
        if (!divOrCanvas.hasAttribute("kind")) {
          canvasElem.setAttribute("kind", divOrCanvas.getAttribute("kind"));
        }
        if (!divOrCanvas.hasAttribute("debug")) {
          canvasElem.setAttribute("debug", "");
        }
        //
        divOrCanvas.appendChild(canvasElem);

        var toolbarElem = document.createElement("div");
        toolbarElem.setAttribute("class", "button-toolbar");
        divOrCanvas.appendChild(toolbarElem);
        var buttonElem;
        buttonElem = document.createElement("button");
        buttonElem.setAttribute("type", "button");
        buttonElem.setAttribute("class", "reset-button");
        buttonElem.setAttribute("onclick", "document.getElementById('" + id + "').virtualcube.reset();");
        buttonElem.appendChild(document.createTextNode("Reset"));
        toolbarElem.appendChild(buttonElem);
        buttonElem = document.createElement("button");
        buttonElem.setAttribute("type", "button");
        buttonElem.setAttribute("class", "undo-button");
        buttonElem.setAttribute("onclick", "document.getElementById('" + id + "').virtualcube.undo();");
        buttonElem.appendChild(document.createTextNode("Undo"));
        toolbarElem.appendChild(buttonElem);
        buttonElem = document.createElement("button");
        buttonElem.setAttribute("type", "button");
        buttonElem.setAttribute("class", "redo-button");
        buttonElem.setAttribute("onclick", "document.getElementById('" + id + "').virtualcube.redo();");
        buttonElem.appendChild(document.createTextNode("Redo"));
        toolbarElem.appendChild(buttonElem);
        buttonElem = document.createElement("button");
        buttonElem.setAttribute("type", "button");
        buttonElem.setAttribute("class", "scramble-button");
        buttonElem.setAttribute("onclick", "document.getElementById('" + id + "').virtualcube.scramble();");
        buttonElem.appendChild(document.createTextNode("Scramble"));
        toolbarElem.appendChild(buttonElem);
        /*
         buttonElem = document.createElement("button");
         buttonElem.setAttribute("type","button");
         buttonElem.setAttribute("onclick","document.getElementById('"+id+"').virtualcube.wobble();");  
         buttonElem.appendChild(document.createTextNode("Wobble"));
         toolbarElem.appendChild(buttonElem);
         buttonElem = document.createElement("button");
         buttonElem.setAttribute("type","button");
         buttonElem.setAttribute("onclick","document.getElementById('"+id+"').virtualcube.explode();");  
         buttonElem.appendChild(document.createTextNode("Explode"));
         toolbarElem.appendChild(buttonElem);
         */
      } else {
        console.log('Error: virtualcube.js element ' + divOrCanvas + ' is not a canvas or a div. tagName=' + divOrCanvas.tagName);
        return;
      }
      var vr = new VirtualCube(canvasElem);
      vr.parameters = [];
      for (let key in parameters) {
        vr.parameters[key] = parameters[key];
      }
      for (let i = 0; i < divOrCanvas.attributes.length; i++) {
        let attr = divOrCanvas.attributes[i];
        if (attr.name != "id" && attr.name != "class") {
          module.log('.attachVirtualCube copying parameter attr.name:' + attr.name + ' attr.value:' + attr.value);
          vr.parameters[attr.name] = attr.value;
        }
      }
      vr.init();
      canvasElem.virtualcube = vr;
    }
  }

  /** Constructor.
   * 
   * Creates a virtual rubik's cube and attaches it to the specified canvas
   * object. 
   * init() must be called after construction.
   */
  class VirtualCube {
    constructor(canvas) {
      this.canvas = canvas;
      this.parameters = {baseurl: 'lib'};
    }
  }
  /** Initializes the virtual cube. */
  VirtualCube.prototype.init = function () {
    this.canvas3d = new WebglPlayerApplet.WebglPlayerApplet();
    //this.canvas3d = TwoDPlayerApplet.newTwoDCube3DCanvas();
    for (var k in this.parameters) {
      this.canvas3d.parameters[k] = this.parameters[k]
    }
    var s = this.canvas3d.setCanvas(this.canvas);
    if (!s) {
      module.log("Could not instantiate WebGL Context, falling back to 2D Context");
      for (var k in this.parameters) {
        this.canvas3d.parameters[k] = this.parameters[k]
      }
      this.canvas3d = new TwodPlayerApplet.TwodPlayerApplet();
      s = this.canvas3d.setCanvas(this.canvas);
    }
  }
  VirtualCube.prototype.reset = function () {
    this.canvas3d.reset();
  }
  VirtualCube.prototype.scramble = function (scrambleCount, animate) {
    this.canvas3d.scramble(scrambleCount, animate);
  }
  VirtualCube.prototype.undo = function () {
    this.canvas3d.undo();
  }
  VirtualCube.prototype.redo = function () {
    this.canvas3d.redo();
  }
  VirtualCube.prototype.play = function () {
    this.canvas3d.play();
  }
  VirtualCube.prototype.solveStep = function () {
    this.canvas3d.solveStep();
  }
  VirtualCube.prototype.wobble = function () {
    this.canvas3d.wobble();
  }
  VirtualCube.prototype.explode = function () {
    this.canvas3d.explode();
  }
  VirtualCube.prototype.setAutorotate = function (newValue) {
    this.canvas3d.setAutorotate(newValue);
  }


// ------------------
// MODULE API    
// ------------------
  return {
    attachVirtualCube: attachVirtualCube
  };
});
/*
 * @(#)WebglPlayerApplet.js  2.0  2014-01-05
 *
 * Copyright (c) 2013-2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
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
  log: (false) // Enable or disable logging for this module.
    ? function(msg) { console.log('WebglPlayerApplet.js '+msg); }
    : function() {}
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
		[this.parameters.baseurl+"/shaders/texture.vshader"], // id of the vertex shader
	  [this.parameters.baseurl+"/shaders/texture.fshader"], // id of the fragment shader
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

/*
 * @(#)virtualcube.js  1.0.2  2014-01-20
 *
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";


/* 
 This is the main script for the VirtualCube JavaScript applet.
 
 The applet inserts itself into all div elements of the HTML page
 with class "virtualcube".
 
 Here is a minimal HTML code that is required to include the applet
 into a HTML page:
 
 <!DOCTYPE html>
 <html>
 <head>
 <meta charset="utf-8">
 <script data-main="lib/main.js" src="lib/require.js"></script>
 <link href="style/stylesheet.css" rel="stylesheet" type="text/css">
 </head>
 <body>
 <div class="virtualcube" cube="..." stickersImage="..."></div>
 </body>
 </html>
 
 The div element can have the following attributes: 
 cube            Specifies the cube model to be displayed.
 Supported values:
 "Rubik's Cube"
 "Pocket Cube"
 
 stickersimage   Specifies the URL of the stickers image.
 See supplied example image.
 
 
 The applet replaces the content of the div element with the following structure.
 
 <div class="virtualcube" cube="..." stickersimage="...">
 <canvas class="virtualcubecanvas"/>
 <div class="virtualcubetoolbar">
 <button type="button" class="virtualcubereset">Reset</button>
 <button type="button" class="virtualcubeplay" >Play</button>
 <button type="button" class="virtualcubeundo" >Undo</button>
 </div>
 </div>
 
 If the applet fails to run, it leaves the div elements untouched.
 You can put a placeholder into the div element.
 
 
 */


// try to determine base url
let baseUrl = 'lib';
{
  let scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    var script = scripts[i];
    if (script.src != null) {
      let p = script.src.indexOf('virtualcube.js');
      if (p != -1) {
        baseUrl = script.src.substring(0, p - 1);
        break;
      }
    }
  }
}


requirejs.config({
  //By default load any module IDs from lib
  baseUrl: baseUrl,
  //except, if the module ID starts with "app2521",
  //load it from the js/app directory. paths
  //config is relative to the baseUrl, and
  //never includes a ".js" extension since
  //the paths config could be for a directory.
  ///aths: {
  //    app2521: '../app'
  //}
});

// Start the main app logic.
requirejs(['VirtualCubeMain'],
function (VirtualCubeMain) {
  //virtualube is loaded and can be used here now.
  let parameters = {};
  parameters.baseurl = baseUrl; // note: key must be lowercase!
  VirtualCubeMain.attachVirtualCube(parameters);
});
}
