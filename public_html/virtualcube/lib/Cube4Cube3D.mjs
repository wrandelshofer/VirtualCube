/* @(#)Cube4Cube3D.mjs
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
 *  Subclasses must call initAbstractCube4Cube3D().
 */
class AbstractCube4Cube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super(4);

    this.partSize = partSize;
    this.cubeSize = partSize * 4;

    this.cube = Cube.createCube(4);
    let layerCount= this.cube.getLayerCount();
    this.cornerCount = 8;
    this.edgeCount = 12 * Math.max(0,layerCount - 2);
    this.sideCount = 6 * Math.max(0,layerCount - 2) * Math.max(0,layerCount - 2);
    this.centerCount = 1;
    this.partCount = this.cornerCount + this.edgeCount + this.sideCount + this.centerCount;
    this.cornerOffset = 0;
    this.edgeOffset = this.cornerCount;
    this.sideOffset = this.edgeOffset + this.edgeCount;
    this.centerOffset = this.sideOffset + this.sideCount;

    this.cube.addCubeListener(this);
    this.attributes = this.createAttributes();

    this.partToStickerMap = new Array(this.partCount);
    for (let i = 0; i < this.partCount; i++) {
      this.parts[i] = new Node3D.Node3D();
      this.partOrientations[i] = new Node3D.Node3D();
      this.partExplosions[i] = new Node3D.Node3D();
      this.partLocations[i] = new Node3D.Node3D();

      this.partOrientations[i].add(this.parts[i]);
      this.partExplosions[i].add(this.partOrientations[i]);
      this.partLocations[i].add(this.partExplosions[i]);
      this.add(this.partLocations[i]);

      this.identityPartLocations[i] = new J3DIMath.J3DIMatrix4();
      this.partToStickerMap[i] = new Array(3);
    }

    this.stickerCount = layerCount*layerCount * 6;
    for (let i = 0; i < this.stickerCount; i++) {
      this.partToStickerMap[this.stickerToPartMap[i]][this.stickerToFaceMap[i]] = i;

      this.stickers[i] = new Node3D.Node3D();
      this.stickerOrientations[i] = new Node3D.Node3D();
      this.stickerExplosions[i] = new Node3D.Node3D();
      this.stickerLocations[i] = new Node3D.Node3D();
      this.stickerTranslations[i] = new Node3D.Node3D();

      this.stickerOrientations[i].add(this.stickers[i]);
      this.stickerExplosions[i].add(this.stickerOrientations[i]);
      this.stickerLocations[i].add(this.stickerExplosions[i]);
      this.stickerTranslations[i].add(this.stickerLocations[i]);
      this.add(this.stickerTranslations[i]);

      this.developedStickers[i] = new Node3D.Node3D();

      this.currentStickerTransforms[i] = new Node3D.Node3D();
      this.add(this.currentStickerTransforms[i]);
      this.identityStickerLocations[i] = new J3DIMath.J3DIMatrix4();
    }

    let o = this.cornerOffset;
    let ps = this.partSize;

    // Rotate the corner parts into place

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

    let m = new J3DIMath.J3DIMatrix4();
    o = this.edgeOffset;

    // Rotate edge parts into place
    for (let i=0;i<this.edgeCount;i++) {
      switch (i%12) {
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
      switch (i) {
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
        this.identityPartLocations[o + i].rotateX(180);
        this.identityPartLocations[o + i].rotateZ(-90);
        break;
      }
    }

    // Rotate all side parts into place
    o = this.sideOffset;
    for (let i=0;i<this.sideCount;i++) {
      switch (i%6) {
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
        this.identityPartLocations[o + i].rotateX(180);
        break;
      case 1:
        this.identityPartLocations[o + i].rotateX(270);
        break;
      case 2:
        break;
      case 3:
        this.identityPartLocations[o + i].rotateX(90);
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
    this.initSliceEdgeR(this.edgeR0Obj, this.edgeOffset)
  }

  initEdgeU() {
    this.initSliceEdgeU(this.edgeU0Obj, this.edgeOffset)
  }
}

/**
 * Sticker to part map.<br>
 * (the number before the dot indicates the part,
 * the number after the dot indicates the sticker.)
 * <pre>
 *                 +---+---+---+---+
 *                 4.16|11 |23 |2.0|
 *                 +--- --- --- ---+
 *                 |14 |33  39 | 8 |
 *                 +---         ---+
 *                 |26 |51  45 |20 |
 *                 +--- --- --- ---+
 *                 | 6 |17 |29 |0.31
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 * 4.46|14 |26 | 6 6.32|17 |29 | 0 |0.0|20 | 8 2.80| 2 |23 |11 | 4 |
 * +--- --- --- ---+--- --- --- ---+--- --- --- ---+--- --- --- ---+
 * |27 |53  35 |30 |30 |40  46 |21 |21 |44  50 |24 |24 |37  43 |27 |
 * +---         ---+---         ---+---         ---+---         ---+
 * |15 |47  41 |18 |18 |34  52 | 9 | 9 |38  32 |12 |12 |55  49 |15 |
 * +--- --- --- ---+--- --- --- ---+--- --- --- ---+--- --- --- ---+
 * | 5 |16 |28 |7.63 7 |19 |31 |1.45 1 |22 |10 |3.15 3 |25 |13 |5.95
 * +---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+---+
 *                 7.64|19 |31 | 1 |
 *                 +--- --- --- ---+
 *                 |28 |54  36 |22 |
 *                 +---         ---+
 *                 |16 |48  42 |10 |
 *                 +--- --- --- ---+
 *                 | 5 |13 |25 |3.79
 *                 +---+---+---+---+
 * </pre>
 */
AbstractCube4Cube3D.prototype.stickerToPartMap = [
  0, 20, 8, 2,/**/ 21, 44, 50, 24,/**/ 9, 38, 32, 12,/**/ 1, 22, 10, 3, // right
  4, 11, 23, 2,/**/ 14, 33, 39, 8,/**/ 26, 51, 45, 20,/**/ 6, 17, 29, 0, // up
  6, 17, 29, 0,/**/ 30, 40, 46, 21,/**/ 18, 34, 52, 9,/**/ 7, 19, 31, 1, // front
  4, 14, 26, 6,/**/ 27, 53, 35, 30,/**/ 15, 47, 41, 18,/**/ 5, 16, 28, 7, // left
  7, 19, 31, 1,/**/ 28, 54, 36, 22,/**/ 16, 48, 42, 10,/**/ 5, 13, 25, 3, // down
  2, 23, 11, 4,/**/ 24, 37, 43, 27,/**/ 12, 55, 49, 15,/**/ 3, 25, 13, 5 // back
];

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part.
 * This map is filled in by the init method!!
 */
AbstractCube4Cube3D.prototype.partToStickerMap = null;

/**
 * Gets the face of the part which holds the indicated sticker.
 * The sticker index is interpreted according to this scheme:
 */
AbstractCube4Cube3D.prototype.stickerToFaceMap = [
  1, 1, 1, 2,/**/  0, 0, 0, 0,/**/  0, 0, 0, 0,/**/  2, 1, 1, 1, // right
  0, 1, 1, 0,/**/  0, 0, 0, 0,/**/  0, 0, 0, 0,/**/  0, 1, 1, 0, // up
  1, 0, 0, 2,/**/  1, 0, 0, 1,/**/  1, 0, 0, 1,/**/  2, 0, 0, 1, // front
  1, 1, 1, 2,/**/  0, 0, 0, 0,/**/  0, 0, 0, 0,/**/  2, 1, 1, 1, // left
  0, 1, 1, 0,/**/  0, 0, 0, 0,/**/  0, 0, 0, 0,/**/  0, 1, 1, 0, // down
  1, 0, 0, 2,/**/  1, 0, 0, 1,/**/  1, 0, 0, 1,/**/  2, 0, 0, 1, // back
];

AbstractCube4Cube3D.prototype.boxClickToLocationMap = [
  [[7, 10+8, 22+8, 6], [20+8,  9+32,  3+32, 18+8], [ 8+8, 15+32, 21+32,  6+8], [5,  7+8, 19+8, 4]], // left →↑
  [[7, 20+8,  8+8, 5], [11+8, 22+32, 16+32,  5+8], [23+8,  4+32, 10+32, 17+8], [1, 14+8,  2+8, 3]], // down
  [[7, 10+8, 22+8, 6], [11+8,  2+32,  8+32,  9+8], [23+8, 20+32, 14+32, 21+8], [1,  1+8, 13+8, 0]], // front ←
  [[1,  1+8, 13+8, 0], [14+8,  6+32, 12+32, 12+8], [ 2+8,  0+32, 18+32,  0+8], [3,  4+8, 16+8, 2]], // right ←
  [[6,  18+8, 6+8, 4], [ 9+8, 19+32,  1+32,  3+8], [21+8, 13+32,  7+32, 15+8], [0, 12+8,  0+8, 2]], // up
  [[5,  7+8, 19+8, 4], [ 5+8, 17+32, 11+32,  3+8], [17+8, 23+32,  5+32, 15+8], [3,  4+8, 16+8, 2]], // back
];
AbstractCube4Cube3D.prototype.boxClickToAxisMap = [
  [[0, 1, 1, 0], [2, 0, 0, 2],[2, 0, 0, 2], [0, 1, 1, 0]], // left
  [[1, 2, 2, 1], [0, 1, 1, 0],[0, 1, 1, 0], [1, 2, 2, 1]], // down
  [[2, 1, 1, 2], [0, 2, 2, 0],[0, 2, 2, 0], [2, 1, 1, 2]], // front
  [[0, 1, 1, 0], [2, 0, 0, 2],[2, 0, 0, 2], [0, 1, 1, 0]], // right
  [[1, 2, 2, 1], [0, 1, 1, 0],[0, 1, 1, 0], [1, 2, 2, 1]], // up
  [[2, 1, 1, 2], [0, 2, 2, 0],[0, 2, 2, 0], [2, 1, 1, 2]], // back
];
AbstractCube4Cube3D.prototype.boxClickToAngleMap = [
  [[-1,-1,-1,-1], [-1,-1,-1, 1], [-1,-1,-1, 1], [-1, 1, 1,-1]],// left
  [[-1, 1, 1,-1], [ 1,-1,-1,-1], [ 1,-1,-1,-1], [-1,-1,-1,-1]],// down
  [[ 1, 1, 1, 1], [-1, 1, 1, 1], [-1, 1, 1, 1], [ 1,-1,-1, 1]],// front
  [[ 1, 1, 1, 1], [ 1, 1, 1,-1], [ 1, 1, 1,-1], [ 1,-1,-1, 1]],// right
  [[ 1,-1,-1, 1], [-1, 1, 1, 1], [-1, 1, 1, 1], [ 1, 1, 1, 1]],// up
  [[-1,-1,-1,-1], [ 1,-1,-1,-1], [ 1,-1,-1,-1], [-1, 1, 1,-1]],// back
];
AbstractCube4Cube3D.prototype.boxClickToLayerMap = [
  [[1, 2, 4, 1], [4, 1, 1, 4], [2, 1, 1, 2], [1, 2, 4, 1]],// left
  [[1, 4, 2, 1], [2, 1, 1, 2], [4, 1, 1, 4], [1, 4, 2, 1]],// down
  [[8, 2, 4, 8], [2, 8, 8, 2], [4, 8, 8, 4], [8, 2, 4, 8]],// front
  [[8, 2, 4, 8], [4, 8, 8, 4], [2, 8, 8, 2], [8, 2, 4, 8]],// right
  [[8, 4, 2, 8], [2, 8, 8, 2], [4, 8, 8, 4], [8, 4, 2, 8]],// up
  [[1, 2, 4, 1], [2, 1, 1, 2], [4, 1, 1, 4], [1, 2, 4, 1]],// back
];
AbstractCube4Cube3D.prototype.boxSwipeToAxisMap = [
  [1, 2, 1, 2], // left
  [2, 0, 2, 0], // down
  [1, 0, 1, 0], // front
  [1, 2, 1, 2], // right
  [2, 0, 2, 0], // up
  [1, 0, 1, 0], // back
];
AbstractCube4Cube3D.prototype.boxSwipeToAngleMap = [
  [-1, -1, 1, 1], // left
  [1, 1, -1, -1], // down
  [1, -1, -1, 1], // front
  [1, 1, -1, -1], // right
  [-1, -1, 1, 1], // up
  [-1, 1, 1, -1], // back
];
/*
 * Maps [face][u][v][swipeDirection] to a layerMask.
 *
 * Meaning of face:
 *     +---+
 *     |1 u|
 * +---+---+---+---+
 * |3 l|2 f|0→r|5 b|
 * +---+---+---+---+
 *     |4 d|
 *     +---+
 *
 * Meaning of swipeDirection:
 *      1 u
 *     +---+
 *  2 l|   |0 r
 *     +---+
 *      3 d
 *
 *
 * Meaning of layerMask values:
 *  0 = no layers
 *  1 = layer 0
 *  2 = layer 1
 *  4 = layer 2
 *  8 = layer 3
 */
AbstractCube4Cube3D.prototype.boxSwipeToLayerMap = [
    // FIXME these layer numbers are wrong!
  [[[1, 8, 1, 8], [2, 4, 2, 4], [2, 4, 2, 4], [8, 8, 8, 8]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [2, 2, 2, 2], [8, 2, 8, 2]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [2, 2, 2, 2], [8, 2, 8, 2]],
   [[1, 1, 1, 1], [2, 1, 2, 1], [2, 1, 2, 1], [8, 1, 8, 1]]], // left NOK!

  [[[8, 1, 8, 1], [2, 1, 2, 1], [2, 1, 2, 1], [1, 1, 1, 1]],
   [[8, 2, 8, 2], [2, 2, 2, 2], [2, 2, 2, 2], [1, 2, 1, 2]],
   [[8, 2, 8, 2], [2, 2, 2, 2], [2, 2, 2, 2], [1, 2, 1, 2]],
   [[8, 8, 8, 8], [2, 8, 2, 4], [2, 4, 2, 4], [1, 8, 1, 8]]], // down NOK!

  [[[1, 1, 1, 1], [2, 1, 2, 1], [4, 1, 4, 1], [8, 1, 8, 1]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2], [8, 2, 8, 2]],
   [[1, 4, 1, 4], [2, 4, 2, 4], [4, 4, 4, 4], [8, 4, 8, 4]],
   [[1, 8, 1, 8], [2, 8, 2, 8], [2, 8, 2, 8], [8, 8, 8, 8]]], // front OK

  [[[1, 8, 1, 8], [2, 8, 2, 8], [4, 8, 4, 8], [8, 8, 8, 8]],
   [[1, 8, 1, 8], [2, 4, 2, 4], [4, 4, 4, 4], [8, 4, 8, 4]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [4, 2, 4, 2], [8, 2, 8, 2]],
   [[1, 1, 1, 1], [2, 1, 2, 1], [2, 1, 2, 1], [8, 1, 8, 1]]], // right OK

  [[[8, 1, 8, 1], [2, 1, 2, 1], [2, 1, 2, 1], [1, 1, 1, 1]],
   [[8, 1, 8, 1], [2, 1, 2, 1], [2, 1, 2, 1], [1, 1, 1, 1]],
   [[8, 2, 8, 2], [2, 2, 2, 2], [2, 2, 2, 2], [1, 2, 1, 2]],
   [[8, 8, 8, 8], [2, 4, 2, 4], [2, 4, 2, 4], [1, 8, 1, 8]]], // up NOK!

  [[[1, 1, 1, 1], [2, 1, 2, 1], [2, 1, 2, 1], [8, 1, 8, 1]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [2, 2, 2, 2], [8, 2, 8, 2]],
   [[1, 2, 1, 2], [2, 2, 2, 2], [2, 2, 2, 2], [8, 2, 8, 2]],
   [[1, 8, 1, 8], [2, 4, 2, 4], [2, 4, 2, 4], [8, 8, 8, 8]]], // back NOK!
];
/**
 * The following properties may have different values depending on
 * the 3D model being used.
 * <pre>
 *   0 1 2 3 4 5 6 7 8 91011
 *          +-------+
 * 0        |       |
 * 1        |   U   |
 * 2        |       |
 * 3        |       |
 *  +-------+-------+-------+
 * 4|       |       |       |
 * 5|   L   |   F   |   R   |
 * 6|       |       |       |
 * 7|       |       |       |
 *  +-------+-------+-------+
 * 8        |       |       |
 * 9        |   D   |   B   |
 * 10       |       |       |
 * 11       |       |       |
 *          +-------+-------+
 * </pre>
 */
AbstractCube4Cube3D.prototype.stickerOffsets = Cube3D.computeStickerOffsets(4);
// ------------------
class Cube4Cube3D extends AbstractCube4Cube3D {
  /** Constructor
   * Creates the 3D geometry of a "Rubik's Cube".
   * You must call loadGeometry() after constructing a new instance.
   */
  constructor(partSize) {
      super(partSize);
  }
  loadGeometry() {
      super.loadGeometry();
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
  case 0: partSize=10; relativeUrl = 'models/revengecube-0.obj'; break;
  case 1: partSize=10; relativeUrl = 'models/revengecube-1.obj'; break;
  case 2: partSize=10; relativeUrl = 'models/revengecube-2.obj'; break;
  default: partSize=10; relativeUrl = 'models/revengecube-1.obj'; break;
  }
  const c = new Cube4Cube3D(partSize);
  c.baseUrl = 'lib/';
  c.relativeUrl = relativeUrl;
  return c;
}
// ------------------
// MODULE API
// ------------------
export default {
  AbstractCube4Cube3D: AbstractCube4Cube3D,
  createCube3D: createCube3D,
};
