/*
 * @(#)color.frag
 *
 * Copyright (c) 2014 Werner Randelshofer, Immensee, Switzerland.
 * All rights reserved.
 *
 * You may not use, copy or modify this file, except in compliance with the
 * license agreement you entered into with Werner Randelshofer.
 * For details see accompanying license terms.
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
 
 
