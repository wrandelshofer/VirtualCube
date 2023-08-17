/* @(#)PreloadWebglShaders.mjs  1.0  2014-01-17
 * Copyright (c) 2014 Werner Randelshofer, Switzerland. MIT License.
 */

/** Preloads the shaders used by WebglPlayerApplet.
 */

import J3DI from './J3DI.mjs';

J3DI.setFileData("/shaders/texture.frag",
`
/*
* @(#)texture.frag
* Copyright (c) 2014 Werner Randelshofer, Switzerland.
* You may only use this software in accordance with the license terms.
*/

// WebGL Fragment Shader
#ifdef GL_ES
  precision mediump float;
#endif

// World information
// -----------------
uniform vec3 camPos;         // camera position in world coordinates
uniform vec3 lightPos;       // light position in world coordinates

// Model information
// -----------------
uniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess
uniform sampler2D mTexture;  // texture
uniform bool mHasTexture;


// Fragment information
// --------------------
varying vec4 fColor;
varying vec4 fNormal;
varying vec4 fPos;
varying vec2 fTexture;       // fragment texture cooordinates


void main() {
vec3 wi = normalize(lightPos - fPos.xyz); // direction to light source
vec3 wo = normalize(camPos - fPos.xyz); // direction to observer
vec3 n = normalize(fNormal.xyz);
float specular=pow( max(0.0,-dot(reflect(wi, n), wo)), mPhong.w)*mPhong.z;
float diffuse=max(0.0,dot(wi,n))*mPhong.y;
float ambient=mPhong.x;

vec4 color=(mHasTexture)?texture2D(mTexture, fTexture):fColor;

gl_FragColor=vec4(color.rgb*(diffuse+ambient)+specular*vec3(1,1,1), color.a);
//gl_FragColor=vec4(n.x,n.y,n.z, color.a);
}
`
);

J3DI.setFileData("/shaders/texture.vert",
`
/*
* @(#)texture.vert
* Copyright (c) 2014 Werner Randelshofer, Switzerland.
* You may only use this software in accordance with the license terms.
*/

// WebGL Vertex Shader
#ifdef GL_ES
   precision mediump float;
#endif

// World information
// -----------------
uniform vec3 camPos;         // camera position in view coordinates
uniform vec3 lightPos;       // light position in world coordinates

// Model information
// -----------------
uniform mat4 mvMatrix;       // model-view matrix
uniform mat4 mvNormalMatrix; // model-view normal matrix
uniform mat4 mvpMatrix;      // model-view-perspective matrix
uniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess

// Vertex information
// ------------------
attribute vec4 vPos;         // vertex position in model coordinates
attribute vec3 vNormal;      // vertex normal in model coordinates
attribute vec4 vColor;       // vertex color
attribute vec2 vTexture;     // vertex texture uv coordinates

// Fragment information
// ------------------
varying vec4 fPos;           // fragment position in view coordinates
varying vec4 fColor;         // fragment color
varying vec4 fNormal;        // fragment normal in view coordinates
varying vec2 fTexture;       // fragment texture cooordinates

void main() {
fPos = mvMatrix * vPos;
fNormal = mvNormalMatrix * vec4(vNormal, 1);
fColor=vColor/255.0;
gl_Position = mvpMatrix * vPos;
fTexture=vTexture;
}
`
  );

J3DI.setFileData("/shaders/phong.frag",
`
/*
* @(#)phong.frag
* Copyright (c) 2014 Werner Randelshofer, Switzerland.
* You may only use this software in accordance with the license terms.
*/

// WebGL Fragment Shader
#ifdef GL_ES
   precision mediump float;
#endif

// World information
// -----------------
uniform vec3 camPos;         // camera position in world coordinates
uniform vec3 lightPos;       // light position in world coordinates

// Model information
// -----------------
uniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess


// Fragment information
// --------------------
varying vec4 fColor;
varying vec4 fNormal;
varying vec4 fPos;


void main() {
 vec3 wi = normalize(lightPos - fPos.xyz); // direction to light source
 vec3 wo = normalize(camPos - fPos.xyz); // direction to observer
 vec3 n = normalize(fNormal.xyz);
 float specular=pow( max(0.0,-dot(reflect(wi, n), wo)), mPhong.w)*mPhong.z;
 float diffuse=max(0.0,dot(wi,n))*mPhong.y;
 float ambient=mPhong.x;

 gl_FragColor=vec4(fColor.rgb*(diffuse+ambient)+specular*vec3(1,1,1), fColor.a);
 //gl_FragColor=vec4(n.x,n.y,n.z, fColor.a);
}
`
  );

J3DI.setFileData("/shaders/phong.vert",
`
/*
 * @(#)phong.vert
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */

// WebGL Vertex Shader
#ifdef GL_ES
 precision mediump float;
#endif

// World information
// -----------------
uniform vec3 camPos;         // camera position in view coordinates
uniform vec3 lightPos;       // light position in world coordinates

// Model information
// -----------------
uniform mat4 mvMatrix;       // model-view matrix
uniform mat4 mvNormalMatrix; // model-view normal matrix
uniform mat4 mvpMatrix;      // model-view-perspective matrix
uniform vec4 mPhong;         // vertex ambient, diffuse, specular, shininess

// Vertex information
// ------------------
attribute vec4 vPos;         // vertex position in model coordinates
attribute vec3 vNormal;      // vertex normal in model coordinates
attribute vec4 vColor;       // vertex color

// Fragment information
// ------------------
varying vec4 fPos;           // fragment position in view coordinates
varying vec4 fColor;         // fragment color
varying vec4 fNormal;        // fragment normal in view coordinates

void main() {
fPos = mvMatrix * vPos;
fNormal = mvNormalMatrix * vec4(vNormal, 1);
fColor=vColor/255.0;
gl_Position = mvpMatrix * vPos;
}
`
  );

// ------------------
// MODULE API
// ------------------
export default {};