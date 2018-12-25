/* @(#)PreloadRubiksCubeS1.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

/** Preloads the .obj files.
*/
import J3DI from './J3DI.mjs';

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
export default { };


