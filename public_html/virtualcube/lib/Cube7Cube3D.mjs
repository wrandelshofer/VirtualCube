/* @(#)Cube7Cube3D.mjs
 * Copyright (c) 2023 Werner Randelshofer, Switzerland. MIT License.
 */

import Cube3D from './Cube3D.mjs';
import Cube from './Cube.mjs';
import CubeAttributes from './CubeAttributes.mjs';
import SplineInterpolator from './SplineInterpolator.mjs';
import J3DI from './J3DI.mjs';
import J3DIMath from './J3DIMath.mjs';
import Node3D from './Node3D.mjs';


let module = {
  log: (false) ? console.log : () => {
  },
  info: (true) ? console.info : () => {
  },
  warning: (true) ? console.warning : () => {
  },
  error: (true) ? console.error : () => {
  }
}

/** Constructor
 * Creates the 3D geometry of a Rubik's Cube.
 *  Subclasses must call initAbstractCube7Cube3D().
 */
class AbstractCube7Cube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super(7,partSize);


    // Rotate the corner parts into place
    let o = this.cornerOffset;

    // 0:urf
    //--no transformation---
    // 1:dfr
    this.identityPartLocations[o + 1].rotateZ(180);
    this.identityPartLocations[o + 1].rotateY(90);
    // 2:ubr
    this.identityPartLocations[o + 2].rotateY(270);
    // 3:drb
    this.identityPartLocations[o + 3].rotateZ(180);
    this.identityPartLocations[o + 3].rotateY(180);
    // 4:ulb
    this.identityPartLocations[o + 4].rotateY(180);
    // 5:dbl
    this.identityPartLocations[o + 5].rotateX(180);
    this.identityPartLocations[o + 5].rotateY(90);
    // 6:ufl
    this.identityPartLocations[o + 6].rotateY(90);
    // 7:dlf
    this.identityPartLocations[o + 7].rotateZ(180);

    // Rotate edge parts into place
    let m = new J3DIMath.J3DIMatrix4();
    o = this.edgeOffset;
    for (let i = 0; i < this.edgeCount; i++) {
      switch ( i % 12) {
      case 0:
        // ur
        //--no transformation--
        break;
      case 1:
        // rf
        this.identityPartLocations[o + i].rotateZ(-90);
        this.identityPartLocations[o + i].rotateY(90);
        break;
      case 2:
        // dr
        this.identityPartLocations[o + i].rotateX(180);
        break;
      case 3:
        // bu
        this.identityPartLocations[o + i].rotateZ(90);
        this.identityPartLocations[o + i].rotateX(90);
        break;
      case 4:
        // rb
        this.identityPartLocations[o + i].rotateZ(-90);
        this.identityPartLocations[o + i].rotateY(-90);
        break;
      case 5:
        // bd
        this.identityPartLocations[o + i].rotateX(90);
        this.identityPartLocations[o + i].rotateY(-90);
        break;
      case 6:
        // ul
        this.identityPartLocations[o + i].rotateY(180);
        break;
      case 7:
        // lb
        this.identityPartLocations[o + i].rotateZ(90);
        this.identityPartLocations[o + i].rotateY(-90);
        break;
      case 8:
        // dl
        this.identityPartLocations[o + i].rotateY(180);
        this.identityPartLocations[o + i].rotateX(180);
        break;
      case 9:
        // fu
        this.identityPartLocations[o + i].rotateX(-90);
        this.identityPartLocations[o + i].rotateY(-90);
        break;
      case 10:
        // lf
        this.identityPartLocations[o + i].rotateY(90);
        this.identityPartLocations[o + i].rotateX(-90);
        break;
      case 11:
        // fd
        this.identityPartLocations[o + i].rotateZ(-90);
        this.identityPartLocations[o + i].rotateX(-90);
        break;
      }

      // Shift edge parts into place
      switch (i-12) {
      case 2 :
      case 3 :
      case 4 :
      case 6 :
      case 10 :
      case 11 :
      case 12 :
      case 13 :
      case 17 :
      case 19 :
      case 20 :
      case 21 :
        break;
      default:
        if (i>=12) {
            this.identityPartLocations[o + i].rotateX(180);
            this.identityPartLocations[o + i].rotateZ(-90);
        }
        break;
      }
    }

    // Rotate side parts into place
    o = this.sideOffset;
    for (let i=0;i<this.sideCount;i++) {
      switch (i % 6) {
      case 0:
        // r
        break;
      case 1:
        // u
        this.identityPartLocations[o + i].rotate(90, 0, 0, 1);
        this.identityPartLocations[o + i].rotate(-90, 1, 0, 0);
        break;
      case 2:
        // f
        this.identityPartLocations[o + i].rotate(90, 0, 1, 0);
        this.identityPartLocations[o + i].rotate(90, 1, 0, 0);
      break;
      case 3:
        // l
        this.identityPartLocations[o + i].rotate(180, 0, 1, 0);
        this.identityPartLocations[o + i].rotate(-90, 1, 0, 0);
      break;
      case 4:
        // d
        this.identityPartLocations[o + i].rotate(90, 0, 0, -1);
        this.identityPartLocations[o + i].rotate(180, 1, 0, 0);
      break;
      case 5:
        // b
        this.identityPartLocations[o + i].rotate(90, 0, -1, 0);
        this.identityPartLocations[o + i].rotate(180, 1, 0, 0);
        break;
      }
    }

    for (let i = 0; i < this.sideCount; i++) {
      switch (Math.floor(i/6)) {
      case 0:
      case 1:
      case 2:
        break;
      case 3:
      case 4:
        this.identityPartLocations[o + i].rotateX(90);
        break;
      case 5:
      case 6:
        this.identityPartLocations[o + i].rotateX(180);
        break;
      case 7:
      case 8:
        this.identityPartLocations[o + i].rotateX(270);
        break;
      }
    }
  }

  doValidateAttributes() {
    let a = this.attributes;
    for (let i = 0; i < this.stickerObjs.length; i++) {
      this.stickerObjs[i].hasTexture = a.stickersImageURL != null;
    }
    for (let i = 0; i < a.getPartCount(); i++) {
      this.parts[i].visible = a.isPartVisible(i);
    }
  }

  getPartIndexForStickerIndex(stickerIndex) {
    return this.stickerToPartMap[stickerIndex];
  }

  getPartOrientationForStickerIndex(stickerIndex) {
    return this.stickerToFaceMap[stickerIndex];
  }
  getStickerIndexForPartIndex(partIndex, orientation) {
    return this.partToStickerMap[partIndex][orientation];
  }
/*
  validateTwist(partIndices, locations, orientations, partCount, axis, angle, alpha) {
    let rotation = this.updateTwistRotation;
    rotation.makeIdentity();
    let rad = (90 * angle * (1 - alpha));
    switch (axis) {
      case 0:
        rotation.rotate(rad, -1, 0, 0);
        break;
      case 1:
        rotation.rotate(rad, 0, -1, 0);
        break;
      case 2:
        rotation.rotate(rad, 0, 0, 1);
        break;
    }

    let orientationMatrix = this.updateTwistOrientation;
    for (let i = 0; i < partCount; i++) {
      orientationMatrix.makeIdentity();
      if (partIndices[i] < this.edgeOffset) { //=> part is a corner
        // Base location of a corner part is urf. (= corner part 0)
        switch (orientations[i]) {
          case 0:
            break;
          case 1:
            orientationMatrix.rotate(90, 0, 0, 1);
            orientationMatrix.rotate(90, -1, 0, 0);
            break;
          case 2:
            orientationMatrix.rotate(90, 0, 0, -1);
            orientationMatrix.rotate(90, 0, 1, 0);
            break;
        }
      } else if (partIndices[i] < this.sideOffset) { //=> part is an edge
        orientationMatrix.makeIdentity();
        if (orientations[i] == 1) {
          // Base location of an edge part is ur. (= edge part 0)
          orientationMatrix.rotate(90, 0, 0, 1);
          orientationMatrix.rotate(180, 1, 0, 0);
        }
      } else if (partIndices[i] < this.centerOffset) {//=> part is a side
        if (orientations[i] > 0) {
          // Base location of a side part is r. (= side part 0)
          orientationMatrix.rotate(90 * orientations[i], -1, 0, 0);
        }
      }
      this.partOrientations[partIndices[i]].matrix.load(orientationMatrix);
      let transform = this.partLocations[partIndices[i]].matrix;
      transform.load(rotation);
      transform.multiply(this.identityPartLocations[locations[i]]);
    }
  }

  cubeTwisted(evt) {
    if (this.repainter == null) {
      this.updateCube();
      return;
    }

    let layerMask = evt.layerMask;
    let axis = evt.axis;
    let angle = evt.angle;
    let model = this.cube;

    let partIndices = new Array(27);
    let locations = new Array(27);
    let orientations = new Array(27);
    let count = 0;

    let affectedParts = evt.getAffectedLocations();
    if ((layerMask & 2) != 0) {
      count = affectedParts.length + 1;
      locations = affectedParts.slice(0, count);
      locations[count - 1] = this.centerOffset;
    } else {
      count = affectedParts.length;
      locations = affectedParts.slice(0, count);
    }
    for (let i = 0; i < count; i++) {
      partIndices[i] = model.getPartAt(locations[i]);
      orientations[i] = model.getPartOrientation(partIndices[i]);
    }

    let finalCount = count;
    let self = this;
    let interpolator = new SplineInterpolator.SplineInterpolator(0, 0, 1, 1);
    let start = new Date().getTime();
    let duration = this.attributes.getTwistDuration() * Math.abs(angle);
    let token=new Object();
    this.isTwisting = token;
    let f = function () {
      if (self.isTwisting!==token) {
        // Twisting was aborted. Complete this twisting animation.
        self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, 1.0);
        return;
      }
      let now = new Date().getTime();
      let elapsed = now - start;
      let value = elapsed / duration;
      if (value < 1) {
        self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, interpolator.getFraction(value));
        self.repainter.repaint(f);
      } else {
        self.validateTwist(partIndices, locations, orientations, finalCount, axis, angle, 1.0);
        self.isTwisting = null;
      }
    };
    if (this.repainter != null) {
      this.repainter.repaint(f);
    }
  }

  /* Immediately completes the current twisting animation. * /
   finishTwisting() {
     this.isTwisting=null;
   }*/

}

/**
 * The numbers show the part indices. The stickers are numbered from top
 * left to bottom right on each face. The sequence of the faces is right,
 * up, front, left, down, back.
 * <pre>
 *                               +---+---+---+---+---+---+---+
 *                               |4.0|39 |15 |3.1|27 |51 |2.0|
 *                               +---+---+---+---+---+---+---+
 *                               |42 |55  133 85  109 61 |36 |
 *                               +---+                   +---+
 *                               |18 |103  7  37  13  139|12 |
 *                               +---+                   +---+
 *                               |6.0|79  31  1.2 43  91 |0.0|
 *                               +---+                   +---+
 *                               |30 |127 25  49  19  115|24 |
 *                               +---+                   +---+
 *                               |54 |73  121 97  145 67 |48 |
 *                               +---+---+---+---+---+---+---+
 *                               |6.0|45 |21 |9.1|33 |57 |0.0|
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   | 4 |42 |18 |6.1|30 |54 | 6 | 6 |45 |21 |9.0|33 |57 | 0 | 0 |48 |24 |0.1|12 |36 | 2 | 2 |51 |27 |3.0|15 |39 | 4 |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   |55 |75  129 81  105 57 |58 |58 |62  140 92  116 68 |49 |49 |66  144 96  120 72 |52 |52 |59  137 89  113 65 |55 |
 *   +---+                   +---+---+                   +---+---+                   +---+---+                   +---+
 *   |31 |123  27  33   9 135|34 |34 |110 14  44  20  146|25 |25 |114 18  48  24  126|28 |28 |107 11  41  17  143|31 |
 *   +---+                   +---+---+                   +---+---+                   +---+---+                   +---+
 *   |7.0|99  51  3.1 39  87 10.0|10.1 86  38 2.3 50  98 |1.1|1.0|90  42  0.0 30  78 |4.0|4.1|83  35  5.2 47  95 |7.1|
 *   +---+                   +---+---+                   +---+---+                   +---+---+                   +---+
 *   |19 |147 21  45  15  111|22 |22 |134  8  32  26  122|13 |13 |138 12  36   6  102|16 |16 |131 29  53  23  119|19 |
 *   +---+                   +---+---+                   +---+---+                   +---+---+                   +---+
 *   |43 |69  117 93  141 63 |46 |46 |56  104 80  128 74 |37 |37 |60  108 84  132 54 |40 |40 |77  125 101 149 71 |43 |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *   | 5 |44 |20 |8.1|32 |56 | 7 | 7 |47 |23 11.0|35 |59 | 1 | 1 |50 |26 |2.1|14 |38 | 3 | 3 |53 |29 |5.0| 17|41 | 5 |
 *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                               |7.0|47 |23 11.1|35 |59 |1.0|
 *                               +---+---+---+---+---+---+---+
 *                               |56 |76  130 82  106 58 |50 |
 *                               +---+                   +---+
 *                               |32 |124 28  34  10  136|26 |
 *                               +---+                   +---+
 *                               |8.0|100 52  4.1 40  88 |2.0|
 *                               +---+                   +---+
 *                               |20 |148 22  46  16  112|14 |
 *                               +---+                   +---+
 *                               |44 |70  118 94  142 64 |38 |
 *                               +---+---+---+---+---+---+---+
 *                               |5.0|41 |17 |5.1|29 |53 |3.0|
 *                               +---+---+---+---+---+---+---+
 * </pre>
 */
AbstractCube7Cube3D.prototype.stickerToPartMap = [
  0, 48 + 8, 24 + 8, 0 + 8, 12 + 8, 36 + 8, 2, //
  49 + 8, 66 + 68, 144 + 68, 96 + 68, 120 + 68, 72 + 68, 52 + 8, //
  25 + 8, 114 + 68, 18 + 68, 48 + 68, 24 + 68, 126 + 68, 28 + 8,//
  1 + 8, 90 + 68, 42 + 68, 0 + 68, 30 + 68, 78 + 68, 4 + 8, //
  13 + 8, 138 + 68, 12 + 68, 36 + 68, 6 + 68, 102 + 68, 16 + 8,//
  37 + 8, 60 + 68, 108 + 68, 84 + 68, 132 + 68, 54 + 68, 40 + 8,//
  1, 50 + 8, 26 + 8, 2 + 8, 14 + 8, 38 + 8, 3, // right
  //
  4, 39 + 8, 15 + 8, 3 + 8, 27 + 8, 51 + 8, 2, //
  42 + 8, 55 + 68, 133 + 68, 85 + 68, 109 + 68, 61 + 68, 36 + 8, //
  18 + 8, 103 + 68, 7 + 68, 37 + 68, 13 + 68, 139 + 68, 12 + 8, //
  6 + 8, 79 + 68, 31 + 68, 1 + 68, 43 + 68, 91 + 68, 0 + 8,//
  30 + 8, 127 + 68, 25 + 68, 49 + 68, 19 + 68, 115 + 68, 24 + 8,//
  54 + 8, 73 + 68, 121 + 68, 97 + 68, 145 + 68, 67 + 68, 48 + 8,
  6, 45 + 8, 21 + 8, 9 + 8, 33 + 8, 57 + 8, 0, // up
  //
  6, 45 + 8, 21 + 8, 9 + 8, 33 + 8, 57 + 8, 0,//
  58 + 8, 62 + 68, 140 + 68, 92 + 68, 116 + 68, 68 + 68, 49 + 8, //
  34 + 8, 110 + 68, 14 + 68, 44 + 68, 20 + 68, 146 + 68, 25 + 8,//
  10 + 8, 86 + 68, 38 + 68, 2 + 68, 50 + 68, 98 + 68, 1 + 8,//
  22 + 8, 134 + 68, 8 + 68, 32 + 68, 26 + 68, 122 + 68, 13 + 8,//
  46 + 8, 56 + 68, 104 + 68, 80 + 68, 128 + 68, 74 + 68, 37 + 8,//
  7, 47 + 8, 23 + 8, 11 + 8, 35 + 8, 59 + 8, 1, // front
  //
  4, 42 + 8, 18 + 8, 6 + 8, 30 + 8, 54 + 8, 6, //
  55 + 8, 75 + 68, 129 + 68, 81 + 68, 105 + 68, 57 + 68, 58 + 8,//
  31 + 8, 123 + 68, 27 + 68, 33 + 68, 9 + 68, 135 + 68, 34 + 8,//
  7 + 8, 99 + 68, 51 + 68, 3 + 68, 39 + 68, 87 + 68, 10 + 8,//
  19 + 8, 147 + 68, 21 + 68, 45 + 68, 15 + 68, 111 + 68, 22 + 8,//
  43 + 8, 69 + 68, 117 + 68, 93 + 68, 141 + 68, 63 + 68, 46 + 8,
  5, 44 + 8, 20 + 8, 8 + 8, 32 + 8, 56 + 8, 7, // left
  //
  7, 47 + 8, 23 + 8, 11 + 8, 35 + 8, 59 + 8, 1,//
  56 + 8, 76 + 68, 130 + 68, 82 + 68, 106 + 68, 58 + 68, 50 + 8,
  32 + 8, 124 + 68, 28 + 68, 34 + 68, 10 + 68, 136 + 68, 26 + 8,//
  8 + 8, 100 + 68, 52 + 68, 4 + 68, 40 + 68, 88 + 68, 2 + 8,//
  20 + 8, 148 + 68, 22 + 68, 46 + 68, 16 + 68, 112 + 68, 14 + 8,//
  44 + 8, 70 + 68, 118 + 68, 94 + 68, 142 + 68, 64 + 68, 38 + 8,
  5, 41 + 8, 17 + 8, 5 + 8, 29 + 8, 53 + 8, 3, // down
  //
  2, 51 + 8, 27 + 8, 3 + 8, 15 + 8, 39 + 8, 4,//
  52 + 8, 59 + 68, 137 + 68, 89 + 68, 113 + 68, 65 + 68, 55 + 8,
  28 + 8, 107 + 68, 11 + 68, 41 + 68, 17 + 68, 143 + 68, 31 + 8,//
  4 + 8, 83 + 68, 35 + 68, 5 + 68, 47 + 68, 95 + 68, 7 + 8,//
  16 + 8, 131 + 68, 29 + 68, 53 + 68, 23 + 68, 119 + 68, 19 + 8,//
  40 + 8, 77 + 68, 125 + 68, 101 + 68, 149 + 68, 71 + 68, 43 + 8,
  3, 53 + 8, 29 + 8, 5 + 8, 17 + 8, 41 + 8, 5, // back
];

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part.
 * This map is filled in by the init method!!
 */
AbstractCube7Cube3D.prototype.partToStickerMap = null;

AbstractCube7Cube3D.prototype.stickerToFaceMap = [
    1, 1, 1, 1, 1, 1, 2,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 2, 1, 1, 1, 1, 1, 1, // right
    0, 1, 1, 1, 1, 1, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 1, 1, 1, 1, 1, 0, // up
    1, 0, 0, 0, 0, 0, 2,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 2, 0, 0, 0, 0, 0, 1, // front
    1, 1, 1, 1, 1, 1, 2,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 2, 1, 1, 1, 1, 1, 1, // left
    0, 1, 1, 1, 1, 1, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0, 0,/**/ 0, 1, 1, 1, 1, 1, 0, // down
    1, 0, 0, 0, 0, 0, 2,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 0, 1,/**/ 2, 0, 0, 0, 0, 0, 1, // back
];

AbstractCube7Cube3D.prototype.boxClickToLocationMap = [
  [[7, 10 + 8, 6], [8 + 8, 3 + 8 + 12, 6 + 8], [5, 7 + 8, 4]], // left
  [[7, 8 + 8, 5], [11 + 8, 4 + 8 + 12, 5 + 8], [1, 2 + 8, 3]], // down
  [[7, 10 + 8, 6], [11 + 8, 2 + 8 + 12, 9 + 8], [1, 1 + 8, 0]], // front
  [[1, 1 + 8, 0], [2 + 8, 0 + 8 + 12, 0 + 8], [3, 4 + 8, 2]], // right
  [[6, 6 + 8, 4], [9 + 8, 1 + 8 + 12, 3 + 8], [0, 0 + 8, 2]], // up
  [[5, 7 + 8, 4], [5 + 8, 5 + 8 + 12, 3 + 8], [3, 4 + 8, 2]], // back
];
AbstractCube7Cube3D.prototype.boxClickToAxisMap = [
  [[0, 1, 0], [2, 0, 2], [0, 1, 0]], // left
  [[1, 2, 1], [0, 1, 0], [1, 2, 1]], // down
  [[2, 1, 2], [0, 2, 0], [2, 1, 2]], // front
  [[0, 1, 0], [2, 0, 2], [0, 1, 0]], // right
  [[1, 2, 1], [0, 1, 0], [1, 2, 1]], // up
  [[2, 1, 2], [0, 2, 0], [2, 1, 2]], // back
];
AbstractCube7Cube3D.prototype.boxClickToAngleMap = [
  [[-1, -1, -1], [-1, -1, 1], [-1, 1, -1]],
  [[-1, 1, -1], [1, -1, -1], [-1, -1, -1]],
  [[1, 1, 1], [-1, 1, 1], [1, -1, 1]],
  [[1, 1, 1], [1, 1, -1], [1, -1, 1]],
  [[1, -1, 1], [-1, 1, 1], [1, 1, 1]],
  [[-1, -1, -1], [1, -1, -1], [-1, 1, -1]],
];
AbstractCube7Cube3D.prototype.boxClickToLayerMap = [
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
];
AbstractCube7Cube3D.prototype.boxSwipeToAxisMap = [
  [1, 2, 1, 2], // left
  [2, 0, 2, 0], // down
  [1, 0, 1, 0], // front
  [1, 2, 1, 2], // right
  [2, 0, 2, 0], // up
  [1, 0, 1, 0], // back
];
AbstractCube7Cube3D.prototype.boxSwipeToAngleMap = [
  [-1, -1, 1, 1], // left
  [1, 1, -1, -1], // down
  [1, -1, -1, 1], // front
  [1, 1, -1, -1], // right
  [-1, -1, 1, 1], // up
  [-1, 1, 1, -1], // back
];
AbstractCube7Cube3D.prototype.boxSwipeToLayerMap = [
  [[[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]], [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]], [[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]]], // left
  [[[4, 1, 4, 1], [2, 1, 2, 1], [1, 1, 1, 1]], [[4, 2, 4, 2], [2, 2, 2, 2], [1, 2, 1, 2]], [[4, 4, 4, 4], [2, 4, 2, 4], [1, 4, 1, 4]]], // down
  [[[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]], [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]], [[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]]], // front
  [[[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]], [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]], [[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]]], // right
  [[[4, 1, 4, 1], [2, 1, 2, 1], [1, 1, 1, 1]], [[4, 2, 4, 2], [2, 2, 2, 2], [1, 2, 1, 2]], [[4, 4, 4, 4], [2, 4, 2, 4], [1, 4, 1, 4]]], // up
  [[[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]], [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]], [[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]]], // back
];
/**
 * The following properties may have different values depending on
 * the 3D model being used.
 * <pre>
 *   0 1 2 3 4 5 6 7 8
 *    +-----+
 * 0    |   |
 * 1    |  U  |
 * 2    |   |
 *  +-----+-----+-----+
 * 3|   |   |   |
 * 4|  L  |  F  |  R  |
 * 5|   |   |   |
 *  +-----+-----+-----+
 * 6    |   |   |
 * 7    |  D  |  B  |
 * 8    |   |   |
 *    +-----+-----+
 * </pre>
 */
AbstractCube7Cube3D.prototype.stickerOffsets = [
  6, 3, 7, 3, 8, 3, //right
  6, 4, 7, 4, 8, 4,
  6, 5, 7, 5, 8, 5,

  3, 0, 4, 0, 5, 0, //up
  3, 1, 4, 1, 5, 1, //
  3, 2, 4, 2, 5, 2,

  3, 3, 4, 3, 5, 3, //front
  3, 4, 4, 4, 5, 4,
  3, 5, 4, 5, 5, 5,

  0, 3, 1, 3, 2, 3, //left
  0, 4, 1, 4, 2, 4,
  0, 5, 1, 5, 2, 5,

  3, 6, 4, 6, 5, 6, //down
  3, 7, 4, 7, 5, 7,
  3, 8, 4, 8, 5, 8,

  6, 6, 7, 6, 8, 6, //back
  6, 7, 7, 7, 8, 7,
  6, 8, 7, 8, 8, 8
];
// ------------------
class Cube7Cube3D extends AbstractCube7Cube3D {
  /** Constructor
   * Creates the 3D geometry of a "Rubik's Cube".
   * You must call loadGeometry() after constructing a new instance.
   */
  constructor() {
    super(10);
  }

  getModelUrl() {
    return this.baseUrl + '/' + this.relativeUrl;
  }
}

// ------------------
function createCube3D(levelOfDetail) {
  let partSize;
  let relativeUrl;
  switch (levelOfDetail) {
  case 0: partSize=10; relativeUrl = 'models/cube7-0.obj'; break;
  case 1: partSize=10; relativeUrl = 'models/cube7-0.obj'; break;
  case 2: partSize=10; relativeUrl = 'models/cube7-0.obj'; break;
  default: partSize=10; relativeUrl = 'models/cube7-0.obj'; break;
  }
  const c = new Cube7Cube3D(partSize);
  c.baseUrl = 'lib/';
  c.relativeUrl = relativeUrl;
  return c;
}
// ------------------
// MODULE API
// ------------------
export default {
  AbstractCube7Cube3D: AbstractCube7Cube3D,
  createCube3D: createCube3D,
};

