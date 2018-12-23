/*
 * @(#)PreloadWebglShaders.js  1.0  2014-01-17
 * Copyright (c) 2014 Werner Randelshofer, Switzerland. MIT License.
 */
"use strict";

/** Preloads the shaders used by WebglPlayerApplet. 
*/
// --------------
// require.js
// --------------
define("PreloadWebglShaders", ["J3DI"], 
function (J3DI) {

J3DI.setFileData("${texture.frag.url}",
"${texture.frag.obj}"
);

J3DI.setFileData("${texture.vert.url}",
"${texture.vert.obj}"
);

J3DI.setFileData("${phong.frag.url}",
"${phong.frag.obj}"
);

J3DI.setFileData("${phong.vert.url}",
"${phong.vert.obj}"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

