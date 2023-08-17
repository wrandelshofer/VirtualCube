/* @(#)Cube5Cube3D.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
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
 *  Subclasses must call initAbstractCube5Cube3D().
 */
class AbstractCube5Cube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super(5,partSize);

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

  getPartIndexForStickerIndex(stickerIndex) {
    return this.stickerToPartMap[stickerIndex];
  }

  getPartOrientationForStickerIndex(stickerIndex) {
    return this.stickerToFaceMap[stickerIndex];
  }
  getStickerIndexForPartIndex(partIndex, orientation) {
    return this.partToStickerMap[partIndex][orientation];
  }

  initEdgeR() {
    this.initMiddleEdgeR();
    this.initSliceEdgeR(this.edgeR12Obj, this.edgeOffset+12)
  }

  initEdgeU() {
    this.initMiddleEdgeU();
    this.initSliceEdgeU(this.edgeU12Obj, this.edgeOffset+12)
  }
}

/**
 * Maps stickers to cube parts.
 * <p>
 * The numbers show the part indices. The stickers are numbered from top
 * left to bottom right on each face. The sequence of the faces is right,
 * up, front, left, down, back.
 * <pre>
 *                     +---+---+---+---+---+
 *                     | 4 |23 |11 |35 | 2 |
 *                     +---+---+---+---+---+
 *                     |26 |51  81  57 |20 |
 *                     +---+           +---+
 *                     |14 |75  45  87 | 8 |
 *                     +---+           +---+
 *                     |38 |69  93  63 |32 |
 *                     +---+---+---+---+---+
 *                     | 6 |29 |17 |41 | 0 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * | 4 |26 |14 |38 | 6 | 6 |29 |17 |41 | 0 | 0 |32 | 8 |20 | 2 | 2 |35 |11 |23 | 4 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * |39 |71  77  53 |42 |42 |58  88  64 |33 |33 |62  92  68 |36 |36 |55  85  61 |39 |
 * +---+           +---+---+           +---+---+           +---+---+           +---+
 * |15 |95  47  83 |18 |18 |82  46  94 | 9 | 9 |86  44  74 |12 |12 |79  49  91 |15 |
 * +---+           +---+---+           +---+---+           +---+---+           +---+
 * |27 |65  89  59 |30 |30 |52  76  70 |21 |21 |56  80  50 |24 |24 |73  97  67 |27 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * | 5 |28 |16 |40 | 7 | 7 |31 |19 |43 | 1 | 1 |34 |10 |22 | 3 | 3 |37 |13 |25 | 5 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                     | 7 |31 |19 |43 | 1 |
 *                     +---+---+---+---+---+
 *                     |40 |72  78  54 |34 |
 *                     +---+           +---+
 *                     |16 |96  48  84 |10 |
 *                     +---+           +---+
 *                     |28 |66  90  60 |22 |
 *                     +---+---+---+---+---+
 *                     | 5 |25 |13 |37 | 3 |
 *                     +---+---+---+---+---+
 * </pre>
 */
AbstractCube5Cube3D.prototype.stickerToPartMap = [
    0, 32, 8, 20, 2,/**/ 33, 62, 92, 68, 36,/**/ 9, 86, 44, 74, 12,/**/ 21, 56, 80, 50, 24,/**/ 1, 34, 10, 22, 3, // right
    4, 23, 11, 35, 2,/**/ 26, 51, 81, 57, 20,/**/ 14, 75, 45, 87, 8,/**/ 38, 69, 93, 63, 32,/**/ 6, 29, 17, 41, 0, // up
    6, 29, 17, 41, 0,/**/ 42, 58, 88, 64, 33,/**/ 18, 82, 46, 94, 9,/**/ 30, 52, 76, 70, 21,/**/ 7, 31, 19, 43, 1, // front
    4, 26, 14, 38, 6,/**/ 39, 71, 77, 53, 42,/**/ 15, 95, 47, 83, 18,/**/ 27, 65, 89, 59, 30,/**/ 5, 28, 16, 40, 7, // left
    7, 31, 19, 43, 1,/**/ 40, 72, 78, 54, 34,/**/ 16, 96, 48, 84, 10,/**/ 28, 66, 90, 60, 22,/**/ 5, 25, 13, 37, 3, // down
    2, 35, 11, 23, 4,/**/ 36, 55, 85, 61, 39,/**/ 12, 79, 49, 91, 15,/**/ 24, 73, 97, 67, 27,/**/ 3, 37, 13, 25, 5, // back
];

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part.
 * This map is filled in by the init method!!
 */
AbstractCube5Cube3D.prototype.partToStickerMap = null;

AbstractCube5Cube3D.prototype.stickerToFaceMap = [
    1, 1, 1, 1, 2,/**/ 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0,/**/ 2, 1, 1, 1, 1, // right
    0, 1, 1, 1, 0,/**/ 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0,/**/ 0, 1, 1, 1, 0, // up
    1, 0, 0, 0, 2,/**/ 1, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 1,/**/ 2, 0, 0, 0, 1, // front
    1, 1, 1, 1, 2,/**/ 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0,/**/ 2, 1, 1, 1, 1, // left
    0, 1, 1, 1, 0,/**/ 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0,/**/ 0, 0, 0, 0, 0,/**/ 0, 1, 1, 1, 0, // down
    1, 0, 0, 0, 2,/**/ 1, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 1,/**/ 1, 0, 0, 0, 1,/**/ 2, 0, 0, 0, 1, // back
];

AbstractCube5Cube3D.prototype.boxClickToLocationMap = [
// XXX FANTOMAS
  [[7, 10+8, 22+8, 6], [20+8,  9+44,  3+44, 18+8], [ 8+8, 15+44, 21+44,  6+8], [5,  7+8, 19+8, 4]], // left →↑
  [[7, 20+8,  8+8, 5], [11+8, 22+44, 16+44,  5+8], [23+8,  4+44, 10+44, 17+8], [1, 14+8,  2+8, 3]], // down
  [[7,22+8,10+8,34+8, 6], [23+8,8+44,38+44,14+44,21+8], [11+8,32+44,2+44,44+44,9+8],[35+8, 26+44,50+44,20+44, 33+8], [1,13+8,  1+8, 25+8, 0]], // front ←
  [[1,  1+8, 13+8, 0], [14+8,  6+44, 12+44, 12+8], [ 2+8,  0+44, 18+44,  0+8], [3,  4+8, 16+8, 2]], // right ←
  [[6,  18+8, 6+8, 4], [ 9+8, 19+44,  1+44,  3+8], [21+8, 13+44,  7+44, 15+8], [0, 12+8,  0+8, 2]], // up
  [[5,  7+8, 19+8, 4], [ 5+8, 17+44, 11+44,  3+8], [17+8, 23+44,  5+44, 15+8], [3,  4+8, 16+8, 2]], // back
];
AbstractCube5Cube3D.prototype.boxClickToAxisMap = [
  [[0, 1, 1, 1, 0], [2, 0, 0, 0, 2],[2, 0, 0, 0, 2], [2, 0, 0, 0, 2], [0, 1, 1, 1, 0]], // left
  [[1, 2, 2, 2, 1], [0, 1, 1, 1, 0],[0, 1, 1, 1, 0], [0, 1, 1, 1, 0], [1, 2, 2, 2, 1]], // down
  [[2, 1, 1, 1, 2], [0, 2, 2, 2, 0],[0, 2, 2, 2, 0], [0, 2, 2, 2, 0], [2, 1, 1, 1, 2]], // front
  [[0, 1, 1, 1, 0], [2, 0, 0, 0, 2],[2, 0, 0, 0, 2], [2, 0, 0, 0, 2], [0, 1, 1, 1, 0]], // right
  [[1, 2, 2, 2, 1], [0, 1, 1, 1, 0],[0, 1, 1, 1, 0], [0, 1, 1, 1, 0], [1, 2, 2, 2, 1]], // up
  [[2, 1, 1, 1, 2], [0, 2, 2, 2, 0],[0, 2, 2, 2, 0], [0, 2, 2, 2, 0], [2, 1, 1, 1, 2]], // back
];
AbstractCube5Cube3D.prototype.boxClickToAngleMap = [
  [[-1,-1,-1,-1,-1], [-1,-1,-1,-1, 1], [-1,-1,-1,-1, 1], [-1,-1,-1,-1, 1], [-1, 1, 1, 1,-1]],// left
  [[-1, 1, 1, 1,-1], [ 1,-1,-1,-1,-1], [ 1,-1,-1,-1,-1], [ 1,-1,-1,-1,-1], [-1,-1,-1,-1,-1]],// down
  [[ 1, 1, 1, 1, 1], [-1, 1, 1, 1, 1], [-1, 1, 1, 1, 1], [-1, 1, 1, 1, 1], [ 1,-1,-1,-1, 1]],// front
  [[ 1, 1, 1, 1, 1], [ 1, 1, 1, 1,-1], [ 1, 1, 1, 1,-1], [ 1, 1, 1, 1,-1], [ 1,-1,-1,-1, 1]],// right
  [[ 1,-1,-1,-1, 1], [-1, 1, 1, 1, 1], [-1, 1, 1, 1, 1], [-1, 1, 1, 1, 1], [ 1, 1, 1, 1, 1]],// up
  [[-1,-1,-1,-1,-1], [ 1,-1,-1,-1,-1], [ 1,-1,-1,-1,-1], [ 1,-1,-1,-1,-1], [-1, 1, 1, 1,-1]],// back
];
AbstractCube5Cube3D.prototype.boxClickToLayerMap = [
  [[1, 2, 4, 8, 1], [8, 1, 1, 1, 8], [4, 1, 1, 1, 4], [2, 1, 1, 1, 2], [1, 2, 4, 8, 1]],// left
  [[1, 8, 4, 2, 1], [2, 1, 1, 1, 2], [4, 1, 1, 1, 4], [8, 1, 1, 1, 8], [1, 8, 4, 2, 1]],// down
  [[16, 2, 4, 8, 16], [2, 16, 16, 16, 2], [4, 16, 16, 16, 4], [8, 16, 16, 16, 8], [16, 2, 4, 8, 16]],// front
  [[16, 2, 4, 8, 16], [8, 16, 16, 16, 8], [4, 16, 16, 16, 4], [2, 16, 16, 16, 2], [16, 2, 4, 8, 16]],// right
  [[16, 8, 4, 2, 16], [2, 16, 16, 16, 2], [4, 16, 16, 16, 4], [8, 16, 16, 16, 8], [16, 8, 4, 2, 16]],// up
  [[1, 2, 4, 8, 1], [2, 1, 1, 1, 2], [4, 1, 1, 1, 4], [8, 1, 1, 1, 8], [1, 2, 4, 8, 1]],// back
];
AbstractCube5Cube3D.prototype.boxSwipeToAxisMap = [
  [1, 2, 1, 2], // left
  [2, 0, 2, 0], // down
  [1, 0, 1, 0], // front
  [1, 2, 1, 2], // right
  [2, 0, 2, 0], // up
  [1, 0, 1, 0], // back
];
AbstractCube5Cube3D.prototype.boxSwipeToAngleMap = [
  [-1, -1, 1, 1], // left
  [1, 1, -1, -1], // down
  [1, -1, -1, 1], // front
  [1, 1, -1, -1], // right
  [-1, -1, 1, 1], // up
  [-1, 1, 1, -1], // back
];
AbstractCube5Cube3D.prototype.boxSwipeToLayerMap = [
  [[[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]],
   [[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]]], // left
  [[[4, 1, 4, 1], [2, 1, 2, 1], [1, 1, 1, 1]],
   [[4, 2, 4, 2], [2, 2, 2, 2], [1, 2, 1, 2]],
  [[4, 4, 4, 4], [2, 4, 2, 4], [1, 4, 1, 4]]], // down
  [[[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]],
   [[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]]], // front
  [[[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]],
   [[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]]], // right
  [[[4, 1, 4, 1], [2, 1, 2, 1], [1, 1, 1, 1]],
   [[4, 2, 4, 2], [2, 2, 2, 2], [1, 2, 1, 2]],
   [[4, 4, 4, 4], [2, 4, 2, 4], [1, 4, 1, 4]]], // up
  [[[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2]],
   [[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4]]], // back
];
/**
 * The following properties may have different values depending on
 * the 3D model being used.
 * <pre>
 *    0 1 2 3 4 5 6 7 8 91011121314
 *             +---------+
 *  0          |         |
 *  1          |         |
 *  2          |    U    |
 *  3          |         |
 *  4          |         |
 *   +---------+---------+---------+
 *  5|         |         |         |
 *  6|         |         |         |
 *  7|    L    |    F    |    R    |
 *  8|         |         |         |
 *  9|         |         |         |
 *   +---------+---------+---------+
 * 10          |         |         |
 * 11          |         |         |
 * 12          |    D    |    B    |
 * 13          |         |         |
 * 14          |         |         |
 *             +---------+---------+
 * </pre>
 */
AbstractCube5Cube3D.prototype.stickerOffsets = Cube3D.computeStickerOffsets(5);
// ------------------
class Cube5Cube3D extends AbstractCube5Cube3D {
  /** Constructor
   * Creates the 3D geometry of a "Professor Cube".
   * You must call loadGeometry() after constructing a new instance.
   */
  constructor() {
    super(13);
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
  case 0: partSize=10; relativeUrl = 'models/professorcube-0.obj'; break;
  case 1: partSize=10; relativeUrl = 'models/professorcube-0.obj'; break;
  case 2: partSize=10; relativeUrl = 'models/professorcube-0.obj'; break;
  default: partSize=10; relativeUrl = 'models/professorcube-0.obj'; break;
  }

  const c = new Cube5Cube3D(partSize);
  c.baseUrl = 'lib/';
  c.relativeUrl = relativeUrl;
  return c;
}
// ------------------
// MODULE API
// ------------------
export default {
  AbstractCube5Cube3D: AbstractCube5Cube3D,
  createCube3D: createCube3D,
};

