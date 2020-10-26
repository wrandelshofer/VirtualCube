/*
 * @(#)color.frag
 * Copyright (c) 2014 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */

// WebGL Fragment Shader

#ifdef GL_ES
    precision mediump float;
#endif

// Fragment information
// --------------------
varying vec4 fColor;


void main() {
  gl_FragColor = fColor;
}
 
 
