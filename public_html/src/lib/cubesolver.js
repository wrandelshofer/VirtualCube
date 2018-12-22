/*
 * @(#)cubesolver.js  1.0  2014-02-08
 * Copyright (c) 2014 Werner Randelshofer, Switzerland. MIT License.
 */
"use strict";

/* 
  This is the main script for the CubeSolver JavaScript applet.

  The applet inserts itself into all div elements of the HTML page
  with class "cubesolver".
  
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
  <div class="cubesolver" cube="..." stickersImage="..."></div>
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
 
  <div class="cubesolver" cube="..." stickersimage="...">
    <canvas class="cubesolvercanvas"/>
    <div class="cubesolvertoolbar">
        <button type="button" class="cubesolverreset">Reset</button>
        <button type="button" class="cubesolversolve">Solve</button>
        <button type="button" class="cubesolverundo" >Undo</button>
    </div>
  </div>
  
  If the applet fails to run, it leaves the div elements untouched.
  You can put a placeholder into the div element.
  
  
*/

 

requirejs.config({
    //By default load any module IDs from lib
    baseUrl: 'lib',
    //except, if the module ID starts with "app2521",
    //load it from the js/app directory. paths
    //config is relative to the baseUrl, and
    //never includes a ".js" extension since
    //the paths config could be for a directory.
    paths: {
        app2521: '../app'
    }
});

// Start the main app logic.
requirejs(['CubeSolverMain'],
function (CubeSolverMain) {
    //cubesolver is loaded and can be used here now.
    CubeSolverMain.attachCubeSolver();
});