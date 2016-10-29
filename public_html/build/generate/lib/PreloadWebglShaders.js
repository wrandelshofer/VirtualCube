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

J3DI.setFileData("lib/shaders/texture.fshader",
"/*\n * @(#)texture.fshader  1.1  2012-07-15\n *\n * Copyright (c) 2011-2012 Werner Randelshofer, Immensee, Switzerland.\n * All rights reserved.\n *\n * You may not use, copy or modify this file, except in compliance with the\n * license agreement you entered into with Werner Randelshofer.\n * For details see accompanying license terms.\n */\n\n// WebGL Fragment Shader\n#ifdef GL_ES\n    precision mediump float;\n#endif\n\n// World information\n// -----------------\nuniform vec3 camPos;         // camera position in world coordinates\nuniform vec3 lightPos;       // light position in world coordinates\n\n// Model information\n// -----------------\nuniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess\nuniform sampler2D mTexture;  // texture\nuniform bool mHasTexture; \n\n\n// Fragment information\n// --------------------\nvarying vec4 fColor;\nvarying vec4 fNormal;\nvarying vec4 fPos;\nvarying vec2 fTexture;       // fragment texture cooordinates\n\n\nvoid main() {\n  vec3 wi = normalize(lightPos - fPos.xyz); // direction to light source\n  vec3 wo = normalize(camPos - fPos.xyz); // direction to observer\n  vec3 n = normalize(fNormal.xyz);\n  float specular=pow( max(0.0,-dot(reflect(wi, n), wo)), mPhong.w)*mPhong.z;\n  float diffuse=max(0.0,dot(wi,n))*mPhong.y;\n  float ambient=mPhong.x;\n  \n  vec4 color=(mHasTexture)?texture2D(mTexture, fTexture):fColor;\n  \n  gl_FragColor=vec4(color.rgb*(diffuse+ambient)+specular*vec3(1,1,1), color.a);\n  //gl_FragColor=vec4(n.x,n.y,n.z, color.a);\n}\n \n \n"
);

J3DI.setFileData("lib/shaders/texture.vshader",
"/*\n * @(#)texture.vshader  1.1  2012-07-15\n *\n * Copyright (c) 2011-2012 Werner Randelshofer, Immensee, Switzerland.\n * All rights reserved.\n *\n * You may not use, copy or modify this file, except in compliance with the\n * license agreement you entered into with Werner Randelshofer.\n * For details see accompanying license terms.\n */\n \n// WebGL Vertex Shader\n#ifdef GL_ES\n    precision mediump float;\n#endif\n\n// World information\n// -----------------\nuniform vec3 camPos;         // camera position in view coordinates\nuniform vec3 lightPos;       // light position in world coordinates\n\n// Model information\n// -----------------\nuniform mat4 mvMatrix;       // model-view matrix\nuniform mat4 mvNormalMatrix; // model-view normal matrix\nuniform mat4 mvpMatrix;      // model-view-perspective matrix\nuniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess\n\n// Vertex information\n// ------------------\nattribute vec4 vPos;         // vertex position in model coordinates\nattribute vec3 vNormal;      // vertex normal in model coordinates\nattribute vec4 vColor;       // vertex color\nattribute vec2 vTexture;     // vertex texture uv coordinates\n\n// Fragment information\n// ------------------\nvarying vec4 fPos;           // fragment position in view coordinates\nvarying vec4 fColor;         // fragment color\nvarying vec4 fNormal;        // fragment normal in view coordinates\nvarying vec2 fTexture;       // fragment texture cooordinates\n		\nvoid main() {\n fPos = mvMatrix * vPos;\n fNormal = mvNormalMatrix * vec4(vNormal, 1);\n fColor=vColor/255.0;\n gl_Position = mvpMatrix * vPos;\n fTexture=vTexture;\n}\n\n"
);

// ------------------
// MODULE API    
// ------------------
return { };
});

