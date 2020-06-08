/* @(#)RevengeCubeCube3D.mjs
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
 *  Subclasses must call initAbstractRevengeCubeCube3D().
 */
class AbstractRevengeCubeCube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super();

    this.partSize = partSize;
    this.cubeSize = partSize * 4;

    this.cube = Cube.createCube(4);
    this.cube.addCubeListener(this);

    let layerCount= this.cube.getLayerCount();
    this.cornerCount = 8;
    this.edgeCount = 12*Math.max(0,layerCount - 2);
    this.sideCount = 6*Math.max(0,layerCount - 2)*Math.max(0,layerCount - 2);
    this.centerCount = 1;
    this.partCount = this.cornerCount + this.edgeCount + this.sideCount + this.centerCount;
    this.cornerOffset = 0;
    this.edgeOffset = this.cornerCount;
    this.sideOffset = this.edgeOffset + this.edgeCount;
    this.centerOffset = this.sideOffset + this.sideCount;

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

    o = this.sideOffset;

    // Move all side parts to right (= position of side[0]
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

  loadGeometry() {
      // ----------------------------
      // Load geometry
      let self = this;
      let fRepaint = function () {
          self.repaint();
      };

    let modelUrl = this.getModelUrl();

    // create the parts
    this.cornerObj = new J3DI.J3DIObj();
    this.corner_rObj = new J3DI.J3DIObj();
    this.corner_uObj = new J3DI.J3DIObj();
    this.corner_fObj = new J3DI.J3DIObj();
    this.edgeObj = new J3DI.J3DIObj();
    this.edge_rObj = new J3DI.J3DIObj();
    this.edge_uObj = new J3DI.J3DIObj();
    this.sideObj = new J3DI.J3DIObj();
    this.side_rObj = new J3DI.J3DIObj();
    this.centerObj = new J3DI.J3DIObj();
    this.stickerObjs = new Array(this.stickerCount);
    for (let i = 0; i < this.stickerObjs.length; i++) {
      this.stickerObjs[i] = new J3DI.J3DIObj();
    }

    // load the 3d model
    J3DI.loadObj(null, modelUrl, function(obj) {
      self.onObjLoaded(obj);
      self.repaint();
    });
  }

  onObjLoaded(obj) {
    this.cornerObj.setTo(obj);
    this.cornerObj.selectedObject = "corner";
    this.corner_rObj.setTo(obj);
    this.corner_rObj.selectedObject = "corner_r";
    this.initAbstractRevengeCubeCube3D_corner_r();
    this.corner_uObj.setTo(obj);
    this.corner_uObj.selectedObject = "corner_u";
    this.initAbstractRevengeCubeCube3D_corner_u();
    this.corner_fObj.setTo(obj);
    this.corner_fObj.selectedObject = "corner_f";
    this.initAbstractRevengeCubeCube3D_corner_f();
    this.edgeObj.setTo(obj);
    this.edgeObj.selectedObject = "edge";
    this.edge_rObj.setTo(obj);
    this.edge_rObj.selectedObject = "edge_r";
    this.initAbstractRevengeCubeCube3D_edge_r();
    this.edge_uObj.setTo(obj);
    this.edge_uObj.selectedObject = "edge_u";
    this.initAbstractRevengeCubeCube3D_edge_u();

    this.sideObj.setTo(obj);
    this.sideObj.selectedObject = "side";
    this.side_rObj.setTo(obj);
    this.side_rObj.selectedObject = "side_r";
    this.initAbstractRevengeCubeCube3D_side_r();

    this.centerObj.setTo(obj);
    this.centerObj.selectedObject = "center";
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

  initAbstractRevengeCubeCube3D_corner_r() {
      let s0 = this.corner_rObj;
      let s180 = new J3DI.J3DIObj();
      s180.setTo(s0);
      s180.rotateTexture(180);

      let o=this.cornerOffset;
      this.stickerObjs[ this.partToStickerMap[o+0][1] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+1][1] ] = s180.clone();
      this.stickerObjs[ this.partToStickerMap[o+2][1] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+3][1] ] = s180.clone();
      this.stickerObjs[ this.partToStickerMap[o+4][1] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+5][1] ] = s180.clone();
      this.stickerObjs[ this.partToStickerMap[o+6][1] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+7][1] ] = s180.clone();

      this.initAbstractRevengeCubeCube3D_textureScales();
  }
  initAbstractRevengeCubeCube3D_corner_f() {
      let s0 = this.corner_fObj;
      let s180 = new J3DI.J3DIObj();
      s180.setTo(s0);
      s180.rotateTexture(180);

      let o=this.cornerOffset;
      this.stickerObjs[ this.partToStickerMap[o+0][2] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+1][2] ] = s180.clone();
      this.stickerObjs[ this.partToStickerMap[o+2][2] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+3][2] ] = s180.clone();
      this.stickerObjs[ this.partToStickerMap[o+4][2] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+5][2] ] = s180.clone();
      this.stickerObjs[ this.partToStickerMap[o+6][2] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+7][2] ] = s180.clone();

      this.initAbstractRevengeCubeCube3D_textureScales();
  }
  initAbstractRevengeCubeCube3D_corner_u() {
      let s0 = this.corner_uObj;
      let s90 = new J3DI.J3DIObj();
      s90.setTo(s0);
      s90.rotateTexture(90);
      let s180 = new J3DI.J3DIObj();
      s180.setTo(s0);
      s180.rotateTexture(180);
      let s270 = new J3DI.J3DIObj();
      s270.setTo(s0);
      s270.rotateTexture(270);

      let o=this.cornerOffset;
      this.stickerObjs[ this.partToStickerMap[o+0][0] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+1][0] ] = s90.clone();
      this.stickerObjs[ this.partToStickerMap[o+2][0] ] = s90.clone();
      this.stickerObjs[ this.partToStickerMap[o+3][0] ] = s0.clone();
      this.stickerObjs[ this.partToStickerMap[o+4][0] ] = s180.clone();
      this.stickerObjs[ this.partToStickerMap[o+5][0] ] = s270.clone();
      this.stickerObjs[ this.partToStickerMap[o+6][0] ] = s270.clone();
      this.stickerObjs[ this.partToStickerMap[o+7][0] ] = s180.clone();

      this.initAbstractRevengeCubeCube3D_textureScales();
  }
  initAbstractRevengeCubeCube3D_edge_u() {
    let s0 = this.edge_uObj;
    let s90 = new J3DI.J3DIObj();
    s90.setTo(s0);
    s90.rotateTexture(90);
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s0);
    s180.rotateTexture(180);
    let s270 = new J3DI.J3DIObj();
    s270.setTo(s0);
    s270.rotateTexture(270);

    let o=this.edgeOffset;
    this.stickerObjs[ this.partToStickerMap[o+0][1] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+12][0] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+1][1] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+13][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+2][0] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+14][1] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+3][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+15][1] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+4][0] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+16][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+5][1] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+17][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+6][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+18][1] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+7][1] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+19][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+8][1] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+20][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+9][1] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+21][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+10][0] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+22][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+11][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+23][1] ] = s90.clone();
    this.initAbstractRevengeCubeCube3D_textureScales();
  }
  initAbstractRevengeCubeCube3D_edge_r() {
    let s0 = this.edge_rObj;
    let s90 = new J3DI.J3DIObj();
    s90.setTo(s0);
    s90.rotateTexture(90);
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s0);
    s180.rotateTexture(180);
    let s270 = new J3DI.J3DIObj();
    s270.setTo(s0);
    s270.rotateTexture(270);

    let o=this.edgeOffset;
    this.stickerObjs[ this.partToStickerMap[o+0][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+12][1] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+1][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+13][1] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+2][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+14][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+3][1] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+15][0] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+4][1] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+16][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+5][0] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+17][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+6][1] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+18][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+7][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+19][1] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+8][0] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+20][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+9][0] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+21][1] ] = s180.clone();
    this.stickerObjs[ this.partToStickerMap[o+10][1] ] = s90.clone();
    this.stickerObjs[ this.partToStickerMap[o+22][0] ] = s270.clone();
    this.stickerObjs[ this.partToStickerMap[o+11][1] ] = s0.clone();
    this.stickerObjs[ this.partToStickerMap[o+23][0] ] = s180.clone();

    this.initAbstractRevengeCubeCube3D_textureScales();
  }
  initAbstractRevengeCubeCube3D_side_r() {
    let s0 = this.side_rObj;
    let s90 = s0.clone();
    s90.rotateTexture(90);
    let s180 = s0.clone();
    s180.rotateTexture(180);
    let s270 = s0.clone();
    s270.rotateTexture(270);

    let o=this.sideOffset;
    this.stickerObjs[ this.partToStickerMap[o+0][0] ] = s180.clone();//r
    this.stickerObjs[ this.partToStickerMap[o+1][0] ] = s0.clone();//u
    this.stickerObjs[ this.partToStickerMap[o+2][0] ] = s90.clone();//f
    this.stickerObjs[ this.partToStickerMap[o+3][0] ] = s270.clone();//l
    this.stickerObjs[ this.partToStickerMap[o+4][0] ] = s270.clone();//d
    this.stickerObjs[ this.partToStickerMap[o+5][0] ] = s0.clone();//b

    this.stickerObjs[ this.partToStickerMap[o+6][0] ] = s90.clone();//r
    this.stickerObjs[ this.partToStickerMap[o+7][0] ] = s270.clone();//u
    this.stickerObjs[ this.partToStickerMap[o+8][0] ] = s0.clone();//f
    this.stickerObjs[ this.partToStickerMap[o+9][0] ] = s180.clone();//l
    this.stickerObjs[ this.partToStickerMap[o+10][0] ] = s180.clone();//d
    this.stickerObjs[ this.partToStickerMap[o+11][0] ] = s270.clone();//b

    this.stickerObjs[ this.partToStickerMap[o+12][0] ] = s0.clone();//r
    this.stickerObjs[ this.partToStickerMap[o+13][0] ] = s180.clone();//u
    this.stickerObjs[ this.partToStickerMap[o+14][0] ] = s270.clone();//f
    this.stickerObjs[ this.partToStickerMap[o+15][0] ] = s90.clone();//l
    this.stickerObjs[ this.partToStickerMap[o+16][0] ] = s90.clone();//d
    this.stickerObjs[ this.partToStickerMap[o+17][0] ] = s180.clone();//b

    this.stickerObjs[ this.partToStickerMap[o+18][0] ] = s270.clone();//r
    this.stickerObjs[ this.partToStickerMap[o+19][0] ] = s90.clone();//u
    this.stickerObjs[ this.partToStickerMap[o+20][0] ] = s180.clone();//f
    this.stickerObjs[ this.partToStickerMap[o+21][0] ] = s0.clone();//l
    this.stickerObjs[ this.partToStickerMap[o+22][0] ] = s0.clone();//d
    this.stickerObjs[ this.partToStickerMap[o+23][0] ] = s90.clone();//b

   this.initAbstractRevengeCubeCube3D_textureScales();
  }
  initAbstractRevengeCubeCube3D_textureScales() {
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
        this.stickerObjs[i].textureScale = 42 / 512;
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
    let a = new CubeAttributes.CubeAttributes(this.partCount, 6 * 16, [16, 16, 16, 16, 16, 16]);
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

    let layerCount = this.cube.getLayerCount();
    let stickersPerFace = layerCount*layerCount;
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < stickersPerFace; j++) {
            a.stickersFillColor[i * stickersPerFace + j] = faceColors[i];
            a.stickersPhong[i * stickersPerFace+ j] = stickersPhong;
        }
    }
    return a;
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
AbstractRevengeCubeCube3D.prototype.stickerToPartMap = [
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
AbstractRevengeCubeCube3D.prototype.partToStickerMap = null;

/**
 * Gets the face of the part which holds the indicated sticker.
 * The sticker index is interpreted according to this scheme:
 */
AbstractRevengeCubeCube3D.prototype.stickerToFaceMap = [
  1, 1, 1, 2,/**/  0, 0, 0, 0,/**/  0, 0, 0, 0,/**/  2, 1, 1, 1, // right
  0, 1, 1, 0,/**/  0, 0, 0, 0,/**/  0, 0, 0, 0,/**/  0, 1, 1, 0, // up
  1, 0, 0, 2,/**/  1, 0, 0, 1,/**/  1, 0, 0, 1,/**/  2, 0, 0, 1, // front
  1, 1, 1, 2,/**/  0, 0, 0, 0,/**/  0, 0, 0, 0,/**/  2, 1, 1, 1, // left
  0, 1, 1, 0,/**/  0, 0, 0, 0,/**/  0, 0, 0, 0,/**/  0, 1, 1, 0, // down
  1, 0, 0, 2,/**/  1, 0, 0, 1,/**/  1, 0, 0, 1,/**/  2, 0, 0, 1, // back
];

AbstractRevengeCubeCube3D.prototype.boxClickToLocationMap = [
  [[7, 10+8, 22+8, 6], [20+8,  9+32,  3+32, 18+8], [ 8+8, 15+32, 21+32,  6+8], [5,  7+8, 19+8, 4]], // left →↑
  [[7, 20+8,  8+8, 5], [11+8, 22+32, 16+32,  5+8], [23+8,  4+32, 10+32, 17+8], [1, 14+8,  2+8, 3]], // down
  [[7, 10+8, 22+8, 6], [11+8,  2+32,  8+32,  9+8], [23+8, 20+32, 14+32, 21+8], [1,  1+8, 13+8, 0]], // front ←
  [[1,  1+8, 13+8, 0], [14+8,  6+32, 12+32, 12+8], [ 2+8,  0+32, 18+32,  0+8], [3,  4+8, 16+8, 2]], // right ←
  [[6,  18+8, 6+8, 4], [ 9+8, 19+32,  1+32,  3+8], [21+8, 13+32,  7+32, 15+8], [0, 12+8,  0+8, 2]], // up
  [[5,  7+8, 19+8, 4], [ 5+8, 17+32, 11+32,  3+8], [17+8, 23+32,  5+32, 15+8], [3,  4+8, 16+8, 2]], // back
];
AbstractRevengeCubeCube3D.prototype.boxClickToAxisMap = [
  [[0, 1, 1, 0], [2, 0, 0, 2],[2, 0, 0, 2], [0, 1, 1, 0]], // left
  [[1, 2, 2, 1], [0, 1, 1, 0],[0, 1, 1, 0], [1, 2, 2, 1]], // down
  [[2, 1, 1, 2], [0, 2, 2, 0],[0, 2, 2, 0], [2, 1, 1, 2]], // front
  [[0, 1, 1, 0], [2, 0, 0, 2],[2, 0, 0, 2], [0, 1, 1, 0]], // right
  [[1, 2, 2, 1], [0, 1, 1, 0],[0, 1, 1, 0], [1, 2, 2, 1]], // up
  [[2, 1, 1, 2], [0, 2, 2, 0],[0, 2, 2, 0], [2, 1, 1, 2]], // back
];
AbstractRevengeCubeCube3D.prototype.boxClickToAngleMap = [
  [[-1,-1,-1,-1], [-1,-1,-1, 1], [-1,-1,-1, 1], [-1, 1, 1,-1]],// left
  [[-1, 1, 1,-1], [ 1,-1,-1,-1], [ 1,-1,-1,-1], [-1,-1,-1,-1]],// down
  [[ 1, 1, 1, 1], [-1, 1, 1, 1], [-1, 1, 1, 1], [ 1,-1,-1, 1]],// front
  [[ 1, 1, 1, 1], [ 1, 1, 1,-1], [ 1, 1, 1,-1], [ 1,-1,-1, 1]],// right
  [[ 1,-1,-1, 1], [-1, 1, 1, 1], [-1, 1, 1, 1], [ 1, 1, 1, 1]],// up
  [[-1,-1,-1,-1], [ 1,-1,-1,-1], [ 1,-1,-1,-1], [-1, 1, 1,-1]],// back
];
AbstractRevengeCubeCube3D.prototype.boxClickToLayerMap = [
  [[1, 2, 4, 1], [4, 1, 1, 4], [2, 1, 1, 2], [1, 2, 4, 1]],// left
  [[1, 4, 2, 1], [2, 1, 1, 2], [4, 1, 1, 4], [1, 4, 2, 1]],// down
  [[8, 2, 4, 8], [2, 8, 8, 2], [4, 8, 8, 4], [8, 2, 4, 8]],// front
  [[8, 2, 4, 8], [4, 8, 8, 4], [2, 8, 8, 2], [8, 2, 4, 8]],// right
  [[8, 4, 2, 8], [2, 8, 8, 2], [4, 8, 8, 4], [8, 4, 2, 8]],// up
  [[1, 2, 4, 1], [2, 1, 1, 2], [4, 1, 1, 4], [1, 2, 4, 1]],// back
];
AbstractRevengeCubeCube3D.prototype.boxSwipeToAxisMap = [
  [1, 2, 1, 2], // left
  [2, 0, 2, 0], // down
  [1, 0, 1, 0], // front
  [1, 2, 1, 2], // right
  [2, 0, 2, 0], // up
  [1, 0, 1, 0], // back
];
AbstractRevengeCubeCube3D.prototype.boxSwipeToAngleMap = [
  [-1, -1, 1, 1], // left
  [1, 1, -1, -1], // down
  [1, -1, -1, 1], // front
  [1, 1, -1, -1], // right
  [-1, -1, 1, 1], // up
  [-1, 1, 1, -1], // back
];
AbstractRevengeCubeCube3D.prototype.boxSwipeToLayerMap = [
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
 *   0 1 2 3 4 5 6 7 8 91011
 *          +-------+
 * 0        |       |
 * 1        |   U   |
 * 2        |       |
 * 4        |       |
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
AbstractRevengeCubeCube3D.prototype.stickerOffsets = Cube3D.computeStickerOffsets(4);
// ------------------
class RevengeCubeCube3D extends AbstractRevengeCubeCube3D {
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
    let layerCount = this.cube.getLayerCount();
    let stickersPerFace = layerCount*layerCount;
      let a = new CubeAttributes.CubeAttributes(this.partCount, 6 * stickersPerFace, [stickersPerFace, stickersPerFace, stickersPerFace, stickersPerFace, stickersPerFace, stickersPerFace]);
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

  let faceOffset=0;
  for (let i=0;i<6;i++) {
    for (let j=0;j<a.getStickerCount(i);j++) {
      a.stickersFillColor[faceOffset+j]=faceColors[i];
      a.stickersPhong[faceOffset+j]=stickersPhong;
    }
    faceOffset+=a.getStickerCount(i)
  }

  return a;
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
  const c = new RevengeCubeCube3D(partSize);
  c.baseUrl = 'lib/';
  c.relativeUrl = relativeUrl;
  return c;
}
// ------------------
// MODULE API
// ------------------
export default {
  AbstractRevengeCubeCube3D: AbstractRevengeCubeCube3D,
  createCube3D: createCube3D,
};
