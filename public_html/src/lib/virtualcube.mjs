/* @(#)virtualcube.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

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
  <script type="module" src="lib/virtualcube.mjs"></script>
  </head>
  <body>
  <div class="virtualcube" kind="..." stickersImage="..."></div>
  </body>
  </html>

  The div element can have the following attributes: 
    kind            Specifies the cube model to be displayed.
                    Supported values:
                      "RubiksCube"
                      "PocketCube"
   
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

import VirtualCubeMain from './VirtualCubeMain.mjs';

// try to determine base url
let baseUrl='lib';
{
  let scripts = document.getElementsByTagName('script');
  for (let i=0; i<scripts.length; i++) {
    var script = scripts[i];
    if (script.src != null) {
      let p = script.src.indexOf('virtualcube.mjs');
      if (p != -1) {
        baseUrl = script.src.substring(0, p-1);
        break;
      }
    }
  }
}



let parameters = {
    baseurl: baseUrl,
    rendercontext: "2d" // supported values: "2d", "webgl".
};
VirtualCubeMain.attachVirtualCube(parameters);

