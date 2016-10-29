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

J3DI.setFileData("${fshader.url}",
"${fshader.obj}"
);

J3DI.setFileData("${vshader.url}",
"${vshader.obj}"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

