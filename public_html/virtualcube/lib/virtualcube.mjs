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
  <script type="module" src="lib/virtualcube.mjs"/>
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
    <canvas class="cube-canvas"></canvas>
    <div class="controls">
      <div class="toolbar">
        <button class="reset-button"><span>Reset</span></button>
        <button class="play-button"><span>Undo</span></button>
        <button class="step-backward-button"><span>Previous</span></button>
        <button class="step-forward-button"><span>Next</span></button>
        <button class="undo-button"><span>Undo</span></button>
        <button class="redo-button"><span>Redo</span></button>
        <button class="scramble-button"><span>Scramble</span></button>
      </div>
      <div class="script">...<span class="currentMove">...</span> <span class="nextMove">...</span>...</div>
    </div>
  </div>

  If the applet fails to run, it leaves the div elements untouched.
  You can put a placeholder into the div element.

  Legacy Java Applet support:
  --------------------------------
  To ease the transition from Java Applets to JavaScript, this
  applet also replaces applet tags with code="PocketPlayer.class",
  "PocketPlayerFlat.class", "RubikPlayer.class", or "RubikPlayerFlat.class".


*/

import VirtualCubeMain from './VirtualCubeMain.mjs';

// Performance: Import transitively required modules to reduce loading time.
//              With HTML/1.0 and HTML/1.1 only up to 6 TCP connections may be open at the same time.
import WebglPlayerApplet from "./WebglPlayerApplet.mjs";
import TwoDPlayerApplet from "./TwoDPlayerApplet.mjs";
import CubeMarkup from "./CubeMarkup.mjs";
import AbstractPlayerApplet from "./AbstractPlayerApplet.mjs";
import Node3D from "./Node3D.mjs";
import J3DI from "./J3DI.mjs";

import J3DIMath from "./J3DIMath.mjs";
import CubeAttributes from "./CubeAttributes.mjs";
import ScriptNotation from "./ScriptNotation.mjs";
import PreloadWebglShaders from "./PreloadWebglShaders.mjs";
import ScriptParser from "./ScriptParser.mjs";
import Tokenizer from "./Tokenizer.mjs";

import Cube3D from "./Cube3D.mjs";
import Cube from "./Cube.mjs";
import SplineInterpolator from "./SplineInterpolator.mjs";

// import 3d models of the cubes
import Cube2Cube3D from "./Cube2Cube3D.mjs";
import Cube3Cube3D from "./Cube3Cube3D.mjs";
import Cube4Cube3D from "./Cube4Cube3D.mjs";
import Cube5Cube3D from "./Cube5Cube3D.mjs";
import Cube6Cube3D from "./Cube6Cube3D.mjs";
import Cube7Cube3D from "./Cube7Cube3D.mjs";

// import cached .obj files for 3d models
import AbstractCanvas from "./AbstractCanvas.mjs";
import ScriptAST from "./ScriptAST.mjs";

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
};
VirtualCubeMain.attachVirtualCube(parameters);

