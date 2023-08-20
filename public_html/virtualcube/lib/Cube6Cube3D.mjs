/* @(#)Cube6Cube3D.mjs
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
  log: (false) ? console.log : () => {  },
  info: (true) ? console.info : () => {  },
  warning: (true) ? console.warning : () => {  },
  error: (true) ? console.error : () => {  }
}

/** Constructor
* Creates the 3D geometry of a Rubik's Cube.
*  Subclasses must call initAbstractCube6Cube3D().
*/
class AbstractCube6Cube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super(6,partSize);

    // rotate corner parts into place
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
    //

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
        if (i>=12&&i<24
        || i>=36) {
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

  initEdgeR() {
  return;
    this.initSliceEdgeR(this.edgeR0Obj, this.edgeOffset)
    this.initSliceEdgeR(this.edgeR24Obj, this.edgeOffset+24)
  }

  initEdgeU() {
  return;
    this.initSliceEdgeU(this.edgeU0Obj, this.edgeOffset)
    this.initSliceEdgeU(this.edgeU24Obj, this.edgeOffset+24)
  }
}

    /**
     * Sticker to part map.<br>
     * (the number before the dot indicates the part,
     * the number after the dot indicates the sticker.)
     * <pre>
     *                           +---+---+---+---+---+---+
     *                           |4.0|27 |3.1|15 |39 |2.0|
     *                           +---+---+---+---+---+---+
     *                           |30 |25  79  55  31 |24 |
     *                           +---+               +---+
     *                           |6.0|49   1   7  85 |0.0|
     *                           +---+       u       +---+
     *                           |18 |73  19  13  61 |12 |
     *                           +---+               +---+
     *                           |42 |43  67  91  37 |36 |
     *                           +---+---+---+---+---+---+
     *                           |6.0|33 |9.1|21 |45 |0.0|
     *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
     *   |4.1|30 |6.1|18 |42 |6.2|6.1|33 |9.0|21 |45 |0.2|0.1|36 |12 |0.1|24 |2.2|2.1|39 |15 |3.0|27 |4.2|
     *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
     *   |43 |45  75  51  27 |46 |46 |32  86  62  38 |37 |37 |36  90  66  42 |40 |40 |29  83  59  35 |43 |
     *   +---+               +---+---+               +---+---+               +---+---+               +---+
     *   |19 |69  21  3.1 81 |22 |22 |56  8.3 14  92 |13 |13 |60 12.0 18  72 |16 |16 |53  5.2 11  89 |19 |
     *   +---+       l       +---+---+       f       +---+---+       r       +---+---+       b       +---+
     *   |7.0|93  15   9  57 10.0|10.1 80  2  20  68 |1.1|1.0|84   6   0  48 |4.0|4.1|77  23  17  65 |7.1|
     *   +---+               +---+---+               +---+---+               +---+---+               +---+
     *   |31 |39  63  87  33 |34 |34 |26  50  74  44 |25 |25 |30  54  78  24 |28 |28 |47  71  95  41 |31 |
     *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
     *   |5.2|32 |8.1|20 |44 |7.1|7.2|35 11.1|23 |47 |1.1|1.2|38 |14 |2.1|26 |3.1|3.2|41 |17 |5.0|29 |5.1|
     *   +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
     *                           |7.0|35 11.1|23 |47 |1.0|
     *                           +---+---+---+---+---+---+
     *                           |44 |46  76  52  28 |38 |
     *                           +---+               +---+
     *                           |20 |70  22   4  82 |14 |
     *                           +---+       d       +---+
     *                           |8.0|94  16  10  58 |2.0|
     *                           +---+               +---+
     *                           |32 |40  64  88  34 |26 |
     *                           +---+---+---+---+---+---+
     *                           |5.0|29 |5.1|17 |41 |3.0|
     *                           +---+---+---+---+---+---+
     * </pre>
     */
AbstractCube6Cube3D.prototype.stickerToPartMap = [
        0, 36 + 8, 12 + 8, 0 + 8, 24 + 8, 2, //
        37 + 8, 36 + 56, 90 + 56, 66 + 56, 42 + 56, 40 + 8,//
        13 + 8, 60 + 56, 12 + 56, 18 + 56, 72 + 56, 16 + 8,//
        1 + 8, 84 + 56, 6 + 56, 0 + 56, 48 + 56, 4 + 8,//
        25 + 8, 30 + 56, 54 + 56, 78 + 56, 24 + 56, 28 + 8,//
        1, 38 + 8, 14 + 8, 2 + 8, 26 + 8, 3, // right
        //
        4, 27 + 8, 3 + 8, 15 + 8, 39 + 8, 2,//
        30 + 8, 25 + 56, 79 + 56, 55 + 56, 31 + 56, 24 + 8, //
        6 + 8, 49 + 56, 1 + 56, 7 + 56, 85 + 56, 0 + 8, //
        18 + 8, 73 + 56, 19 + 56, 13 + 56, 61 + 56, 12 + 8, //
        42 + 8, 43 + 56, 67 + 56, 91 + 56, 37 + 56, 36 + 8, //
        6, 33 + 8, 9 + 8, 21 + 8, 45 + 8, 0, // up
        //
        6, 33 + 8, 9 + 8, 21 + 8, 45 + 8, 0, //
        46 + 8, 32 + 56, 86 + 56, 62 + 56, 38 + 56, 37 + 8,//
        22 + 8, 56 + 56, 8 + 56, 14 + 56, 92 + 56, 13 + 8, //
        10 + 8, 80 + 56, 2 + 56, 20 + 56, 68 + 56, 1 + 8,//
        34 + 8, 26 + 56, 50 + 56, 74 + 56, 44 + 56, 25 + 8, //
        7, 35 + 8, 11 + 8, 23 + 8, 47 + 8, 1, // front
        //
        4, 30 + 8, 6 + 8, 18 + 8, 42 + 8, 6,//
        43 + 8, 45 + 56, 75 + 56, 51 + 56, 27 + 56, 46 + 8,//
        19 + 8, 69 + 56, 21 + 56, 3 + 56, 81 + 56, 22 + 8,//
        7 + 8, 93 + 56, 15 + 56, 9 + 56, 57 + 56, 10 + 8, //
        31 + 8, 39 + 56, 63 + 56, 87 + 56, 33 + 56, 34 + 8,//
        5, 32 + 8, 8 + 8, 20 + 8, 44 + 8, 7, // left
        //
        7, 35 + 8, 11 + 8, 23 + 8, 47 + 8, 1, //
        44 + 8, 46 + 56, 76 + 56, 52 + 56, 28 + 56, 38 + 8,//
        20 + 8, 70 + 56, 22 + 56, 4 + 56, 82 + 56, 14 + 8, //
        8 + 8, 94 + 56, 16 + 56, 10 + 56, 58 + 56, 2 + 8, //
        32 + 8, 40 + 56, 64 + 56, 88 + 56, 34 + 56, 26 + 8, //
        5, 29 + 8, 5 + 8, 17 + 8, 41 + 8, 3, // down
        //
        2, 39 + 8, 15 + 8, 3 + 8, 27 + 8, 4, //
        40 + 8, 29 + 56, 83 + 56, 59 + 56, 35 + 56, 43 + 8,//
        16 + 8, 53 + 56, 5 + 56, 11 + 56, 89 + 56, 19 + 8,//
        4 + 8, 77 + 56, 23 + 56, 17 + 56, 65 + 56, 7 + 8, //
        28 + 8, 47 + 56, 71 + 56, 95 + 56, 41 + 56, 31 + 8,//
        3, 41 + 8, 17 + 8, 5 + 8, 29 + 8, 5 // back
];

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part.
 * This map is filled in by the init method!!
 */
AbstractCube6Cube3D.prototype.partToStickerMap = null;

AbstractCube6Cube3D.prototype.stickerToFaceMap = [
    1, 1, 1, 1, 1, 2,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 2, 1, 1, 1, 1, 1, // right
    0, 1, 1, 1, 1, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 1, 1, 1, 1, 0, // up
    1, 0, 0, 0, 0, 2,/**/ 1, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 1,/**/ 2, 0, 0, 0, 0, 1, // front
    1, 1, 1, 1, 1, 2,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 2, 1, 1, 1, 1, 1, // left
    0, 1, 1, 1, 1, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0, 0,/**/ 0, 1, 1, 1, 1, 0, // down
    1, 0, 0, 0, 0, 2,/**/ 1, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 0, 1,/**/ 2, 0, 0, 0, 0, 1, // back
];

AbstractCube6Cube3D.prototype.boxClickToLocationMap = [
  [[7, 10 + 8, 6], [8 + 8, 3 + 8 + 12, 6 + 8], [5, 7 + 8, 4]], // left
  [[7, 8 + 8, 5], [11 + 8, 4 + 8 + 12, 5 + 8], [1, 2 + 8, 3]], // down
  [[7, 10 + 8, 6], [11 + 8, 2 + 8 + 12, 9 + 8], [1, 1 + 8, 0]], // front
  [[1, 1 + 8, 0], [2 + 8, 0 + 8 + 12, 0 + 8], [3, 4 + 8, 2]], // right
  [[6, 6 + 8, 4], [9 + 8, 1 + 8 + 12, 3 + 8], [0, 0 + 8, 2]], // up
  [[5, 7 + 8, 4], [5 + 8, 5 + 8 + 12, 3 + 8], [3, 4 + 8, 2]], // back
];
AbstractCube6Cube3D.prototype.boxClickToAxisMap = [
  [[0, 1, 0], [2, 0, 2], [0, 1, 0]], // left
  [[1, 2, 1], [0, 1, 0], [1, 2, 1]], // down
  [[2, 1, 2], [0, 2, 0], [2, 1, 2]], // front
  [[0, 1, 0], [2, 0, 2], [0, 1, 0]], // right
  [[1, 2, 1], [0, 1, 0], [1, 2, 1]], // up
  [[2, 1, 2], [0, 2, 0], [2, 1, 2]], // back
];
AbstractCube6Cube3D.prototype.boxClickToAngleMap = [
  [[-1, -1, -1], [-1, -1, 1], [-1, 1, -1]],
  [[-1, 1, -1], [1, -1, -1], [-1, -1, -1]],
  [[1, 1, 1], [-1, 1, 1], [1, -1, 1]],
  [[1, 1, 1], [1, 1, -1], [1, -1, 1]],
  [[1, -1, 1], [-1, 1, 1], [1, 1, 1]],
  [[-1, -1, -1], [1, -1, -1], [-1, 1, -1]],
];
AbstractCube6Cube3D.prototype.boxClickToLayerMap = [
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
];
AbstractCube6Cube3D.prototype.boxSwipeToAxisMap = [
  [1, 2, 1, 2], // left
  [2, 0, 2, 0], // down
  [1, 0, 1, 0], // front
  [1, 2, 1, 2], // right
  [2, 0, 2, 0], // up
  [1, 0, 1, 0], // back
];
AbstractCube6Cube3D.prototype.boxSwipeToAngleMap = [
  [-1, -1, 1, 1], // left
  [1, 1, -1, -1], // down
  [1, -1, -1, 1], // front
  [1, 1, -1, -1], // right
  [-1, -1, 1, 1], // up
  [-1, 1, 1, -1], // back
];
AbstractCube6Cube3D.prototype.boxSwipeToLayerMap = [
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
 *        +-----+
 * 0      |     |
 * 1      |  U  |
 * 2      |     |
 *  +-----+-----+-----+
 * 3|     |     |     |
 * 4|  L  |  F  |  R  |
 * 5|     |     |     |
 *  +-----+-----+-----+
 * 6      |     |     |
 * 7      |  D  |  B  |
 * 8      |     |     |
 *        +-----+-----+
 * </pre>
 */
AbstractCube6Cube3D.prototype.stickerOffsets = [
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
class Cube6Cube3D extends AbstractCube6Cube3D {
  /** Constructor
   * Creates the 3D geometry of a "Rubik's Cube".
   * You must call loadGeometry() after constructing a new instance.
   */
  constructor() {
    super(11);
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
  case 0: partSize=10; relativeUrl = 'models/cube6-0.obj'; break;
  case 1: partSize=10; relativeUrl = 'models/cube6-0.obj'; break;
  case 2: partSize=10; relativeUrl = 'models/cube6-0.obj'; break;
  default: partSize=10; relativeUrl = 'models/cube6-0.obj'; break;
  }
  const c = new Cube6Cube3D(partSize);
  c.baseUrl = 'lib/';
  c.relativeUrl = relativeUrl;
  return c;
}
// ------------------
// MODULE API
// ------------------
export default {
  AbstractCube6Cube3D: AbstractCube6Cube3D,
  createCube3D: createCube3D,
};

