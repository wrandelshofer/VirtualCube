/*
 * @(#)virtualcube.js  1.0.2  2014-01-20
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
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