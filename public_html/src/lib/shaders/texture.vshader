/*
 * @(#)texture.vshader  1.1  2012-07-15
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Immensee, Switzerland.
 * All rights reserved.
 *
 * You may not use, copy or modify this file, except in compliance with the
 * license agreement you entered into with Werner Randelshofer.
 * For details see accompanying license terms.
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

