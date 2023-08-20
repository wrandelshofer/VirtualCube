/*
 * @(#)phong.frag
 * Copyright (c) 2023 Werner Randelshofer, Switzerland.
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
 
 
