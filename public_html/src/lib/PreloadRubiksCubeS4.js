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

J3DI.setFileData("${edge.url}",
"${edge.obj}"
);
J3DI.setFileData("${edge_r.url}",
"${edge_r.obj}"
);
J3DI.setFileData("${edge_u.url}",
"${edge_u.obj}"
);

J3DI.setFileData("${side.url}",
"${side.obj}"
);
J3DI.setFileData("${side_r.url}",
"${side_r.obj}"
);

J3DI.setFileData("${center.url}",
"${center.obj}"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

