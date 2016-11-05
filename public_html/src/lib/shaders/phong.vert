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

