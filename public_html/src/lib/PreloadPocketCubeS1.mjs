/* @(#)PreloadPocketCubeS1.mjs  1.0  2014-03-30
 * Copyright (c) 2014 Werner Randelshofer, Switzerland. MIT License.
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

J3DI.setFileData("${center.url}",
"${center.obj}"
);

// ------------------
// MODULE API    
// ------------------
export default { };

