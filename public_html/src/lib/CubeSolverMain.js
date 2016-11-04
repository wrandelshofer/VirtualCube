/*
 * @(#)CubeSolverMain.js  1.0  2014-02-08
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
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
