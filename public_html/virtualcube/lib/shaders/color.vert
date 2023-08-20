/*
 * @(#)color.vert
 * Copyright (c) 2023 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */

// WebGL Vertex Shader

// Model information
// -----------------
uniform mat4 mvpMatrix;      // model-view-perspective matrix

// Vertex information
// ------------------
attribute vec4 vPos;         // vertex position in model coordinates
attribute vec4 vColor;       // vertex color

// Fragment information
// ------------------
varying vec4 fColor;         // fragment color

void main() {
 fColor=vColor/255.0;
 gl_Position = mvpMatrix * vPos;
}

