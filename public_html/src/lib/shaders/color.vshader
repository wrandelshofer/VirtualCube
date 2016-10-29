/*
 * @(#)color.vshader  1.0  2014-02-08
 *
 * Copyright (c) 2014 Werner Randelshofer, Immensee, Switzerland.
 * All rights reserved.
 *
 * You may not use, copy or modify this file, except in compliance with the
 * license agreement you entered into with Werner Randelshofer.
 * For details see accompanying license terms.
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

