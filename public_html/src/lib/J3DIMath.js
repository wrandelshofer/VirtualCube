/*
 * @(#)J3DIMath.js  1.1  2012-06-17
 */
/*
 * Copyright (C) 2009 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * This software is provided by Apple Inc. ``as is'' and any
 * express or implied warranties, including, but not limited to, the
 * implied warranties of merchantability and fitness for a particular
 * purpose are disclaimed.  in no event shall apple inc. or
 * contributors be liable for any direct, indirect, incidental, special,
 * exemplary, or consequential damages (including, but not limited to,
 * procurement of substitute goods or services; loss of use, data, or
 * profits; or business interruption) however caused and on any theory
 * of liability, whether in contract, strict liability, or tort
 * (including negligence or otherwise) arising in any way out of the use
 * of this software, even if advised of the possibility of such damage.
 *
 * Enhancements:
 * 1.2   2014-02-02 Werner Randelshofer. Integrates now with Require.js. Adds intersection tests.
 * 1.1   2012-06-17 Werner Randelshofer. Adds world function.
 * 1.0.3 2012-06-15 Werner Randelshofer. Fixes lookAt function.
 * 1.0.2 2012-06-09 Werner Randelshofer. Fixes lookAt function.
 * 1.0.1 2011-06-22 Werner Randelshofer. Adds arithmetic functions.
 */
"use strict";
// BEGIN Misc functions
function formatNumber(number,digits)
{
  if (digits === undefined) {
    digits = 2;
  }
  let a = number.toString().split('e');
  let str = +(+a[0]).toFixed(digits);
  if (a.length > 1) {
    str += 'e'+a[1];
  }
  return str;
}
// END Misc functions

// J3DI (Jedi) - A support library for WebGL.

/*
    J3DI Math Classes. Currently includes:

        J3DIMatrix4 - A 4x4 Matrix
*/

/*
    J3DIMatrix4 class

    This class implements a 4x4 matrix. It has functions which duplicate the
    functionality of the OpenGL matrix stack and glut functions. On browsers
    that support it, CSSMatrix is used to accelerate operations.

    IDL:

    [
        Constructor(in J3DIMatrix4 matrix),                 // copy passed matrix into new J3DIMatrix4
        Constructor(in sequence<float> array)               // create new J3DIMatrix4 with 16 floats (row major)
        Constructor()                                       // create new J3DIMatrix4 with identity matrix
    ]
    interface J3DIMatrix4 {
        void load(in J3DIMatrix4 matrix);                   // copy the values from the passed matrix
        void load(in sequence<float> array);                // copy 16 floats into the matrix
        sequence<float> getAsArray();                       // return the matrix as an array of 16 floats
        Float32Array getAsFloat32Array();             // return the matrix as a Float32Array with 16 values
        void setUniform(in WebGLRenderingContext ctx,       // Send the matrix to the passed uniform location in the passed context
                        in WebGLUniformLocation loc,
                        in boolean transpose);
        void makeIdentity();                                // replace the matrix with identity
        void transpose();                                   // replace the matrix with its transpose. Return this.
        void invert();                                      // replace the matrix with its inverse

        void translate(in float x, in float y, in float z); // multiply the matrix by passed translation values on the right
        void translate(in J3DVector3 v);                    // multiply the matrix by passed translation values on the right
        void scale(in float x, in float y, in float z);     // multiply the matrix by passed scale values on the right
        void scale(in J3DVector3 v);                        // multiply the matrix by passed scale values on the right
        void rotate(in float angle,                         // multiply the matrix by passed rotation values on the right
                    in float x, in float y, in float z);    // (angle is in degrees). return this.
        void rotate(in float angle, in J3DVector3 v);       // multiply the matrix by passed rotation values on the right
                                                            // (angle is in degrees). return this.
        void multiply(in J3DIMatrix4 matrix);               // multiply the matrix by the passed matrix on the right. return this.
        void premultiply(in J3DIMatrix4 matrix);               // multiply the matrix by the passed matrix on the left. return this.
        void multiply(float factor);                        // multiply the matrix by the passed factor
        void divide(in float divisor);                      // divide the matrix by the passed divisor
        void ortho(in float left, in float right,           // multiply the matrix by the passed ortho values on the right
                   in float bottom, in float top,
                   in float near, in float far);
        void frustum(in float left, in float right,         // multiply the matrix by the passed frustum values on the right
                     in float bottom, in float top,
                     in float near, in float far);
        void perspective(in float fovy, in float aspect,    // multiply the matrix by the passed perspective values on the right
                         in float zNear, in float zFar);
        void lookat(in J3DVector3 eye,                      // multiply the matrix by the passed lookat
                    in J3DVector3 center,                   // values on the right
                    in J3DVector3 up);   
        bool decompose(in J3DVector3 translate,            // decompose the matrix into the passed vector
                        in J3DVector3 rotate,
                        in J3DVector3 scale,
                        in J3DVector3 skew,
                        in sequence<float> perspective);
        J3DIVector3 loghat();                              // Computes the inverse of the exponential map operation
        float trace();                                     // Returns the trace of the matrix (sum of the diagonal elements)
    }

    [
        Constructor(in J3DVector3 vector),                  // copy passed vector into new J3DVector3
        Constructor(in sequence<float> array)               // create new J3DVector3 with 3 floats from array
        Constructor(in float x, in float y, in float z)     // create new J3DVector3 with 3 floats
        Constructor()                                       // create new J3DVector3 with (0,0,0)
    ]
    interface J3DIVector3 {
        void load(in J3DVector3 vector);                    // copy the values from the passed vector
        void load(in sequence<float> array);                // copy 3 floats into the vector from array
        void load(in float x, in float y, in float z);      // copy 3 floats into the vector
        sequence<float> getAsArray();                       // return the vector as an array of 3 floats
        Float32Array getAsFloat32Array();                   // return the matrix as a Float32Array with 16 values
        void multVecMatrix(in J3DIMatrix4 matrix);          // multiply the vector by the passed matrix (on the right)
        void multNormalMatrix(in J3DIMatrix4 matrix);       // multiply the vector by the passed matrix (on the right)
                                                            // treating the vector as a surface normal.
                                                            
        float vectorLength();                               // return the length of the vector
        float dot();                                        // return the dot product of the vector
        void cross(in J3DVector3 v);                        // replace the vector with vector x v
        void divide(in float/J3DVector divisor);            // divide the vector by the passed divisor
        J3DVector3 subtract(in J3DVector3 v);               // subtract another vector from this. return this.
        J3DVector3 multiply(in J3DVector3 v);               // multiply another vector with this. return this.
        J3DVector3 normalize();                             // normalizes the vector by dividing all values by its norm. return this.
        J3DVector3 reflect(in J3DVector3 v);                // reflect this vector at v. return this.
        float norm();                                       // returns the norm of the vector. (same as vectorLength)
        J3DIMatrix4 exphat();                               // Computes the exponential map operation
        J3DIMatrix4 hat();                                  // Computes the hat operation
    }
		
    [
        Constructor(in J3DVector3 vector),                  // copy passed vector into new J3DVertexArray
        Constructor(in sequence<float> array)               // create new J3DVertexArray with floats from array
        Constructor()                                       // create new J3DVertexArray with empty array []
    ]
    interface J3DIVertexArray {
        void load(in array vector);                         // copy the values from the passed array
        void multVecMatrix(in J3DIMatrix4 matrix);             // multiply the vertex array by the passed matrix (on the right)
        J3DVector3 rawNormal(in int i1, in int i2, in int i3);          // compute unnormalized surface normal from the given 3 vertex indices.
        J3DVector3 rawZ(in int i1, in int i2, in int i3);          // compute z-value of unnormalized surface normal from the given 3 vertex indices.
        J3DVector3 normal(in int i1, in int i2, in int i3); // compute surface normal from the given 3 vertex indices.
    }
    
    // Interpolation function
    static {
        elerp(in J3DIMatrix4 R1,           // Performs an exponential map interpolation from R1 to R2 by lambda in [0,1]
                       in J3DIMatrix4 R2, 
                       in float lambda)
                                                             
        rigidLerp(in J3DIMatrix4 T1,       // Performs an interpolation from rigid matrix T1 to T2 by lambda in [0,1]
                       in J3DIMatrix4 T2, 
                       in float lambda)
                       
        clamp(in value, in min, in max)    // clamps a value to min, max.
    }
    
    
*/

let J3DIHasCSSMatrix = false;
let J3DIHasCSSMatrixCopy = false;

if ("WebKitCSSMatrix" in window && ("media" in window && window.media.matchMedium("(-webkit-transform-3d)")) ||
                                   ("styleMedia" in window && window.styleMedia.matchMedium("(-webkit-transform-3d)"))) {
    J3DIHasCSSMatrix = true;
    if ("copy" in WebKitCSSMatrix.prototype)
        J3DIHasCSSMatrixCopy = true;
}

 // console.log("J3DIHasCSSMatrix="+J3DIHasCSSMatrix);
 // console.log("J3DIHasCSSMatrixCopy="+J3DIHasCSSMatrixCopy);

//
// J3DIMatrix4
//
class J3DIMatrix4 {
  constructor(m) {
    if (J3DIHasCSSMatrix)
        this.$matrix = new WebKitCSSMatrix;
    else
        this.$matrix = new Object;

    if (typeof m == 'object') {
        if ("length" in m && m.length >= 16) {
            this.load(m);
            return;
        }
        else if (m instanceof J3DIMatrix4) {
            this.load(m);
            return;
        }
    }
    this.makeIdentity();
  }
}

J3DIMatrix4.prototype.load = function()
{
    if (arguments.length == 1 && typeof arguments[0] == 'object') {
        let matrix;

        if (arguments[0] instanceof J3DIMatrix4) {
            matrix = arguments[0].$matrix;

            this.$matrix.m11 = matrix.m11;
            this.$matrix.m12 = matrix.m12;
            this.$matrix.m13 = matrix.m13;
            this.$matrix.m14 = matrix.m14;

            this.$matrix.m21 = matrix.m21;
            this.$matrix.m22 = matrix.m22;
            this.$matrix.m23 = matrix.m23;
            this.$matrix.m24 = matrix.m24;

            this.$matrix.m31 = matrix.m31;
            this.$matrix.m32 = matrix.m32;
            this.$matrix.m33 = matrix.m33;
            this.$matrix.m34 = matrix.m34;

            this.$matrix.m41 = matrix.m41;
            this.$matrix.m42 = matrix.m42;
            this.$matrix.m43 = matrix.m43;
            this.$matrix.m44 = matrix.m44;
            return;
        }
        else
            matrix = arguments[0];

        if ("length" in matrix && matrix.length >= 16) {
            this.$matrix.m11 = matrix[0];
            this.$matrix.m12 = matrix[1];
            this.$matrix.m13 = matrix[2];
            this.$matrix.m14 = matrix[3];

            this.$matrix.m21 = matrix[4];
            this.$matrix.m22 = matrix[5];
            this.$matrix.m23 = matrix[6];
            this.$matrix.m24 = matrix[7];

            this.$matrix.m31 = matrix[8];
            this.$matrix.m32 = matrix[9];
            this.$matrix.m33 = matrix[10];
            this.$matrix.m34 = matrix[11];

            this.$matrix.m41 = matrix[12];
            this.$matrix.m42 = matrix[13];
            this.$matrix.m43 = matrix[14];
            this.$matrix.m44 = matrix[15];
            return;
        }
    }

    this.makeIdentity();
    return this;
}

J3DIMatrix4.prototype.getAsArray = function()
{
    return [
        this.$matrix.m11, this.$matrix.m12, this.$matrix.m13, this.$matrix.m14,
        this.$matrix.m21, this.$matrix.m22, this.$matrix.m23, this.$matrix.m24,
        this.$matrix.m31, this.$matrix.m32, this.$matrix.m33, this.$matrix.m34,
        this.$matrix.m41, this.$matrix.m42, this.$matrix.m43, this.$matrix.m44
    ];
}
J3DIMatrix4.prototype.toString = function()
{
    let m=this.$matrix;
    return "["+m.m11+" "+m.m12+" "+m.m13+" "+m.m14+";"
              +m.m21+" "+m.m22+" "+m.m23+" "+m.m24+";"
              +m.m31+" "+m.m32+" "+m.m33+" "+m.m34+";"
              +m.m41+" "+m.m42+" "+m.m43+" "+m.m44+";"
            +"]";
}

J3DIMatrix4.prototype.getAsFloat32Array = function()
{
    if (J3DIHasCSSMatrixCopy) {
        let array = new Float32Array(16);
        this.$matrix.copy(array);
        return array;
    }
    return new Float32Array(this.getAsArray());
}

J3DIMatrix4.prototype.setUniform = function(ctx, loc, transpose)
{
    if (J3DIMatrix4.setUniformArray == undefined) {
        J3DIMatrix4.setUniformWebGLArray = new Float32Array(16);
        J3DIMatrix4.setUniformArray = new Array(16);
    }

    if (J3DIHasCSSMatrixCopy)
        this.$matrix.copy(J3DIMatrix4.setUniformWebGLArray);
    else {
        J3DIMatrix4.setUniformArray[0] = this.$matrix.m11;
        J3DIMatrix4.setUniformArray[1] = this.$matrix.m12;
        J3DIMatrix4.setUniformArray[2] = this.$matrix.m13;
        J3DIMatrix4.setUniformArray[3] = this.$matrix.m14;
        J3DIMatrix4.setUniformArray[4] = this.$matrix.m21;
        J3DIMatrix4.setUniformArray[5] = this.$matrix.m22;
        J3DIMatrix4.setUniformArray[6] = this.$matrix.m23;
        J3DIMatrix4.setUniformArray[7] = this.$matrix.m24;
        J3DIMatrix4.setUniformArray[8] = this.$matrix.m31;
        J3DIMatrix4.setUniformArray[9] = this.$matrix.m32;
        J3DIMatrix4.setUniformArray[10] = this.$matrix.m33;
        J3DIMatrix4.setUniformArray[11] = this.$matrix.m34;
        J3DIMatrix4.setUniformArray[12] = this.$matrix.m41;
        J3DIMatrix4.setUniformArray[13] = this.$matrix.m42;
        J3DIMatrix4.setUniformArray[14] = this.$matrix.m43;
        J3DIMatrix4.setUniformArray[15] = this.$matrix.m44;

        J3DIMatrix4.setUniformWebGLArray.set(J3DIMatrix4.setUniformArray);
    }

    ctx.uniformMatrix4fv(loc, transpose, J3DIMatrix4.setUniformWebGLArray);
}

J3DIMatrix4.prototype.makeIdentity = function()
{
    this.$matrix.m11 = 1;
    this.$matrix.m12 = 0;
    this.$matrix.m13 = 0;
    this.$matrix.m14 = 0;

    this.$matrix.m21 = 0;
    this.$matrix.m22 = 1;
    this.$matrix.m23 = 0;
    this.$matrix.m24 = 0;

    this.$matrix.m31 = 0;
    this.$matrix.m32 = 0;
    this.$matrix.m33 = 1;
    this.$matrix.m34 = 0;

    this.$matrix.m41 = 0;
    this.$matrix.m42 = 0;
    this.$matrix.m43 = 0;
    this.$matrix.m44 = 1;
}

J3DIMatrix4.prototype.transpose = function()
{
    let tmp = this.$matrix.m12;
    this.$matrix.m12 = this.$matrix.m21;
    this.$matrix.m21 = tmp;

    tmp = this.$matrix.m13;
    this.$matrix.m13 = this.$matrix.m31;
    this.$matrix.m31 = tmp;

    tmp = this.$matrix.m14;
    this.$matrix.m14 = this.$matrix.m41;
    this.$matrix.m41 = tmp;

    tmp = this.$matrix.m23;
    this.$matrix.m23 = this.$matrix.m32;
    this.$matrix.m32 = tmp;

    tmp = this.$matrix.m24;
    this.$matrix.m24 = this.$matrix.m42;
    this.$matrix.m42 = tmp;

    tmp = this.$matrix.m34;
    this.$matrix.m34 = this.$matrix.m43;
    this.$matrix.m43 = tmp;
    
    return this;
}

J3DIMatrix4.prototype.invert = function()
{
    if (J3DIHasCSSMatrix) {
        this.$matrix = this.$matrix.inverse();
        return;
    }

    // Calculate the 4x4 determinant
    // If the determinant is zero,
    // then the inverse matrix is not unique.
    let det = this._determinant4x4();

    if (Math.abs(det) < 1e-8)
        return null;

    this._makeAdjoint();

    // Scale the adjoint matrix to get the inverse
    this.$matrix.m11 /= det;
    this.$matrix.m12 /= det;
    this.$matrix.m13 /= det;
    this.$matrix.m14 /= det;

    this.$matrix.m21 /= det;
    this.$matrix.m22 /= det;
    this.$matrix.m23 /= det;
    this.$matrix.m24 /= det;

    this.$matrix.m31 /= det;
    this.$matrix.m32 /= det;
    this.$matrix.m33 /= det;
    this.$matrix.m34 /= det;

    this.$matrix.m41 /= det;
    this.$matrix.m42 /= det;
    this.$matrix.m43 /= det;
    this.$matrix.m44 /= det;
}

J3DIMatrix4.prototype.translate = function(x,y,z)
{
    if (typeof x == 'object' && ("length" in x || "vectorLength" in x)) {
        let t = x;
        x = t[0];
        y = t[1];
        z = t[2];
    }
    else {
        if (x == undefined)
            x = 0;
        if (y == undefined)
            y = 0;
        if (z == undefined)
            z = 0;
    }

    if (J3DIHasCSSMatrix) {
        this.$matrix = this.$matrix.translate(x, y, z);
        return;
    }

    let matrix = new J3DIMatrix4();
    matrix.$matrix.m41 = x;
    matrix.$matrix.m42 = y;
    matrix.$matrix.m43 = z;

    this.multiply(matrix);
		return this;
}

J3DIMatrix4.prototype.scale = function(x,y,z)
{
    if (typeof x == 'object' && "length" in x) {
        let t = x;
        x = t[0];
        y = t[1];
        z = t[2];
    }
    else {
        if (x == undefined)
            x = 1;
        if (z == undefined) {
            if (y == undefined) {
                y = x;
                z = x;
            }
            else
                z = 1;
        }
        else if (y == undefined)
            y = x;
    }

    if (J3DIHasCSSMatrix) {
        this.$matrix = this.$matrix.scale(x, y, z);
        return this;
    }

    let matrix = new J3DIMatrix4();
    matrix.$matrix.m11 = x;
    matrix.$matrix.m22 = y;
    matrix.$matrix.m33 = z;

    this.multiply(matrix);
    return this;
}

J3DIMatrix4.prototype.rotate = function(angle,x,y,z)
{
    // Forms are (angle, x,y,z), (angle,vector), (angleX, angleY, angleZ), (angle)
    if (typeof x == 'object' && "length" in x) {
        let t = x;
        x = t[0];
        y = t[1];
        z = t[2];
    }
    else {
        if (arguments.length == 1) {
            x = 0;
            y = 0;
            z = 1;
        }
        else if (arguments.length == 3) {
            this.rotate(angle, 1,0,0); // about X axis
            this.rotate(x, 0,1,0); // about Y axis
            this.rotate(y, 0,0,1); // about Z axis
            return;
        }
    }

    if (J3DIHasCSSMatrix) {
        this.$matrix = this.$matrix.rotateAxisAngle(x, y, z, angle);
        return this;
    }

    // angles are in degrees. Switch to radians
    angle = angle / 180 * Math.PI;

    angle /= 2;
    let sinA = Math.sin(angle);
    let cosA = Math.cos(angle);
    let sinA2 = sinA * sinA;

    // normalize
    let len = Math.sqrt(x * x + y * y + z * z);
    if (len == 0) {
        // bad vector, just use something reasonable
        x = 0;
        y = 0;
        z = 1;
    } else if (len != 1) {
        x /= len;
        y /= len;
        z /= len;
    }

    let mat = new J3DIMatrix4();

    // optimize case where axis is along major axis
    if (x == 1 && y == 0 && z == 0) {
        mat.$matrix.m11 = 1;
        mat.$matrix.m12 = 0;
        mat.$matrix.m13 = 0;
        mat.$matrix.m21 = 0;
        mat.$matrix.m22 = 1 - 2 * sinA2;
        mat.$matrix.m23 = 2 * sinA * cosA;
        mat.$matrix.m31 = 0;
        mat.$matrix.m32 = -2 * sinA * cosA;
        mat.$matrix.m33 = 1 - 2 * sinA2;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    } else if (x == 0 && y == 1 && z == 0) {
        mat.$matrix.m11 = 1 - 2 * sinA2;
        mat.$matrix.m12 = 0;
        mat.$matrix.m13 = -2 * sinA * cosA;
        mat.$matrix.m21 = 0;
        mat.$matrix.m22 = 1;
        mat.$matrix.m23 = 0;
        mat.$matrix.m31 = 2 * sinA * cosA;
        mat.$matrix.m32 = 0;
        mat.$matrix.m33 = 1 - 2 * sinA2;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    } else if (x == 0 && y == 0 && z == 1) {
        mat.$matrix.m11 = 1 - 2 * sinA2;
        mat.$matrix.m12 = 2 * sinA * cosA;
        mat.$matrix.m13 = 0;
        mat.$matrix.m21 = -2 * sinA * cosA;
        mat.$matrix.m22 = 1 - 2 * sinA2;
        mat.$matrix.m23 = 0;
        mat.$matrix.m31 = 0;
        mat.$matrix.m32 = 0;
        mat.$matrix.m33 = 1;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    } else {
        let x2 = x*x;
        let y2 = y*y;
        let z2 = z*z;

        mat.$matrix.m11 = 1 - 2 * (y2 + z2) * sinA2;
        mat.$matrix.m12 = 2 * (x * y * sinA2 + z * sinA * cosA);
        mat.$matrix.m13 = 2 * (x * z * sinA2 - y * sinA * cosA);
        mat.$matrix.m21 = 2 * (y * x * sinA2 - z * sinA * cosA);
        mat.$matrix.m22 = 1 - 2 * (z2 + x2) * sinA2;
        mat.$matrix.m23 = 2 * (y * z * sinA2 + x * sinA * cosA);
        mat.$matrix.m31 = 2 * (z * x * sinA2 + y * sinA * cosA);
        mat.$matrix.m32 = 2 * (z * y * sinA2 - x * sinA * cosA);
        mat.$matrix.m33 = 1 - 2 * (x2 + y2) * sinA2;
        mat.$matrix.m14 = mat.$matrix.m24 = mat.$matrix.m34 = 0;
        mat.$matrix.m41 = mat.$matrix.m42 = mat.$matrix.m43 = 0;
        mat.$matrix.m44 = 1;
    }
    this.multiply(mat);
		return this;
}

J3DIMatrix4.prototype.multiply = function(mat)
{
    if (typeof mat == 'object' && "$matrix" in mat) {
  
      if (J3DIHasCSSMatrix) {
          this.$matrix = this.$matrix.multiply(mat.$matrix);
          return this;
      }
  
      let m11 = (mat.$matrix.m11 * this.$matrix.m11 + mat.$matrix.m12 * this.$matrix.m21
                 + mat.$matrix.m13 * this.$matrix.m31 + mat.$matrix.m14 * this.$matrix.m41);
      let m12 = (mat.$matrix.m11 * this.$matrix.m12 + mat.$matrix.m12 * this.$matrix.m22
                 + mat.$matrix.m13 * this.$matrix.m32 + mat.$matrix.m14 * this.$matrix.m42);
      let m13 = (mat.$matrix.m11 * this.$matrix.m13 + mat.$matrix.m12 * this.$matrix.m23
                 + mat.$matrix.m13 * this.$matrix.m33 + mat.$matrix.m14 * this.$matrix.m43);
      let m14 = (mat.$matrix.m11 * this.$matrix.m14 + mat.$matrix.m12 * this.$matrix.m24
                 + mat.$matrix.m13 * this.$matrix.m34 + mat.$matrix.m14 * this.$matrix.m44);
  
      let m21 = (mat.$matrix.m21 * this.$matrix.m11 + mat.$matrix.m22 * this.$matrix.m21
                 + mat.$matrix.m23 * this.$matrix.m31 + mat.$matrix.m24 * this.$matrix.m41);
      let m22 = (mat.$matrix.m21 * this.$matrix.m12 + mat.$matrix.m22 * this.$matrix.m22
                 + mat.$matrix.m23 * this.$matrix.m32 + mat.$matrix.m24 * this.$matrix.m42);
      let m23 = (mat.$matrix.m21 * this.$matrix.m13 + mat.$matrix.m22 * this.$matrix.m23
                 + mat.$matrix.m23 * this.$matrix.m33 + mat.$matrix.m24 * this.$matrix.m43);
      let m24 = (mat.$matrix.m21 * this.$matrix.m14 + mat.$matrix.m22 * this.$matrix.m24
                 + mat.$matrix.m23 * this.$matrix.m34 + mat.$matrix.m24 * this.$matrix.m44);
  
      let m31 = (mat.$matrix.m31 * this.$matrix.m11 + mat.$matrix.m32 * this.$matrix.m21
                 + mat.$matrix.m33 * this.$matrix.m31 + mat.$matrix.m34 * this.$matrix.m41);
      let m32 = (mat.$matrix.m31 * this.$matrix.m12 + mat.$matrix.m32 * this.$matrix.m22
                 + mat.$matrix.m33 * this.$matrix.m32 + mat.$matrix.m34 * this.$matrix.m42);
      let m33 = (mat.$matrix.m31 * this.$matrix.m13 + mat.$matrix.m32 * this.$matrix.m23
                 + mat.$matrix.m33 * this.$matrix.m33 + mat.$matrix.m34 * this.$matrix.m43);
      let m34 = (mat.$matrix.m31 * this.$matrix.m14 + mat.$matrix.m32 * this.$matrix.m24
                 + mat.$matrix.m33 * this.$matrix.m34 + mat.$matrix.m34 * this.$matrix.m44);
  
      let m41 = (mat.$matrix.m41 * this.$matrix.m11 + mat.$matrix.m42 * this.$matrix.m21
                 + mat.$matrix.m43 * this.$matrix.m31 + mat.$matrix.m44 * this.$matrix.m41);
      let m42 = (mat.$matrix.m41 * this.$matrix.m12 + mat.$matrix.m42 * this.$matrix.m22
                 + mat.$matrix.m43 * this.$matrix.m32 + mat.$matrix.m44 * this.$matrix.m42);
      let m43 = (mat.$matrix.m41 * this.$matrix.m13 + mat.$matrix.m42 * this.$matrix.m23
                 + mat.$matrix.m43 * this.$matrix.m33 + mat.$matrix.m44 * this.$matrix.m43);
      let m44 = (mat.$matrix.m41 * this.$matrix.m14 + mat.$matrix.m42 * this.$matrix.m24
                 + mat.$matrix.m43 * this.$matrix.m34 + mat.$matrix.m44 * this.$matrix.m44);
  
      this.$matrix.m11 = m11;
      this.$matrix.m12 = m12;
      this.$matrix.m13 = m13;
      this.$matrix.m14 = m14;
  
      this.$matrix.m21 = m21;
      this.$matrix.m22 = m22;
      this.$matrix.m23 = m23;
      this.$matrix.m24 = m24;
  
      this.$matrix.m31 = m31;
      this.$matrix.m32 = m32;
      this.$matrix.m33 = m33;
      this.$matrix.m34 = m34;
  
      this.$matrix.m41 = m41;
      this.$matrix.m42 = m42;
      this.$matrix.m43 = m43;
      this.$matrix.m44 = m44;
    } else {
      this.$matrix.m11 *= mat;
      this.$matrix.m12 *= mat;
      this.$matrix.m13 *= mat;
      this.$matrix.m14 *= mat;
  
      this.$matrix.m21 *= mat;
      this.$matrix.m22 *= mat;
      this.$matrix.m23 *= mat;
      this.$matrix.m24 *= mat;
  
      this.$matrix.m31 *= mat;
      this.$matrix.m32 *= mat;
      this.$matrix.m33 *= mat;
      this.$matrix.m34 *= mat;
  
      this.$matrix.m41 *= mat;
      this.$matrix.m42 *= mat;
      this.$matrix.m43 *= mat;
      this.$matrix.m44 *= mat;
    }
    
    return this;
}

J3DIMatrix4.prototype.premultiply = function(mat)
{
    if (typeof mx2 == 'object' && "$matrix" in mat) {
  
      if (J3DIHasCSSMatrix) {
          this.$matrix = mat.$matrix.multiply(this.$matrix);
          return mx1;
      }
  
      let mx1 = mat;
      let mx2 = this;
      
      let m11 = (mx2.$matrix.m11 * mx1.$matrix.m11 + mx2.$matrix.m12 * mx1.$matrix.m21
                 + mx2.$matrix.m13 * mx1.$matrix.m31 + mx2.$matrix.m14 * mx1.$matrix.m41);
      let m12 = (mx2.$matrix.m11 * mx1.$matrix.m12 + mx2.$matrix.m12 * mx1.$matrix.m22
                 + mx2.$matrix.m13 * mx1.$matrix.m32 + mx2.$matrix.m14 * mx1.$matrix.m42);
      let m13 = (mx2.$matrix.m11 * mx1.$matrix.m13 + mx2.$matrix.m12 * mx1.$matrix.m23
                 + mx2.$matrix.m13 * mx1.$matrix.m33 + mx2.$matrix.m14 * mx1.$matrix.m43);
      let m14 = (mx2.$matrix.m11 * mx1.$matrix.m14 + mx2.$matrix.m12 * mx1.$matrix.m24
                 + mx2.$matrix.m13 * mx1.$matrix.m34 + mx2.$matrix.m14 * mx1.$matrix.m44);
  
      let m21 = (mx2.$matrix.m21 * mx1.$matrix.m11 + mx2.$matrix.m22 * mx1.$matrix.m21
                 + mx2.$matrix.m23 * mx1.$matrix.m31 + mx2.$matrix.m24 * mx1.$matrix.m41);
      let m22 = (mx2.$matrix.m21 * mx1.$matrix.m12 + mx2.$matrix.m22 * mx1.$matrix.m22
                 + mx2.$matrix.m23 * mx1.$matrix.m32 + mx2.$matrix.m24 * mx1.$matrix.m42);
      let m23 = (mx2.$matrix.m21 * mx1.$matrix.m13 + mx2.$matrix.m22 * mx1.$matrix.m23
                 + mx2.$matrix.m23 * mx1.$matrix.m33 + mx2.$matrix.m24 * mx1.$matrix.m43);
      let m24 = (mx2.$matrix.m21 * mx1.$matrix.m14 + mx2.$matrix.m22 * mx1.$matrix.m24
                 + mx2.$matrix.m23 * mx1.$matrix.m34 + mx2.$matrix.m24 * mx1.$matrix.m44);
  
      let m31 = (mx2.$matrix.m31 * mx1.$matrix.m11 + mx2.$matrix.m32 * mx1.$matrix.m21
                 + mx2.$matrix.m33 * mx1.$matrix.m31 + mx2.$matrix.m34 * mx1.$matrix.m41);
      let m32 = (mx2.$matrix.m31 * mx1.$matrix.m12 + mx2.$matrix.m32 * mx1.$matrix.m22
                 + mx2.$matrix.m33 * mx1.$matrix.m32 + mx2.$matrix.m34 * mx1.$matrix.m42);
      let m33 = (mx2.$matrix.m31 * mx1.$matrix.m13 + mx2.$matrix.m32 * mx1.$matrix.m23
                 + mx2.$matrix.m33 * mx1.$matrix.m33 + mx2.$matrix.m34 * mx1.$matrix.m43);
      let m34 = (mx2.$matrix.m31 * mx1.$matrix.m14 + mx2.$matrix.m32 * mx1.$matrix.m24
                 + mx2.$matrix.m33 * mx1.$matrix.m34 + mx2.$matrix.m34 * mx1.$matrix.m44);
  
      let m41 = (mx2.$matrix.m41 * mx1.$matrix.m11 + mx2.$matrix.m42 * mx1.$matrix.m21
                 + mx2.$matrix.m43 * mx1.$matrix.m31 + mx2.$matrix.m44 * mx1.$matrix.m41);
      let m42 = (mx2.$matrix.m41 * mx1.$matrix.m12 + mx2.$matrix.m42 * mx1.$matrix.m22
                 + mx2.$matrix.m43 * mx1.$matrix.m32 + mx2.$matrix.m44 * mx1.$matrix.m42);
      let m43 = (mx2.$matrix.m41 * mx1.$matrix.m13 + mx2.$matrix.m42 * mx1.$matrix.m23
                 + mx2.$matrix.m43 * mx1.$matrix.m33 + mx2.$matrix.m44 * mx1.$matrix.m43);
      let m44 = (mx2.$matrix.m41 * mx1.$matrix.m14 + mx2.$matrix.m42 * mx1.$matrix.m24
                 + mx2.$matrix.m43 * mx1.$matrix.m34 + mx2.$matrix.m44 * mx1.$matrix.m44);
  
      this.$matrix.m11 = m11;
      this.$matrix.m12 = m12;
      this.$matrix.m13 = m13;
      this.$matrix.m14 = m14;
  
      this.$matrix.m21 = m21;
      this.$matrix.m22 = m22;
      this.$matrix.m23 = m23;
      this.$matrix.m24 = m24;
  
      this.$matrix.m31 = m31;
      this.$matrix.m32 = m32;
      this.$matrix.m33 = m33;
      this.$matrix.m34 = m34;
  
      this.$matrix.m41 = m41;
      this.$matrix.m42 = m42;
      this.$matrix.m43 = m43;
      this.$matrix.m44 = m44;
    } else {
      this.$matrix.m11 *= mat;
      this.$matrix.m12 *= mat;
      this.$matrix.m13 *= mat;
      this.$matrix.m14 *= mat;
  
      this.$matrix.m21 *= mat;
      this.$matrix.m22 *= mat;
      this.$matrix.m23 *= mat;
      this.$matrix.m24 *= mat;
  
      this.$matrix.m31 *= mat;
      this.$matrix.m32 *= mat;
      this.$matrix.m33 *= mat;
      this.$matrix.m34 *= mat;
  
      this.$matrix.m41 *= mat;
      this.$matrix.m42 *= mat;
      this.$matrix.m43 *= mat;
      this.$matrix.m44 *= mat;
    }
    
    return this;
}


J3DIMatrix4.prototype.divide = function(divisor)
{
    this.$matrix.m11 /= divisor;
    this.$matrix.m12 /= divisor;
    this.$matrix.m13 /= divisor;
    this.$matrix.m14 /= divisor;

    this.$matrix.m21 /= divisor;
    this.$matrix.m22 /= divisor;
    this.$matrix.m23 /= divisor;
    this.$matrix.m24 /= divisor;

    this.$matrix.m31 /= divisor;
    this.$matrix.m32 /= divisor;
    this.$matrix.m33 /= divisor;
    this.$matrix.m34 /= divisor;

    this.$matrix.m41 /= divisor;
    this.$matrix.m42 /= divisor;
    this.$matrix.m43 /= divisor;
    this.$matrix.m44 /= divisor;

    return this;
}

J3DIMatrix4.prototype.ortho = function(left, right, bottom, top, near, far)
{
    let tx = (left + right) / (left - right);
    let ty = (top + bottom) / (top - bottom);
    let tz = (far + near) / (far - near);

    let matrix = new J3DIMatrix4();
    matrix.$matrix.m11 = 2 / (left - right);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;
    
    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = 2 / (top - bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;
    
    matrix.$matrix.m31 = 0;
    matrix.$matrix.m32 = 0;
    matrix.$matrix.m33 = -2 / (far - near);
    matrix.$matrix.m34 = 0;
    
    matrix.$matrix.m41 = tx;
    matrix.$matrix.m42 = ty;
    matrix.$matrix.m43 = tz;
    matrix.$matrix.m44 = 1;

    this.multiply(matrix);
}

J3DIMatrix4.prototype.frustum = function(left, right, bottom, top, near, far)
{
    let matrix = new J3DIMatrix4();
    let A = (right + left) / (right - left);
    let B = (top + bottom) / (top - bottom);
    let C = -(far + near) / (far - near);
    let D = -(2 * far * near) / (far - near);

    matrix.$matrix.m11 = (2 * near) / (right - left);
    matrix.$matrix.m12 = 0;
    matrix.$matrix.m13 = 0;
    matrix.$matrix.m14 = 0;

    matrix.$matrix.m21 = 0;
    matrix.$matrix.m22 = 2 * near / (top - bottom);
    matrix.$matrix.m23 = 0;
    matrix.$matrix.m24 = 0;

    matrix.$matrix.m31 = A;
    matrix.$matrix.m32 = B;
    matrix.$matrix.m33 = C;
    matrix.$matrix.m34 = -1;

    matrix.$matrix.m41 = 0;
    matrix.$matrix.m42 = 0;
    matrix.$matrix.m43 = D;
    matrix.$matrix.m44 = 0;

    this.multiply(matrix);
}

J3DIMatrix4.prototype.perspective = function(fovy, aspect, zNear, zFar)
{
    let top = Math.tan(fovy * Math.PI / 360) * zNear;
    let bottom = -top;
    let left = aspect * bottom;
    let right = aspect * top;
    this.frustum(left, right, bottom, top, zNear, zFar);
}

J3DIMatrix4.prototype.world = function(posx, posy, posz, forwardx, forwardy, forwardz, upx, upy, upz)
{
    if (typeof posx == 'object' && "length" in posx) {
        let t = eyez;
        upx = t[0];
        upy = t[1];
        upz = t[2];

        t = eyey;
        dirx = t[0];
        diry = t[1];
        dirz = t[2];

        t = eyex;
        posx = t[0];
        posy = t[1];
        posz = t[2];
    }

    let matrix = new J3DIMatrix4();

    // Make rotation matrix
    let forward = new J3DIVector3(forwardx,forwardy,forwardz);
    let up = new J3DIVector3(upx,upy,upz);
    forward.normalize();
    up.normalize();
    let right=new J3DIVector3();
    right.load(up);
    right.cross(forward);
    right.normalize();
    up.load(forward);
    up.cross(right);

    matrix.$matrix.m11=right[0];
    matrix.$matrix.m21=right[1];
    matrix.$matrix.m31=right[2];
    matrix.$matrix.m12=up[0];
    matrix.$matrix.m22=up[1];
    matrix.$matrix.m32=up[2];
    matrix.$matrix.m13=forward[0];
    matrix.$matrix.m23=forward[1];
    matrix.$matrix.m33=forward[2];
    
    matrix.translate(-posx, -posy, -posz);

    this.multiply(matrix);
}
J3DIMatrix4.prototype.lookat = function(eyex, eyey, eyez, centerx, centery, centerz, upx, upy, upz)
{
    if (typeof eyez == 'object' && "length" in eyez) {
        let t = eyez;
        upx = t[0];
        upy = t[1];
        upz = t[2];

        t = eyey;
        centerx = t[0];
        centery = t[1];
        centerz = t[2];

        t = eyex;
        eyex = t[0];
        eyey = t[1];
        eyez = t[2];
    }

    let matrix = new J3DIMatrix4();

    // Make rotation matrix

    // Z vector
    let zx = centerx - eyex;
    let zy = centery - eyey;
    let zz = centerz - eyez;
    let mag = Math.sqrt(zx * zx + zy * zy + zz * zz);
    if (mag) {
        zx /= mag;
        zy /= mag;
        zz /= mag;
    }

    // Y vector
    let yx = upx;
    let yy = upy;
    let yz = upz;

    // X vector = Z cross Y
    let xx =  yy * zz - yz * zy;
    let xy = -yx * zz + yz * zx;
    let xz =  yx * zy - yy * zx;

    // Recompute Y = X cross Z
    yx =  zy * xz - zz * xy;
    yy = -zx * xz + zz * xx;
    yz =  zx * xy - zy * xx;

    // cross product gives area of parallelogram, which is < 1.0 for
    // non-perpendicular unit-length vectors; so normalize x, y here

    mag = Math.sqrt(xx * xx + xy * xy + xz * xz);
    if (mag) {
        xx /= mag;
        xy /= mag;
        xz /= mag;
    }

    mag = Math.sqrt(yx * yx + yy * yy + yz * yz);
    if (mag) {
        yx /= mag;
        yy /= mag;
        yz /= mag;
    }

    matrix.$matrix.m11 = xx;
    matrix.$matrix.m21 = xy;
    matrix.$matrix.m31 = xz;
    matrix.$matrix.m41 = 0;

    matrix.$matrix.m12 = yx;
    matrix.$matrix.m22 = yy;
    matrix.$matrix.m32 = yz;
    matrix.$matrix.m42 = 0;

    matrix.$matrix.m13 = zx;
    matrix.$matrix.m23 = zy;
    matrix.$matrix.m33 = zz;
    matrix.$matrix.m43 = 0;

    matrix.$matrix.m14 = 0;
    matrix.$matrix.m24 = 0;
    matrix.$matrix.m34 = 0;
    matrix.$matrix.m44 = 1;
    //matrix.transpose();
    matrix.translate(-eyex, -eyey, -eyez);

    this.multiply(matrix);
}


// Returns true on success, false otherwise. All params are Array objects
J3DIMatrix4.prototype.decompose = function(_translate, _rotate, _scale, _skew, _perspective)
{
    // Normalize the matrix.
    if (this.$matrix.m44 == 0)
        return false;

    // Gather the params
    let translate = (_translate == undefined || !("length" in _translate)) ? new J3DIVector3 : _translate;
    let rotate = (_rotate == undefined || !("length" in _rotate)) ? new J3DIVector3 : _rotate;
    let scale = (_scale == undefined || !("length" in _scale)) ? new J3DIVector3 : _scale;
    let skew = (_skew == undefined || !("length" in _skew)) ? new J3DIVector3 : _skew;
    let perspective = (_perspective == undefined || !("length" in _perspective)) ? new Array(4) : _perspective;

    let matrix = new J3DIMatrix4(this);

    matrix.divide(matrix.$matrix.m44);

    // perspectiveMatrix is used to solve for perspective, but it also provides
    // an easy way to test for singularity of the upper 3x3 component.
    let perspectiveMatrix = new J3DIMatrix4(matrix);

    perspectiveMatrix.$matrix.m14 = 0;
    perspectiveMatrix.$matrix.m24 = 0;
    perspectiveMatrix.$matrix.m34 = 0;
    perspectiveMatrix.$matrix.m44 = 1;

    if (perspectiveMatrix._determinant4x4() == 0)
        return false;

    // First, isolate perspective.
    if (matrix.$matrix.m14 != 0 || matrix.$matrix.m24 != 0 || matrix.$matrix.m34 != 0) {
        // rightHandSide is the right hand side of the equation.
        let rightHandSide = [ matrix.$matrix.m14, matrix.$matrix.m24, matrix.$matrix.m34, matrix.$matrix.m44 ];

        // Solve the equation by inverting perspectiveMatrix and multiplying
        // rightHandSide by the inverse.
        let inversePerspectiveMatrix = new J3DIMatrix4(perspectiveMatrix);
        inversePerspectiveMatrix.invert();
        let transposedInversePerspectiveMatrix = new J3DIMatrix4(inversePerspectiveMatrix);
        transposedInversePerspectiveMatrix.transpose();
        transposedInversePerspectiveMatrix.multVecMatrix(perspective, rightHandSide);

        // Clear the perspective partition
        matrix.$matrix.m14 = matrix.$matrix.m24 = matrix.$matrix.m34 = 0
        matrix.$matrix.m44 = 1;
    }
    else {
        // No perspective.
        perspective[0] = perspective[1] = perspective[2] = 0;
        perspective[3] = 1;
    }

    // Next take care of translation
    translate[0] = matrix.$matrix.m41
    matrix.$matrix.m41 = 0
    translate[1] = matrix.$matrix.m42
    matrix.$matrix.m42 = 0
    translate[2] = matrix.$matrix.m43
    matrix.$matrix.m43 = 0

    // Now get scale and shear. 'row' is a 3 element array of 3 component vectors
    let row0 = new J3DIVector3(matrix.$matrix.m11, matrix.$matrix.m12, matrix.$matrix.m13);
    let row1 = new J3DIVector3(matrix.$matrix.m21, matrix.$matrix.m22, matrix.$matrix.m23);
    let row2 = new J3DIVector3(matrix.$matrix.m31, matrix.$matrix.m32, matrix.$matrix.m33);

    // Compute X scale factor and normalize first row.
    scale[0] = row0.vectorLength();
    row0.divide(scale[0]);

    // Compute XY shear factor and make 2nd row orthogonal to 1st.
    skew[0] = row0.dot(row1);
    row1.combine(row0, 1.0, -skew[0]);

    // Now, compute Y scale and normalize 2nd row.
    scale[1] = row1.vectorLength();
    row1.divide(scale[1]);
    skew[0] /= scale[1];

    // Compute XZ and YZ shears, orthogonalize 3rd row
    skew[1] = row1.dot(row2);
    row2.combine(row0, 1.0, -skew[1]);
    skew[2] = row1.dot(row2);
    row2.combine(row1, 1.0, -skew[2]);

    // Next, get Z scale and normalize 3rd row.
    scale[2] = row2.vectorLength();
    row2.divide(scale[2]);
    skew[1] /= scale[2];
    skew[2] /= scale[2];

    // At this point, the matrix (in rows) is orthonormal.
    // Check for a coordinate system flip.  If the determinant
    // is -1, then negate the matrix and the scaling factors.
    let pdum3 = new J3DIVector3(row1);
    pdum3.cross(row2);
    if (row0.dot(pdum3) < 0) {
        for (i = 0; i < 3; i++) {
            scale[i] *= -1;
            row[0][i] *= -1;
            row[1][i] *= -1;
            row[2][i] *= -1;
        }
    }

    // Now, get the rotations out
    rotate[1] = Math.asin(-row0[2]);
    if (Math.cos(rotate[1]) != 0) {
        rotate[0] = Math.atan2(row1[2], row2[2]);
        rotate[2] = Math.atan2(row0[1], row0[0]);
    }
    else {
        rotate[0] = Math.atan2(-row2[0], row1[1]);
        rotate[2] = 0;
    }

    // Convert rotations to degrees
    let rad2deg = 180 / Math.PI;
    rotate[0] *= rad2deg;
    rotate[1] *= rad2deg;
    rotate[2] *= rad2deg;

    return true;
}

J3DIMatrix4.prototype._determinant2x2 = function(a, b, c, d)
{
    return a * d - b * c;
}

J3DIMatrix4.prototype._determinant3x3 = function(a1, a2, a3, b1, b2, b3, c1, c2, c3)
{
    return a1 * this._determinant2x2(b2, b3, c2, c3)
         - b1 * this._determinant2x2(a2, a3, c2, c3)
         + c1 * this._determinant2x2(a2, a3, b2, b3);
}

J3DIMatrix4.prototype._determinant4x4 = function()
{
    let a1 = this.$matrix.m11;
    let b1 = this.$matrix.m12;
    let c1 = this.$matrix.m13;
    let d1 = this.$matrix.m14;

    let a2 = this.$matrix.m21;
    let b2 = this.$matrix.m22;
    let c2 = this.$matrix.m23;
    let d2 = this.$matrix.m24;

    let a3 = this.$matrix.m31;
    let b3 = this.$matrix.m32;
    let c3 = this.$matrix.m33;
    let d3 = this.$matrix.m34;

    let a4 = this.$matrix.m41;
    let b4 = this.$matrix.m42;
    let c4 = this.$matrix.m43;
    let d4 = this.$matrix.m44;

    return a1 * this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4)
         - b1 * this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4)
         + c1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4)
         - d1 * this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);
}

J3DIMatrix4.prototype._makeAdjoint = function()
{
    let a1 = this.$matrix.m11;
    let b1 = this.$matrix.m12;
    let c1 = this.$matrix.m13;
    let d1 = this.$matrix.m14;

    let a2 = this.$matrix.m21;
    let b2 = this.$matrix.m22;
    let c2 = this.$matrix.m23;
    let d2 = this.$matrix.m24;

    let a3 = this.$matrix.m31;
    let b3 = this.$matrix.m32;
    let c3 = this.$matrix.m33;
    let d3 = this.$matrix.m34;

    let a4 = this.$matrix.m41;
    let b4 = this.$matrix.m42;
    let c4 = this.$matrix.m43;
    let d4 = this.$matrix.m44;

    // Row column labeling reversed since we transpose rows & columns
    this.$matrix.m11  =   this._determinant3x3(b2, b3, b4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m21  = - this._determinant3x3(a2, a3, a4, c2, c3, c4, d2, d3, d4);
    this.$matrix.m31  =   this._determinant3x3(a2, a3, a4, b2, b3, b4, d2, d3, d4);
    this.$matrix.m41  = - this._determinant3x3(a2, a3, a4, b2, b3, b4, c2, c3, c4);

    this.$matrix.m12  = - this._determinant3x3(b1, b3, b4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m22  =   this._determinant3x3(a1, a3, a4, c1, c3, c4, d1, d3, d4);
    this.$matrix.m32  = - this._determinant3x3(a1, a3, a4, b1, b3, b4, d1, d3, d4);
    this.$matrix.m42  =   this._determinant3x3(a1, a3, a4, b1, b3, b4, c1, c3, c4);

    this.$matrix.m13  =   this._determinant3x3(b1, b2, b4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m23  = - this._determinant3x3(a1, a2, a4, c1, c2, c4, d1, d2, d4);
    this.$matrix.m33  =   this._determinant3x3(a1, a2, a4, b1, b2, b4, d1, d2, d4);
    this.$matrix.m43  = - this._determinant3x3(a1, a2, a4, b1, b2, b4, c1, c2, c4);

    this.$matrix.m14  = - this._determinant3x3(b1, b2, b3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m24  =   this._determinant3x3(a1, a2, a3, c1, c2, c3, d1, d2, d3);
    this.$matrix.m34  = - this._determinant3x3(a1, a2, a3, b1, b2, b3, d1, d2, d3);
    this.$matrix.m44  =   this._determinant3x3(a1, a2, a3, b1, b2, b3, c1, c2, c3);
}
/** Returns the trace of the matrix (sum of the diagonal elements)
 *
 * @return float   Sum of the diagonal elements
 */
J3DIMatrix4.prototype.trace = function () {
    return this.$matrix.m11+this.$matrix.m22+this.$matrix.m33+this.$matrix.m44;
}
/** Computes the inverse of the exponential map operation.
 *
 * r = loghat() = 1/(2*sin(theta)) * (R - transpose(R))
 *               where 
 *               theta = arccos( (trace(R) - 1)/2 )
 *
 * @param  R   Rotation matrix in SO(3)
 * @return r   Exponential map of R in so(3)
 */
J3DIMatrix4.prototype.loghat = function () {
    let r00 = this.$matrix.m11;
    let r01 = this.$matrix.m12;
    let r02 = this.$matrix.m13;

    let r10 = this.$matrix.m21;
    let r11 = this.$matrix.m22;
    let r12 = this.$matrix.m23;

    let r20 = this.$matrix.m31;
    let r21 = this.$matrix.m32;
    let r22 = this.$matrix.m33;
  
    let cosa = (r00 + r11 + r22 - 1.0) * 0.5;
    let aa = new J3DIVector3(r21 - r12,
                             r02 - r20,
                             r10 - r01);
    let twosina = aa.norm();
    let r;
    
    let sign = function(value) {
     return (value < 0 ? -1 : 1);
    };
    
    if (twosina < 1e-14) {
      if ( Math.abs(r00 - r11) > 0.99 
        || Math.abs(r00 - r22) > 0.99
        || Math.abs(r11 - r22) > 0.99) { //=> 180° rotation
      
        // maybe it is 180° rotation around a major axis
        if (Math.abs(r11 - r22) < 1e-14) {
          r = new J3DIVector3(Math.PI*sign(r00),0,0);
        } else if (Math.abs(r00 - r22) < 1e-14) {
          r = new J3DIVector3(0,Math.PI*sign(r11),0);
        } else if (Math.abs(r00 - r11) < 1e-14) {
          r = new J3DIVector3(0,0,Math.PI*sign(r22));
        } else { // => could not determine major axis
          r = new J3DIVector3(0,0,0);
        }
      } else { //=> extremely small rotation or 360° rotation
        r = new J3DIVector3(0,0,0);
      }
       // r = new J3DIVector3(0,0,0);
    } else {
        let alpha = Math.atan2(twosina*0.5,cosa);
        r = aa.multiply(alpha/twosina);
    }
    return r;
}
//
// J3DIVector3
//
class J3DIVector3 {
  constructor (x,y,z) {
    this.load(x,y,z);
  }
}

J3DIVector3.prototype.load = function (x,y,z)
{
    if (typeof x == 'object' || typeof x == 'array') {
        this[0] = x[0];
        this[1] = x[1];
        this[2] = x[2];
    }
    else if (typeof x == 'number') {
        this[0] = x;
        this[1] = y;
        this[2] = z;
    }
    else {
        this[0] = 0;
        this[1] = 0;
        this[2] = 0;
    }
    return this;
}

J3DIVector3.prototype.getAsArray = function ()
{
    return [ this[0], this[1], this[2] ];
}

J3DIVector3.prototype.getAsFloat32Array = function ()
{
    return new Float32Array(this.getAsArray());
}

J3DIVector3.prototype.vectorLength = function ()
{
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
}
J3DIVector3.prototype.norm = function()
{
    return Math.sqrt(this[0] * this[0] + this[1] * this[1] + this[2] * this[2]);
}

J3DIVector3.prototype.cross = function(v)
{
  let t0=this[0],t1=this[1],t2=this[2];
  
    this[0] =  t1 * v[2] - t2 * v[1];
    this[1] = -t0 * v[2] + t2 * v[0];
    this[2] =  t0 * v[1] - t1 * v[0];
}

J3DIVector3.prototype.dot = function(v)
{
    return this[0] * v[0] + this[1] * v[1] + this[2] * v[2];
}

J3DIVector3.prototype.combine = function(v, ascl, bscl)
{
    this[0] = (ascl * this[0]) + (bscl * v[0]);
    this[1] = (ascl * this[1]) + (bscl * v[1]);
    this[2] = (ascl * this[2]) + (bscl * v[2]);
}
J3DIVector3.prototype.multiply = function(v)
{
  if (typeof v == 'number') {
    this[0] *= v; this[1] *= v; this[2] *= v; 
  } else {
    this[0] *= v[0]; this[1] *= v[1]; this[2] *= v[2]; 
  }
  return this;
}
J3DIVector3.prototype.divide = function(v)
{
  if (typeof v == 'number') {
    this[0] /= v; this[1] /= v; this[2] /= v; 
  } else {
    this[0] /= v[0]; this[1] /= v[1]; this[2] /= v[2]; 
  }
  return this;
}

J3DIVector3.prototype.subtract = function(v)
{
  if (typeof v == 'number') {
    this[0] -= v; this[1] -= v; this[2] -= v; 
  } else {
    this[0] -= v[0]; this[1] -= v[1]; this[2] -= v[2]; 
  }
  return this;
}
J3DIVector3.prototype.add = function(v)
{
  if (typeof v == 'number') {
    this[0] += v; this[1] += v; this[2] += v; return this;
  } else {
    this[0] += v[0]; this[1] += v[1]; this[2] += v[2]; return this;
  }
}
J3DIVector3.prototype.neg = function()
{
    this[0] = -this[0]; this[1] = -this[1]; this[2] = -this[2]; return this;
}
J3DIVector3.prototype.normalize = function()
{
    let l=this.vectorLength();
    this[0] /= l;
    this[1] /= l;
    this[2] /= l;
    return this;
}
/** Reflects this vector at n.
 * let l:= this;
 * let r:= 2*(n*l)*n-l;
 * return r;
 */
J3DIVector3.prototype.reflect = function(n)
{
	let l = new J3DIVector3(this);
	this.multiply(n);
	this.multiply(2);
  this.multiply(n);
	this.subtract(l);
	return this;
}

J3DIVector3.prototype.multVecMatrix = function(matrix)
{
    let x = this[0];
    let y = this[1];
    let z = this[2];

    this[0] = matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;
    this[1] = matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;
    this[2] = matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;
    let w = matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;
    if (w != 1 && w != 0) {
        this[0] /= w;
        this[1] /= w;
        this[2] /= w;
    }
    
    return this;
}

/** A normal vector must be multiplied by the inverse transpose of the matrix.
 * That is:
 * 
 * n' = S * n;
 *
 * where S = tranpose(inv(M))
 *
 */
J3DIVector3.prototype.multNormalMatrix = function(matrix)
{
    let x = this[0];
    let y = this[1];
    let z = this[2];
    
    let S = new J3DIMatrix4(matrix);
    S.invert();
    S.transpose();

    this[0] = S.$matrix.m41 + x * S.$matrix.m11 + y * S.$matrix.m21 + z * S.$matrix.m31;
    this[1] = S.$matrix.m42 + x * S.$matrix.m12 + y * S.$matrix.m22 + z * S.$matrix.m32;
    this[2] = S.$matrix.m43 + x * S.$matrix.m13 + y * S.$matrix.m23 + z * S.$matrix.m33;
    let w = S.$matrix.m44 + x * S.$matrix.m14 + y * S.$matrix.m24 + z * S.$matrix.m34;
    if (w != 1 && w != 0) {
        this[0] /= w;
        this[1] /= w;
        this[2] /= w;
    }
    
    return this;
}

/** Returns the result of the hat operation on a 3-vector.*/
J3DIVector3.prototype.hat = function () {
    let R = new J3DIMatrix4([
              0,  -this[2], this[1], 0, 
        this[2],        0, -this[0], 0, 
       -this[1],  this[0],        0, 0, 
              0,        0,        0, 1  
    ]);
    return R;
}
/** Computes the exponential map operation.
 *
 * R = exphat(r) = I + A + B
 *               where 
 *               A = r.hat()*sin(theta)/theta 
 *               B = hat(r)^2*(1-cos(theta))/theta^2
 *               theta = norm(r)
 *               r = this
 *
 * @param r   Exponential map in so(3)
 * @return  R   Rotation matrix of r in SO(3)
 */
J3DIVector3.prototype.exphat = function () {
  let r=this;
  let theta=r.norm();
  let R = new J3DIMatrix4();
  if (Math.abs(theta) < 1e-14) {
  } else {
    let a=r.hat().multiply(Math.sin(theta)/theta).getAsArray();
    let b=r.hat().multiply(r.hat()).multiply((1-Math.cos(theta))/(theta*theta)).getAsArray();
    R.load([
        1+a[0]+b[0],   a[1]+b[1],     a[2]+b[2], 0, 
          a[4]+b[4], 1+a[5]+b[5],     a[6]+b[6], 0, 
          a[8]+b[8],   a[9]+b[9], 1+a[10]+b[10], 0, 
                  0,           0,             0, 1  
    ]);
  }
  return R;
}

J3DIVector3.prototype.toString = function()
{
    return "["+formatNumber(this[0])+","+formatNumber(this[1])+","+formatNumber(this[2])+"]";
}
//-------------------
//
// J3DIVertexArray
//
class J3DIVertexArray {
  constructor(array) {
    this.load(array);
  }
}

J3DIVertexArray.prototype.load = function(array)
{
	  if (array === undefined) {
			this.length = 0;
		} else {
			this.length = array.length;
			for (let i=0; i < array.length; i++) {
				this[i] = array[i];
			}
		}
}

J3DIVertexArray.prototype.getAsArray = function()
{
	  let array = new Array(this.length);
		for (let i=0; i < array.length; i++) {
			array[i] = this[i];
		}
		
    return array;
}

J3DIVertexArray.prototype.getAsFloat32Array = function()
{
    return new Float32Array(this.getAsArray());
}


J3DIVertexArray.prototype.multVecMatrix = function(matrix)
{
	 for (let i=0; i < this.length; i+=3) {	
			let x = this[i];
			let y = this[i+1];
			let z = this[i+2];
	
			this[i] = matrix.$matrix.m41 + x * matrix.$matrix.m11 + y * matrix.$matrix.m21 + z * matrix.$matrix.m31;
			this[i+1] = matrix.$matrix.m42 + x * matrix.$matrix.m12 + y * matrix.$matrix.m22 + z * matrix.$matrix.m32;
			this[i+2] = matrix.$matrix.m43 + x * matrix.$matrix.m13 + y * matrix.$matrix.m23 + z * matrix.$matrix.m33;
			let w = matrix.$matrix.m44 + x * matrix.$matrix.m14 + y * matrix.$matrix.m24 + z * matrix.$matrix.m34;
			if (w != 1 && w != 0) {
					this[i] /= w;
					this[i+1] /= w;
					this[i+2] /= w;
			}
	}
}
/** Returns the normal of the triangle given by the indices. */
J3DIVertexArray.prototype.normal = function(i1,i2,i3)
{
	return this.rawNormal(i1,i2,i3).normalize();
}
/** Returns the unnoramlized normal of the triangle given by the indices. */
J3DIVertexArray.prototype.rawNormal = function(i1,i2,i3)
{
  let n = new J3DIVector3(this[i3*3]-this[i1*3],this[i3*3+1]-this[i1*3+1],this[i3*3+2]-this[i1*3+2]);
	n.cross(new J3DIVector3(this[i2*3]-this[i1*3],this[i2*3+1]-this[i1*3+1],this[i2*3+2]-this[i1*3+2]));
	return n;
}
/** Returns the unnoramlized normal of the triangle given by the indices. */
let rawZReuse1=new J3DIVector3();
let rawZReuse2=new J3DIVector3();
J3DIVertexArray.prototype.rawZ = function(i1,i2,i3)
{
  let n = rawZReuse1.load(this[i3*3]-this[i1*3],this[i3*3+1]-this[i1*3+1],this[i3*3+2]-this[i1*3+2]);
  n.cross(rawZReuse2.load(this[i2*3]-this[i1*3],this[i2*3+1]-this[i1*3+1],this[i2*3+2]-this[i1*3+2]));
  return n[2];
}

J3DIVertexArray.prototype.toString = function()
{
    let str="[";
		for (let i=0; i < this.length; i++) {
			if (i > 0) {
				str+=',';
			  if (i % 3 == 0) str+=' ';
			}
			str+=formatNumber(this[i]);
		}
		str+="]";
		return str;
}

// --------------
// require.js
// --------------
define("J3DIMath", [], 
function() {
// BEGIN Misc functions
// ------------------------------------------
let clamp = function(value, min, max) {
  if (value === undefined || value != value) return min;
  return Math.max(min, Math.min(max, value));
}

let sign = function(value) {
  return (value < 0 ? -1 : 1);
}
// ------------------------------------------
// END Misc functions


// BEGIN Interpolation functions
// ------------------------------------------
/** Performs an exponential map interpolation from R1 to R2.
 *
 *  R1 -> R1 * exphat( a )
 *        where
 *         a = loghat(inv(R1)*R2) * lambda 
 *       note: since R1 is a rotation matrix, its inverse is its transpose!
 *
 * @param R1       3x3 rotation matrix 1
 * @param R2       3x3 rotation matrix 2
 * @param lambda   amount of interpolation, lambda in [0,1]
 * @return interpolated rotation
 */
let elerp = function (R1, R2, lambda) {
   let invR1 = new J3DIMatrix4(R1).transpose();
   let a = invR1.multiply(R2).loghat().multiply(lambda);
   let lerp = new J3DIMatrix4(R1);
   return lerp.multiply(a.exphat());
};

/** Performs linear interpolation from rigid transformation matrix T1 to 
 *  rigid transformation matrix T2.
 *
 *  R1 -> R1 * exphat( a )
 *        where
 *         a = loghat(inv(R1)*R2) * lambda 
 *       note: since R1 is a rotation matrix, its inverse is its transpose!
 *
 * @param R1       3x3 rotation matrix 1
 * @param R2       3x3 rotation matrix 2
 * @param lambda   amount of interpolation, lambda in [0,1]
 * @return interpolated rotation
 */
let rigidLerp = function (T1, T2, lambda) {
   lambda = clamp(lambda, 0, 1);
  
   let t1 = new J3DIVector3(T1.$matrix.m41,T1.$matrix.m42,T1.$matrix.m43);
   let R1 = new J3DIMatrix4(T1);
   R1.$matrix.m41=0;
   R1.$matrix.m42=0;
   R1.$matrix.m43=0;
   
   let t2 = new J3DIVector3(T2.$matrix.m41,T2.$matrix.m42,T2.$matrix.m43);
   let R2 = new J3DIMatrix4(T2);
   R2.$matrix.m41=0;
   R2.$matrix.m42=0;
   R2.$matrix.m43=0;
   
   let invR1 = new J3DIMatrix4(R1).transpose();
   let invR2 = new J3DIMatrix4(R2).transpose();
   
   t1.multVecMatrix(invR1).multiply(1 - lambda);
   t2.multVecMatrix(invR2).multiply(lambda);
   let t = new J3DIVector3(t1);
   t.add(t2);
   
   let a = invR1.multiply(R2).loghat().multiply(lambda);
   let lerp = new J3DIMatrix4(R1);
   lerp.multiply(a.exphat());
   
   t.multVecMatrix(lerp);
   lerp.$matrix.m41=t[0];
   lerp.$matrix.m42=t[1];
   lerp.$matrix.m43=t[2];

   return lerp;
};


// ------------------------------------------
// END Interpolation functions

// BEGIN Intersection functions
// ------------------------------------------
/** Intersection test for a ray and an axis-oriented box. 
 * The ray must be given as an object with {point:J3DIVector3, dir:J3DIVector3}.
 * The box must be given as an object with {pMin:J3DIVector3, pMax:J3DIVector3}.
 * -> dir must be a normalized vector.
 * -> All coordinates in pMin must be smaller than in pMax
 *
 * Returns the intersection data: hit-point 3d coordinates and in u,v coordinates as
 *    {point:J3DIVector3, uv:J3DIVector3, t:float, face:int}
 */
let intersectBox = function(ray, box) {
  let pMin=box.pMin; let pMax=box.pMax;
  let t0=0; let t1=Number.MAX_VALUE;
  let face0 = -1;  let face1 = -1;
  for (let i=0;i<3;i++) {
    // update interval for i-th bounding box slab
    let invRayDir = 1.0/ray.dir[i];
    let tNear = (pMin[i] - ray.point[i]) * invRayDir;
    let tFar = (pMax[i] - ray.point[i]) * invRayDir;
    
    // update parametric interval from slab intersection
    let faceSwap=0;
    if (tNear > tFar) { let swap=tNear; tNear=tFar; tFar = swap; faceSwap=3; }
    if (tNear > t0) { t0=tNear; face0=i+faceSwap; }
    if (tFar < t1) { t1=tFar; face1=i+3-faceSwap; }
    if (t0>t1) return null;
  }
  let thit;
  let facehit;
  if (t0<t1 && face0!=-1 || face1==-1) {
    thit=t0;
    facehit=face0;
  } else {
    thit=t1;
    facehit=face1;
  }

  let phit = new J3DIVector3(ray.point).add(new J3DIVector3(ray.dir).multiply(thit));
  // find parametric representation of box hit
  let u,v;
  switch (facehit) {
    case 0: {// left
        let dpdu = new J3DIVector3(0, 0, 1/(pMax[2] - pMin[2]) );
        let dpdv = new J3DIVector3(0, 1/(pMax[1] - pMin[1]), 0);
        u = (phit[2]-pMin[2])*dpdu[2];
        v = (phit[1]-pMin[1])*dpdv[1];
        break;
    }
    case 3: {// right
        let dpdu = new J3DIVector3(0, 0, 1/(pMax[2] - pMin[2]) );
        let dpdv = new J3DIVector3(0, 1/(pMax[1] - pMin[1]), 0);
        u = (phit[2]-pMin[2])*dpdu[2];
        v = (phit[1]-pMin[1])*dpdv[1];
        break;
    }
    case 1: {// down
        let dpdu = new J3DIVector3(1/(pMax[0] - pMin[0]), 0, 0);
        let dpdv = new J3DIVector3(0, 0, 1/(pMax[2] - pMin[2]));
        u = (phit[0]-pMin[0])*dpdu[0];
        v = (phit[2]-pMin[2])*dpdv[2];
        break;
    }
    case 4: {// up
        let dpdu = new J3DIVector3(1/(pMax[0] - pMin[0]), 0, 0);
        let dpdv = new J3DIVector3(0, 0, 1/(pMax[2] - pMin[2]));
        u = (phit[0]-pMin[0])*dpdu[0];
        v = (phit[2]-pMin[2])*dpdv[2];
        break;
    }
    case 2: {// front
        let dpdu = new J3DIVector3(1/(pMax[0] - pMin[0]), 0, 0 );
        let dpdv = new J3DIVector3(0, 1/(pMax[1] - pMin[1]), 0);
        u = (phit[0]-pMin[0])*dpdu[0];
        v = (phit[1]-pMin[1])*dpdv[1];
        break;
    }
    case 5: {// back
        let dpdu = new J3DIVector3(1/(pMax[0] - pMin[0]), 0, 0 );
        let dpdv = new J3DIVector3(0, 1/(pMax[1] - pMin[1]), 0);
        u = (phit[0]-pMin[0])*dpdu[0];
        v = (phit[1]-pMin[1])*dpdv[1];
        break;
    }
    default:
      //alert("ERROR, illegal face number:"+facehit);
			return null;
  }
  
  return {point:phit, uv:new J3DIVector3(u,v,0), t:thit, face:facehit}
}

/** Intersection test for a ray and a plane. 
 * The ray must be given as an object with {point:J3DIVector3, dir:J3DIVector3}.
 * The plane must be given as an object with {point:J3DIVector3, normal:J3DIVector3}.
 * -> dir and normal must be normalized vectors.
 *
 * Returns the intersection data: hit-point 3d coordinates and in u,v coordinates as
 *                                {point:J3DIVector3, uv:J3DIVector3, t:float}
 */
let intersectPlane = function(ray, plane) {
  // solve for t:
  // t = (ray.p - plane.p) * plane.n / ray.d * plane.n
  let divisor = ray.dir.dot(plane.normal);
  if (Math.abs(divisor) < 1e-20) {
    return null;
  }
  //console.log("planeNormal:"+plane.normal);
  //console.log(divisor+" divi:"+ new J3DIVector3(plane.normal).divide(divisor));
  let thit = -( 
    (new J3DIVector3(ray.point).subtract(plane.point)).dot( new J3DIVector3(plane.normal).divide(divisor) )
    );
  
  let phit = new J3DIVector3(ray.point).add(new J3DIVector3(ray.dir).multiply(thit));
  
  let uv3d = new J3DIVector3(plane.point).subtract(phit);
  
  // find parametric representation of plane hit
  if (Math.abs(plane.normal[0])>Math.abs(plane.normal[1]) && Math.abs(plane.normal[0])>Math.abs(plane.normal[2])) {
     // Y-Z plane
     let uv=new J3DIVector3(uv3d[1],uv3d[2],0);   
  } else if (Math.abs(plane.normal[1])>Math.abs(plane.normal[0]) &&Math.abs(plane.normal[1])>Math.abs(plane.normal[2])) {
     // X-Z plane
     let uv=new J3DIVector3(uv3d[0],uv3d[2],0);   
  } else {
     // X-Y plane
     let uv=new J3DIVector3(uv3d[0],uv3d[1],0);   
  }

  return {point:phit,uv:uv,t:t}  
}


// ------------------------------------------
// END Intersection functions



  
// ------------------
// MODULE API    
// ------------------
return {
  sign : sign,
  clamp : clamp,
  rigidLerp : rigidLerp,
  elerp : elerp,
  intersectPlane : intersectPlane,
  intersectBox : intersectBox,
  formatNumber :formatNumber
};
});
