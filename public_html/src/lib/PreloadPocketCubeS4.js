/*
 * @(#)PreloadPocketCubeS4.js  1.0  2015-03-30
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

/** Preloads the .obj files.
*/
// --------------
// require.js
// --------------
define("PreloadPocketCubeS4", ["J3DI"], 
function (J3DI) {

J3DI.setFileData("${corner.url}",
"${corner.obj}"
);
J3DI.setFileData("${corner_r.url}",
"${corner_r.obj}"
);
J3DI.setFileData("${corner_u.url}",
"${corner_u.obj}"
);
J3DI.setFileData("${corner_f.url}",
"${corner_f.obj}"
);

J3DI.setFileData("${center.url}",
"${center.obj}"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

