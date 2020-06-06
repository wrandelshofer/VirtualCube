/* @(#)RubiksCubeCube3D.mjs
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
 *  Subclasses must call initAbstractRubiksCubeCube3D().
 */
class AbstractRubiksCubeCube3D extends Cube3D.Cube3D {
  constructor(partSize) {
  super();

  this.partSize = partSize;
  this.cubeSize = partSize * 3;

  this.cornerCount = 8;
  this.edgeCount = 12;
  this.sideCount = 6;
  this.centerCount = 1;
  this.partCount = 8 + 12 + 6 + 1;
  this.cornerOffset = 0;
  this.edgeOffset = 8;
  this.sideOffset = 8 + 12;
  this.centerOffset = 8 + 12 + 6;

  this.cube = Cube.createCube(3);
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

  this.stickerCount = 9 * 6;
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
    //this.currentDevelopedMatrix[i]=new J3DIMath.J3DIMatrix4();
    this.identityStickerLocations[i] = new J3DIMath.J3DIMatrix4();
  }

  /* Corners
   *       +---+---+---+
   *      ulb|4.0|   |2.0|ubr
   *       +---+   +---+
   *       |   1   |
   *       +---+   +---+
   *      ufl|6.0|   |0.0|urf
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
   * +---+   +---+---+   +---+---+   +---+---+   +---+
   * |   3   |   2   |   0   |   5   |
   * +---+   +---+---+   +---+---+   +---+---+   +---+
   * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   *      dlf|7.0|   |1.0|dfr
   *       +---+   +---+
   *       |   4   |
   *       +---+   +---+
   *      dbl|5.0|   |3.0|drb
   *       +---+---+---+
   */
  let o = this.cornerOffset;
  let ps = this.partSize;

  // Move all corner parts to up right front (= position of corner[0]).
  // nothing to do
  // Move all corner parts to up right front (urf)

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

  if (partSize > 2) {
    for (let i = 0; i < this.cornerCount; i++) {
       this.identityPartLocations[o + i].translate(ps*1.0,ps*1.0,-ps*1.0);
    }
  }
  //
  /* Edges
   *       +---+---+---+
   *       |   |3.1|   |
   *       +--- --- ---+
   *       |6.0| u |0.0|
   *       +--- --- ---+
   *       |   |9.1|   |
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   * |   |6.1|   |   |9.0|   |   |0.1|   |   |3.0|   |
   * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
   * |7.0| l 10.0|10.1 f |1.1|1.0| r |4.0|4.1| b |7.1|
   * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
   * |   |8.1|   |   |11.0   |   |2.1|   |   |5.0|   |
   * +---+---+---+---+---+---+---+---+---+---+---+---+
   *       |   |11.1   |
   *       +--- --- ---+
   *       |8.0| d |2.0|
   *       +--- --- ---+
   *       |   |5.1|   |
   *       +---+---+---+
   */
  o = this.edgeOffset;

  // Move all edge parts to up right (ur)
  // nothing to do

  // Rotate edge parts into place
  // ur
  //--no transformation--
  // rf
  this.identityPartLocations[o + 1].rotateZ(-90);
  this.identityPartLocations[o + 1].rotateY(90);
  // dr
  this.identityPartLocations[o + 2].rotateX(180);
  // bu
  this.identityPartLocations[o + 3].rotateZ(90);
  this.identityPartLocations[o + 3].rotateX(90);
  // rb
  this.identityPartLocations[o + 4].rotateZ(-90);
  this.identityPartLocations[o + 4].rotateY(-90);
  // bd
  this.identityPartLocations[o + 5].rotateX(90);
  this.identityPartLocations[o + 5].rotateY(-90);
  // ul
  this.identityPartLocations[o + 6].rotateY(180);
  // lb
  this.identityPartLocations[o + 7].rotateZ(90);
  this.identityPartLocations[o + 7].rotateY(-90);
  // dl
  this.identityPartLocations[o + 8].rotateY(180);
  this.identityPartLocations[o + 8].rotateX(180);
  // fu
  this.identityPartLocations[o + 9].rotateX(-90);
  this.identityPartLocations[o + 9].rotateY(-90);
  // lf
  this.identityPartLocations[o + 10].rotateY(90);
  this.identityPartLocations[o + 10].rotateX(-90);
  // fd
  this.identityPartLocations[o + 11].rotateZ(-90);
  this.identityPartLocations[o + 11].rotateX(-90);

  if (partSize > 2) {
    for (let i = 0; i < this.edgeCount; i++) {
       this.identityPartLocations[o + i].translate(ps*1.0,ps*1.0,0);
    }
  }
  /* Sides
   *       +------------+
   *       |   .1   |
   *       |  ---   |
   *       | .0| 1 |.2  |
   *       |  ---   |
   *       |   .3   |
   * +-----------+------------+-----------+-----------+
   * |   .0  |   .2   |   .3  |  .1   |
   * |  ---  |  ---   |  ---  |  ---  |
   * | .3| 3 |.1 | .1| 2 |.3  | .2| 0 |.0 | .0| 5 |.2 |
   * |  ---  |  ---   |  ---  |  ---  |
   * |   .2  |  .0    |   .1  |   .3  |
   * +-----------+------------+-----------+-----------+
   *       |   .0   |
   *       |  ---   |
   *       | .3| 4 |.1  |
   *       |  ---   |
   *       |   .2   |
   *       +------------+
   */
  o = this.sideOffset;

  // Move all side parts to right (= position of side[0]
  // nothing to do

  // Rotate the side parts into place
  // r
  // --no transformation--
  // u
  this.identityPartLocations[o + 1].rotate(90, 0, 0, 1);
  this.identityPartLocations[o + 1].rotate(-90, 1, 0, 0);
  // f
  this.identityPartLocations[o + 2].rotate(90, 0, 1, 0);
  this.identityPartLocations[o + 2].rotate(90, 1, 0, 0);
  // l
  this.identityPartLocations[o + 3].rotate(180, 0, 1, 0);
  this.identityPartLocations[o + 3].rotate(-90, 1, 0, 0);
  // d
  this.identityPartLocations[o + 4].rotate(90, 0, 0, -1);
  this.identityPartLocations[o + 4].rotate(180, 1, 0, 0);
  // b
  this.identityPartLocations[o + 5].rotate(90, 0, -1, 0);
  this.identityPartLocations[o + 5].rotate(180, 1, 0, 0);

  if (partSize > 2) {
    for (let i = 0; i < this.sideCount; i++) {
       this.identityPartLocations[o + i].translate(ps*1.0,0,0);
    }
  }
  }

  loadGeometry() {
    // ----------------------------
    // Load geometry
    let self = this;
    let fRepaint = function () {
      self.repaint();
    };

    let baseUrl = this.getModelUrl();

    {
      // parts
      this.centerObj = J3DI.loadObj(null, baseUrl + "center.obj", fRepaint);
      this.cornerObj = J3DI.loadObj(null, baseUrl + "corner.obj", fRepaint);
      this.edgeObj = J3DI.loadObj(null, baseUrl + "edge.obj", fRepaint);
      this.sideObj = J3DI.loadObj(null, baseUrl + "side.obj", fRepaint);

      // stickers
      this.stickerObjs = new Array(this.stickerCount);
      for (let i = 0; i < this.stickerObjs.length; i++) {
        this.stickerObjs[i] = new J3DI.J3DIObj();
      }
      this.corner_rObj = J3DI.loadObj(null, baseUrl + "corner_r.obj", function () {
        self.initAbstractRubiksCubeCube3D_corner_r();
        self.repaint();
      });
      this.corner_uObj = J3DI.loadObj(null, baseUrl + "corner_u.obj", function () {
        self.initAbstractRubiksCubeCube3D_corner_u();
        self.repaint();
      });
      this.corner_fObj = J3DI.loadObj(null, baseUrl + "corner_f.obj", function () {
        self.initAbstractRubiksCubeCube3D_corner_f();
        self.repaint();
      });
      this.edge_rObj = J3DI.loadObj(null, baseUrl + "edge_r.obj", function () {
        self.initAbstractRubiksCubeCube3D_edge_r();
        self.repaint();
      });
      this.edge_uObj = J3DI.loadObj(null, baseUrl + "edge_u.obj", function () {
        self.initAbstractRubiksCubeCube3D_edge_u();
        self.repaint();
      });
      this.side_rObj = J3DI.loadObj(null, baseUrl + "side_r.obj", function () {
        self.initAbstractRubiksCubeCube3D_side_r();
        self.repaint();
      });
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

  initAbstractRubiksCubeCube3D_corner_r() {
    let s = this.corner_rObj;
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);

    let o=this.cornerOffset;
    this.stickerObjs[ this.partToStickerMap[o+0][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+1][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+2][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+3][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+4][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+5][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+6][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+7][1] ] = s180.clone();

    this.initAbstractRubiksCubeCube3D_textureScales();
  }
  initAbstractRubiksCubeCube3D_corner_f() {
    let s = this.corner_fObj;
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);

    let o=this.cornerOffset;
    this.stickerObjs[ this.partToStickerMap[o+0][2] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+1][2] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+2][2] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+3][2] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+4][2] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+5][2] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+6][2] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+7][2] ] = s180.clone();

    this.initAbstractRubiksCubeCube3D_textureScales();
  }
  initAbstractRubiksCubeCube3D_corner_u() {
    let s = this.corner_uObj;
    let s90 = new J3DI.J3DIObj();
    s90.setTo(s);
    s90.rotateTexture(90);
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);
    let s270 = new J3DI.J3DIObj();
    s270.setTo(s);
    s270.rotateTexture(270);

    let o=this.cornerOffset;
    this.stickerObjs[ this.partToStickerMap[o+0][0] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+1][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+2][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+3][0] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+4][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+5][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+6][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+7][0] ] = s180.clone();

    this.initAbstractRubiksCubeCube3D_textureScales();
  }
  initAbstractRubiksCubeCube3D_edge_u() {
    let s = this.edge_uObj;
    let s90 = new J3DI.J3DIObj();
    s90.setTo(s);
    s90.rotateTexture(90);
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);
    let s270 = new J3DI.J3DIObj();
    s270.setTo(s);
    s270.rotateTexture(270);

    let o=this.edgeOffset;
    this.stickerObjs[ this.partToStickerMap[o+0][0] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+1][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+2][0] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+3][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+4][0] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+5][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+6][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+7][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+8][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+9][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+10][0] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+11][0] ] = s270.clone();

    this.initAbstractRubiksCubeCube3D_textureScales();
  }
  initAbstractRubiksCubeCube3D_edge_r() {
    let s = this.edge_rObj;
    let s90 = new J3DI.J3DIObj();
    s90.setTo(s);
    s90.rotateTexture(90);
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);
    let s270 = new J3DI.J3DIObj();
    s270.setTo(s);
    s270.rotateTexture(270);

    let o=this.edgeOffset;
    this.stickerObjs[ this.partToStickerMap[o+0][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+1][1] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+2][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+3][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+4][1] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+5][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+6][1] ] = s.clone();
    this.stickerObjs[ this.partToStickerMap[o+7][1] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+8][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+9][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+10][1] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+11][1] ] = s.clone();

    this.initAbstractRubiksCubeCube3D_textureScales();
  }
  initAbstractRubiksCubeCube3D_side_r() {
    let s = this.side_rObj;
    let s90 = s.clone();
    s90.rotateTexture(90);
    let s180 = s.clone();
    s180.rotateTexture(180);
    let s270 = s.clone();
    s270.rotateTexture(270);

    this.stickerObjs[ 4] = s.clone();//r
    this.stickerObjs[13] = s180.clone();//u
    this.stickerObjs[22] = s270.clone();//f
    this.stickerObjs[31] = s90.clone();//l
    this.stickerObjs[40] = s90.clone();
    this.stickerObjs[49] = s180.clone();

    this.initAbstractRubiksCubeCube3D_textureScales();
  }
  initAbstractRubiksCubeCube3D_textureScales() {
    let attr = this.attributes;

    for (let i = 0; i < this.stickerObjs.length; i++) {
      if (!this.stickerObjs[i].loaded)
        continue;

      if (this.stickerObjs[i].isTextureScaled)
        continue;
      if (i * 2 + 1 < this.stickerOffsets.length) {
        this.stickerObjs[i].textureOffsetX = this.stickerOffsets[i * 2];
        this.stickerObjs[i].textureOffsetY = this.stickerOffsets[i * 2 + 1];
      }
      this.stickerObjs[i].textureScale = 56 / 512;
      this.stickerObjs[i].isTextureScaled = true;
    }

    this.isAttributesValid = false;
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
  /** Default cube attributes. */
  createAttributes() {
    let a = new CubeAttributes.CubeAttributes(this.partCount, 6 * 9, [9, 9, 9, 9, 9, 9]);
    let partsPhong = [0.5, 0.6, 0.4, 16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (let i = 0; i < this.partCount; i++) {
      a.partsFillColor[i] = [40, 40, 40, 255];
      a.partsPhong[i] = partsPhong;
    }
    a.partsFillColor[this.centerOffset] = [240, 240, 240, 255];

    let faceColors = [
      [255, 210, 0, 255], // right: yellow
      [0, 51, 115, 255], // up   : blue
      [140, 0, 15, 255], // front: red
      [248, 248, 248, 255], // left : white
      [0, 115, 47, 255], // down : green
      [255, 70, 0, 255] // back : orange
    ];

    let stickersPhong = [0.8, 0.2, 0.1, 8.0];//shiny paper [ambient, diffuse, specular, shininess]

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 9; j++) {
        a.stickersFillColor[i * 9 + j] = faceColors[i];
        a.stickersPhong[i * 9 + j] = stickersPhong;
      }
    }

    return a;
  }
/*
  updateExplosionFactor(factor) {
    if (factor == null) {
      factor = this.attributes.explosionFactor;
    }
    let explosionShift = this.partSize * 1.5;
    let baseShift = explosionShift * factor;
    let shift = 0;
    let a = this.attributes;
    for (let i = 0; i < this.cornerCount; i++) {
      let index = this.cornerOffset + i;
      shift = baseShift + a.partExplosion[index];
      this.partExplosions[index].matrix.makeIdentity();
      this.partExplosions[index].matrix.translate(shift, shift, -shift);//ruf
    }
    for (let i = 0; i < this.edgeCount; i++) {
      let index = this.edgeOffset + i;
      shift = baseShift + a.partExplosion[index];
      this.partExplosions[index].matrix.makeIdentity();
      this.partExplosions[index].matrix.translate(shift, shift, 0);//ru
    }
    for (let i = 0; i < this.sideCount; i++) {
      let index = this.sideOffset + i;
      shift = baseShift + a.partExplosion[index];
      this.partExplosions[index].matrix.makeIdentity();
      this.partExplosions[index].matrix.translate(shift, 0, 0);//r
    }
    this.fireStateChanged();
  }

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

    let partIndices = new Array(this.partCount);
    let locations = new Array(this.partCount);
    let orientations = new Array(this.partCount);
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

  / * Immediately completes the current twisting animation. * /
   finishTwisting() {
     this.isTwisting=null;
   }
  */
}

/**
 * Maps stickers to cube parts.
 * <p>
 * Sticker indices:
 * <pre>
 *       +---+---+---+
 *       |1,0|1,1|1,2|
 *       +--- --- ---+
 *       |1,3|1,4|1,5|
 *       +--- --- ---+
 *       |1,6|1,7|1,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,6|3,7|3,8|2,6|2,7|2,8|0,6|0,7|0,8|5,6|5,7|5,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *       |4,0|4,1|4,2|
 *       +--- --- ---+
 *       |4,3|4,4|4,5|
 *       +--- --- ---+
 *       |4,6|4,7|4,8|
 *       +---+---+---+
 * </pre>
 * Sticker indices absolute values:
 * <pre>
 *       +---+---+---+
 *       | 9 |10 |11 |
 *       +--- --- ---+
 *       |12 |13 |14 |
 *       +--- --- ---+
 *       |15 |16 |17 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |27 |28 |29 |18 |19 |20 | 0 | 1 | 2 |45 |46 |47 |
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |30 |31 |32 |21 |22 |23 | 3 | 4 | 5 |48 |49 |50 |
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |33 |34 |35 |24 |25 |26 | 6 | 7 | 8 |51 |52 |53 |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *       |36 |37 |38 |
 *       +--- --- ---+
 *       |39 |40 |41 |
 *       +--- --- ---+
 *       |42 |43 |44 |
 *       +---+---+---+
 * </pre>
 * <p>
 * Part indices:
 * <pre>
 *        +----+----+----+
 *        | 4.0|11.1| 2.0|
 *        +----    ----+
 *        |14.0 21  8.0|
 *        +----    ----+
 *        | 6.0|17.1| 0.0|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * | 4.1|14.1| 6.2| 6.1|17.0| 0.2| 0.1| 8.1| 2.2| 2.1|11.0| 4.2|
 * +----    ----+----    ----+----    ----+----    ----+
 * |15.0 23   18.0|18   22  9.1| 9.0 20   12.0|12   25   15.1|
 * +----    ----+----    ----+----    ----+----    ----+
 * | 5.2|16.1| 7.1| 7.2|19.0| 1.1| 1.2|10.1| 3.1| 3.2|13.0| 5.1|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *        | 7.0|19.1| 1.0|
 *        +----    ----+
 *        |16.0 24   10.0|
 *        +----    ----+
 *        |5.0 |13.1| 3.0|
 *        +----+----+----+
 * </pre>
 */
AbstractRubiksCubeCube3D.prototype.stickerToPartMap = [
  0, 8, 2,/**/ 9, 20, 12,/**/ 1, 10, 3, // right
  4, 11, 2,/**/ 14, 21, 8,/**/ 6, 17, 0, // up
  6, 17, 0,/**/ 18, 22, 9,/**/ 7, 19, 1, // front
  4, 14, 6,/**/ 15, 23, 18,/**/ 5, 16, 7, // left
  7, 19, 1,/**/ 16, 24, 10,/**/ 5, 13, 3, // down
  2, 11, 4,/**/ 12, 25, 15,/**/ 3, 13, 5  // back
];

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part.
 * This map is filled in by the init method!!
 */
AbstractRubiksCubeCube3D.prototype.partToStickerMap = null;

/**
 * Gets the face of the part which holds the indicated sticker.
 * The sticker index is interpreted according to this scheme:
 * <pre>
 *       +---+---+---+
 *       |1,0|1,1|1,2|
 *       +--- --- ---+
 *       |1,3|1,4|1,5|
 *       +--- --- ---+
 *       |1,6|1,7|1,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |3,0|3,1|3,2|2,0|2,1|2,2|0,0|0,1|0,2|5,0|5,1|5,2|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,3|3,4|3,5|2,3|2,4|2,5|0,3|0,4|0,5|5,3|5,4|5,5|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |3,6|3,7|3,8|2,6|2,7|2,8|0,6|0,7|0,8|5,6|5,7|5,8|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *       |4,0|4,1|4,2|
 *       +--- --- ---+
 *       |4,3|4,4|4,5|
 *       +--- --- ---+
 *       |4,6|4,7|4,8|
 *       +---+---+---+
 * </pre>
 * The faces (or orientation of the parts) according to this scheme:
 * <pre>
 *        +----+----+----+
 *        | 4.0|11.1| 2.0|
 *        +----    ----+
 *        |14.0 21  8.0|
 *        +----    ----+
 *        | 6.0|17.1| 0.0|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 * | 4.1|14.1| 6.2| 6.1|17.0| 0.2| 0.1| 8.1| 2.2| 2.1|11.0| 4.2|
 * +----    ----+----    ----+----    ----+----    ----+
 * |15.0 23   18.0|18.1 22  9.1| 9.0 20   12.0|12.1 25   15.1|
 * +----    ----+----    ----+----    ----+----    ----+
 * | 5.2|16.1| 7.1| 7.2|19.0| 1.1| 1.2|10.1| 3.1| 3.2|13.0| 5.1|
 * +----+----+----+----+----+----+----+----+----+----+----+----+
 *        | 7.0|19.1| 1.0|
 *        +----    ----+
 *        |16.0 24   10.0|
 *        +----    ----+
 *        |5.0 |13.1| 3.0|
 *        +----+----+----+
 * </pre>
 */
AbstractRubiksCubeCube3D.prototype.stickerToFaceMap = [
  1, 1, 2,/**/ 0, 0, 0,/**/ 2, 1, 1, // right
  0, 1, 0,/**/ 0, 0, 0,/**/ 0, 1, 0, // up
  1, 0, 2,/**/ 1, 0, 1,/**/ 2, 0, 1, // front
  1, 1, 2,/**/ 0, 0, 0,/**/ 2, 1, 1, // left
  0, 1, 0,/**/ 0, 0, 0,/**/ 0, 1, 0, // down
  1, 0, 2,/**/ 1, 0, 1,/**/ 2, 0, 1 // back
];

AbstractRubiksCubeCube3D.prototype.boxClickToLocationMap = [
  [[7, 10 + 8, 6], [8 + 8, 3 + 8 + 12, 6 + 8], [5, 7 + 8, 4]], // left
  [[7, 8 + 8, 5], [11 + 8, 4 + 8 + 12, 5 + 8], [1, 2 + 8, 3]], // down
  [[7, 10 + 8, 6], [11 + 8, 2 + 8 + 12, 9 + 8], [1, 1 + 8, 0]], // front
  [[1, 1 + 8, 0], [2 + 8, 0 + 8 + 12, 0 + 8], [3, 4 + 8, 2]], // right ←
  [[6, 6 + 8, 4], [9 + 8, 1 + 8 + 12, 3 + 8], [0, 0 + 8, 2]], // up
  [[5, 7 + 8, 4], [5 + 8, 5 + 8 + 12, 3 + 8], [3, 4 + 8, 2]], // back
];
AbstractRubiksCubeCube3D.prototype.boxClickToAxisMap = [
  [[0, 1, 0], [2, 0, 2], [0, 1, 0]], // left
  [[1, 2, 1], [0, 1, 0], [1, 2, 1]], // down
  [[2, 1, 2], [0, 2, 0], [2, 1, 2]], // front
  [[0, 1, 0], [2, 0, 2], [0, 1, 0]], // right
  [[1, 2, 1], [0, 1, 0], [1, 2, 1]], // up
  [[2, 1, 2], [0, 2, 0], [2, 1, 2]], // back
];
AbstractRubiksCubeCube3D.prototype.boxClickToAngleMap = [
  [[-1, -1, -1], [-1, -1, 1], [-1, 1, -1]],
  [[-1, 1, -1], [1, -1, -1], [-1, -1, -1]],
  [[1, 1, 1], [-1, 1, 1], [1, -1, 1]],
  [[1, 1, 1], [1, 1, -1], [1, -1, 1]],
  [[1, -1, 1], [-1, 1, 1], [1, 1, 1]],
  [[-1, -1, -1], [1, -1, -1], [-1, 1, -1]],
];
AbstractRubiksCubeCube3D.prototype.boxClickToLayerMap = [
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[4, 2, 4], [2, 4, 2], [4, 2, 4]],
  [[1, 2, 1], [2, 1, 2], [1, 2, 1]],
];
AbstractRubiksCubeCube3D.prototype.boxSwipeToAxisMap = [
  [1, 2, 1, 2], // left
  [2, 0, 2, 0], // down
  [1, 0, 1, 0], // front
  [1, 2, 1, 2], // right
  [2, 0, 2, 0], // up
  [1, 0, 1, 0], // back
];
AbstractRubiksCubeCube3D.prototype.boxSwipeToAngleMap = [
  [-1, -1, 1, 1], // left
  [1, 1, -1, -1], // down
  [1, -1, -1, 1], // front
  [1, 1, -1, -1], // right
  [-1, -1, 1, 1], // up
  [-1, 1, 1, -1], // back
];
AbstractRubiksCubeCube3D.prototype.boxSwipeToLayerMap = [
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
AbstractRubiksCubeCube3D.prototype.stickerOffsets = Cube3D.computeStickerOffsets(3);

// ------------------
class RubiksCubeCube3D extends AbstractRubiksCubeCube3D {
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
  createAttributes() {
    let a = new CubeAttributes.CubeAttributes(this.partCount, 6 * 9, [9, 9, 9, 9, 9, 9]);
    let partsPhong = [0.5, 0.6, 0.4, 16.0];//shiny plastic [ambient, diffuse, specular, shininess]
    for (let i = 0; i < this.partCount; i++) {
      a.partsFillColor[i] = [24, 24, 24, 255];
      a.partsPhong[i] = partsPhong;
    }
    a.partsFillColor[this.centerOffset] = [240, 240, 240, 255];

    let faceColors = [//Right, Up, Front, Left, Down, Back
      [255, 210, 0, 255], // Yellow
      [0, 51, 115, 255], // Blue
      [140, 0, 15, 255], // Red
      [248, 248, 248, 255], // White
      [0, 115, 47, 255], // Green
      [255, 70, 0, 255], // Orange
    ];

    let stickersPhong = [0.8, 0.2, 0.1, 8.0];//shiny paper [ambient, diffuse, specular, shininess]

    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 9; j++) {
        a.stickersFillColor[i * 9 + j] = faceColors[i];
        a.stickersPhong[i * 9 + j] = stickersPhong;
      }
    }

    return a;
  }
}

// ------------------
function createCube3D(levelOfDetail) {
  let partSize=18;
  let relativeUrl;
  switch (levelOfDetail) {
  case 4:
  case 1: relativeUrl = 'models/genericcube-1/'; break; // low-res model that should not be taken apart
  case 2: relativeUrl = 'models/genericcube-1/'; break; // med-res model that should not be taken apart
  case 3: relativeUrl = 'models/genericcube-1/'; break; // high-res model that should not be taken apart
  case 4: relativeUrl = 'models/genericcube-1/'; break; // low-res model that can be taken apart
  case 5: relativeUrl = 'models/genericcube-1/'; break; // med-res model that can be taken apart
  default: relativeUrl = 'models/genericcube-1/'; break; // high-res model that can be taken apart
  }
  const c = new RubiksCubeCube3D(partSize);
  c.baseUrl = 'lib/';
  c.relativeUrl = relativeUrl;
  return c;
}
// ------------------
// MODULE API
// ------------------
export default {
  AbstractRubiksCubeCube3D: AbstractRubiksCubeCube3D,
  createCube3D: createCube3D,
};

