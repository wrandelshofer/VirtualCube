/* @(#)Cube7Cube3D.mjs
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
 *  Subclasses must call initAbstractCube7Cube3D().
 */
class AbstractCube7Cube3D extends Cube3D.Cube3D {
  constructor(partSize) {
    super();

    this.cubeSize = partSize * 7;

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
    this.partSize = (partSize === undefined) ? 2.0 : partSize;

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
    let cornerOffset = this.cornerOffset;
    let ps = this.partSize;

    // Move all corner parts to up right front (= position of corner[0]).
    // nothing to do

    // Rotate the corner parts into place

    // 0:urf
    //--no transformation---
    // 1:dfr
    this.identityPartLocations[cornerOffset + 1].rotate(180, 0, 0, 1);
    this.identityPartLocations[cornerOffset + 1].rotate(90, 0, 1, 0);
    // 2:ubr
    this.identityPartLocations[cornerOffset + 2].rotate(270, 0, 1, 0);
    // 3:drb
    this.identityPartLocations[cornerOffset + 3].rotate(180, 0, 0, 1);
    this.identityPartLocations[cornerOffset + 3].rotate(180, 0, 1, 0);
    // 4:ulb
    this.identityPartLocations[cornerOffset + 4].rotate(180, 0, 1, 0);
    // 5:dbl
    this.identityPartLocations[cornerOffset + 5].rotate(180, 1, 0, 0);
    this.identityPartLocations[cornerOffset + 5].rotate(90, 0, 1, 0);
    // 6:ufl
    this.identityPartLocations[cornerOffset + 6].rotate(90, 0, 1, 0);
    // 7:dlf
    this.identityPartLocations[cornerOffset + 7].rotate(180, 0, 0, 1);

    // Move all corner stickers to 0.0 (to up at the urf corner)
    // 0:urf
    //this.stickers[17].matrix.makeIdentity();
    this.stickers[0].matrix.rotate(-90, 0, 1, 0);
    this.stickers[0].matrix.rotate(90, 0, 0, 1);
    this.stickers[20].matrix.rotate(90, 0, 1, 0);
    this.stickers[20].matrix.rotate(90, 1, 0, 0);
    // 1:dfr
    //this.stickers[38].matrix.makeIdentity();
    this.stickers[26].matrix.rotate(-90, 0, 1, 0);
    this.stickers[26].matrix.rotate(90, 0, 0, 1);
    this.stickers[ 6].matrix.rotate(90, 0, 1, 0);
    this.stickers[ 6].matrix.rotate(90, 1, 0, 0);
    // 2:ubr
    //this.stickers[11].matrix.makeIdentity();
    this.stickers[45].matrix.rotate(-90, 0, 1, 0);
    this.stickers[45].matrix.rotate(90, 0, 0, 1);
    this.stickers[2].matrix.rotate(90, 0, 1, 0);
    this.stickers[2].matrix.rotate(90, 1, 0, 0);
    // 3:drb
    //this.stickers[44].matrix.makeIdentity();
    this.stickers[8].matrix.rotate(-90, 0, 1, 0);
    this.stickers[8].matrix.rotate(90, 0, 0, 1);
    this.stickers[51].matrix.rotate(90, 0, 1, 0);
    this.stickers[51].matrix.rotate(90, 1, 0, 0);
    // 4:ulb
    //this.stickers[9].matrix.makeIdentity();
    this.stickers[27].matrix.rotate(-90, 0, 1, 0);
    this.stickers[27].matrix.rotate(90, 0, 0, 1);
    this.stickers[47].matrix.rotate(90, 0, 1, 0);
    this.stickers[47].matrix.rotate(90, 1, 0, 0);
    // 5:dbl
    //this.stickers[42].matrix.makeIdentity();
    this.stickers[53].matrix.rotate(-90, 0, 1, 0);
    this.stickers[53].matrix.rotate(90, 0, 0, 1);
    this.stickers[33].matrix.rotate(90, 0, 1, 0);
    this.stickers[33].matrix.rotate(90, 1, 0, 0);
    // 6:ufl
    //this.stickers[15].matrix.makeIdentity();
    this.stickers[18].matrix.rotate(-90, 0, 1, 0);
    this.stickers[18].matrix.rotate(90, 0, 0, 1);
    this.stickers[29].matrix.rotate(90, 0, 1, 0);
    this.stickers[29].matrix.rotate(90, 1, 0, 0);
    // 7:dlf
    //this.stickers[36].matrix.makeIdentity();
    this.stickers[35].matrix.rotate(-90, 0, 1, 0);
    this.stickers[35].matrix.rotate(90, 0, 0, 1);
    this.stickers[24].matrix.rotate(90, 0, 1, 0);
    this.stickers[24].matrix.rotate(90, 1, 0, 0);


    // Move the corner stickers into place
    // 0:urf
    this.identityStickerLocations[17].translate(0, ps * 3, 0);
    this.identityStickerLocations[17].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[ 0].translate(ps * 3, 0, 0);
    this.identityStickerLocations[ 0].rotate(180, 0, 0, 1);
    this.identityStickerLocations[ 0].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[20].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[20].rotate(-90, 0, 1, 0);

    // 1:dfr
    this.identityStickerLocations[38].translate(0, ps * -3, 0);
    this.identityStickerLocations[38].rotate(90, 0, 0, 1);
    this.identityStickerLocations[38].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[26].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[ 6].translate(ps * 3, 0, 0);
    this.identityStickerLocations[ 6].rotate(-90, 0, 0, 1);
    this.identityStickerLocations[ 6].rotate(-90, 1, 0, 0);

    // 2:ubr
    this.identityStickerLocations[11].translate(0, ps * 3, 0);
    this.identityStickerLocations[11].rotate(90, 0, 0, 1);
    this.identityStickerLocations[11].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[45].translate(ps * 6, 0, 0);
    this.identityStickerLocations[45].rotate(180, 0, 0, 1);
    this.identityStickerLocations[45].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[ 2].translate(ps * 3, 0, 0);
    this.identityStickerLocations[ 2].rotate(90, 0, 0, 1);
    this.identityStickerLocations[ 2].rotate(-90, 1, 0, 0);

    // 3:drb
    this.identityStickerLocations[44].translate(0, ps * -3, 0);
    this.identityStickerLocations[44].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[ 8].translate(ps * 3, 0, 0);
    this.identityStickerLocations[ 8].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[51].translate(ps * 6, 0, 0);
    this.identityStickerLocations[51].rotate(-90, 0, 0, 1);
    this.identityStickerLocations[51].rotate(-90, 1, 0, 0);

    // 4:ulb
    this.identityStickerLocations[ 9].translate(0, ps * 3, 0);
    this.identityStickerLocations[ 9].rotate(180, 0, 0, 1);
    this.identityStickerLocations[ 9].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[27].translate(ps * -3, 0, 0);
    this.identityStickerLocations[27].rotate(180, 0, 0, 1);
    this.identityStickerLocations[27].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[47].translate(ps * 6, 0, 0);
    this.identityStickerLocations[47].rotate(90, 0, 0, 1);
    this.identityStickerLocations[47].rotate(-90, 1, 0, 0);

    // 5:dbl
    this.identityStickerLocations[42].translate(0, ps * -3, 0);
    this.identityStickerLocations[42].rotate(-90, 0, 0, 1);
    this.identityStickerLocations[42].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[53].translate(ps * 6, 0, 0);
    this.identityStickerLocations[53].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[33].translate(ps * -3, 0, 0);
    this.identityStickerLocations[33].rotate(-90, 0, 0, 1);
    this.identityStickerLocations[33].rotate(-90, 1, 0, 0);

    // 6:ufl
    this.identityStickerLocations[15].translate(0, ps * 3, 0);
    this.identityStickerLocations[15].rotate(-90, 0, 0, 1);
    this.identityStickerLocations[15].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[18].rotate(180, 0, 0, 1);
    this.identityStickerLocations[18].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[29].translate(ps * -3, 0, 0);
    this.identityStickerLocations[29].rotate(90, 0, 0, 1);
    this.identityStickerLocations[29].rotate(-90, 1, 0, 0);

    // 7:dlf
    this.identityStickerLocations[36].translate(0, ps * -3, 0);
    this.identityStickerLocations[36].rotate(180, 0, 0, 1);
    this.identityStickerLocations[36].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[35].translate(ps * -3, 0, 0);
    this.identityStickerLocations[35].rotate(-90, 1, 0, 0);
    this.identityStickerLocations[24].rotate(-90, 0, 0, 1);
    this.identityStickerLocations[24].rotate(-90, 1, 0, 0);
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
    let edgeOffset = this.edgeOffset;

    // Move all edge parts to up right (ur)
    // nothing to do

    // Rotate edge parts into place
    // ur
    //--no transformation--
    // rf
    this.identityPartLocations[edgeOffset + 1].rotate(90, 0, 0, -1);
    this.identityPartLocations[edgeOffset + 1].rotate(90, 0, 1, 0);
    // dr
    this.identityPartLocations[edgeOffset + 2].rotate(180, 1, 0, 0);
    // bu
    this.identityPartLocations[edgeOffset + 3].rotate(90, 0, 0, 1);
    this.identityPartLocations[edgeOffset + 3].rotate(90, 1, 0, 0);
    // rb
    this.identityPartLocations[edgeOffset + 4].rotate(90, 0, 0, -1);
    this.identityPartLocations[edgeOffset + 4].rotate(90, 0, -1, 0);
    // bd
    this.identityPartLocations[edgeOffset + 5].rotate(90, 1, 0, 0);
    this.identityPartLocations[edgeOffset + 5].rotate(90, 0, -1, 0);
    // ul
    this.identityPartLocations[edgeOffset + 6].rotate(180, 0, 1, 0);
    // lb
    this.identityPartLocations[edgeOffset + 7].rotate(90, 0, 0, 1);
    this.identityPartLocations[edgeOffset + 7].rotate(90, 0, -1, 0);
    // dl
    this.identityPartLocations[edgeOffset + 8].rotate(180, 0, 1, 0);
    this.identityPartLocations[edgeOffset + 8].rotate(180, 1, 0, 0);
    // fu
    this.identityPartLocations[edgeOffset + 9].rotate(-90, 1, 0, 0);
    this.identityPartLocations[edgeOffset + 9].rotate(90, 0, -1, 0);
    // lf
    this.identityPartLocations[edgeOffset + 10].rotate(90, 0, 1, 0);
    this.identityPartLocations[edgeOffset + 10].rotate(-90, 1, 0, 0);
    // fd
    this.identityPartLocations[edgeOffset + 11].rotate(90, 0, 0, -1);
    this.identityPartLocations[edgeOffset + 11].rotate(-90, 1, 0, 0);

    // Move all edge stickers to 0.0 (to up at the ur corner)
    // ur
    this.stickers[1].matrix.rotate(180, 0, 1, 0);
    this.stickers[1].matrix.rotate(90, 0, 0, 1);
    // rf
    this.stickers[23].matrix.rotate(180, 0, 1, 0);
    this.stickers[23].matrix.rotate(90, 0, 0, 1);
    // dr
    this.stickers[7].matrix.rotate(180, 0, 1, 0);
    this.stickers[7].matrix.rotate(90, 0, 0, 1);
    // bu
    this.stickers[10].matrix.rotate(180, 0, 1, 0);
    this.stickers[10].matrix.rotate(90, 0, 0, 1);
    // rb
    this.stickers[48].matrix.rotate(180, 0, 1, 0);
    this.stickers[48].matrix.rotate(90, 0, 0, 1);
    // bd
    this.stickers[43].matrix.rotate(180, 0, 1, 0);
    this.stickers[43].matrix.rotate(90, 0, 0, 1);
    // ul
    this.stickers[28].matrix.rotate(180, 0, 1, 0);
    this.stickers[28].matrix.rotate(90, 0, 0, 1);
    // lb
    this.stickers[50].matrix.rotate(180, 0, 1, 0);
    this.stickers[50].matrix.rotate(90, 0, 0, 1);
    // dl
    this.stickers[34].matrix.rotate(180, 0, 1, 0);
    this.stickers[34].matrix.rotate(90, 0, 0, 1);
    // fu
    this.stickers[16].matrix.rotate(180, 0, 1, 0);
    this.stickers[16].matrix.rotate(90, 0, 0, 1);
    // lf
    this.stickers[21].matrix.rotate(180, 0, 1, 0);
    this.stickers[21].matrix.rotate(90, 0, 0, 1);
    // fd
    this.stickers[37].matrix.rotate(180, 0, 1, 0);
    this.stickers[37].matrix.rotate(90, 0, 0, 1);

    // Rotate the edge stickers into place
    // ur
    this.identityStickerLocations[14].translate(0, ps * 3, 0);
    this.identityStickerLocations[14].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[ 1].translate(ps * 3, 0, 0);
    this.identityStickerLocations[ 1].rotate(90, 0, 0, 1); // @19
    this.identityStickerLocations[ 1].rotate(-90, 1, 0, 0); // @23
    // rf
    this.identityStickerLocations[ 3].translate(ps * 3, 0, 0);
    this.identityStickerLocations[ 3].rotate(180, 0, 0, 1); //
    this.identityStickerLocations[ 3].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[23].rotate(-90, 1, 0, 0); // @23
    // dr
    this.identityStickerLocations[41].translate(0, ps * -3, 0);
    this.identityStickerLocations[41].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[ 7].translate(ps * 3, 0, 0);
    this.identityStickerLocations[ 7].rotate(-90, 0, 0, 1); // @25
    this.identityStickerLocations[ 7].rotate(-90, 1, 0, 0); // @23
    // bu
    this.identityStickerLocations[46].translate(ps * 6, ps * 0, 0);
    this.identityStickerLocations[46].rotate(90, 0, 0, 1); // @19
    this.identityStickerLocations[46].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[10].translate(ps * 0, ps * 3, 0);
    this.identityStickerLocations[10].rotate(90, 0, 0, 1); // @19
    this.identityStickerLocations[10].rotate(-90, 1, 0, 0); // @23
    // rb
    this.identityStickerLocations[ 5].translate(ps * 3, 0, 0);
    this.identityStickerLocations[ 5].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[48].translate(ps * 6, 0, 0);
    this.identityStickerLocations[48].rotate(180, 0, 0, 1); // @21
    this.identityStickerLocations[48].rotate(-90, 1, 0, 0); // @23
    // bd
    this.identityStickerLocations[52].translate(ps * 6, ps * 0, 0);
    this.identityStickerLocations[52].rotate(90, 0, 0, -1); // @25
    this.identityStickerLocations[52].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[43].translate(ps * 0, ps * -3, 0);
    this.identityStickerLocations[43].rotate(-90, 0, 0, 1); // @25
    this.identityStickerLocations[43].rotate(-90, 1, 0, 0); // @23
    // ul
    this.identityStickerLocations[12].translate(ps * 0, ps * 3, 0);
    this.identityStickerLocations[12].rotate(180, 0, 0, 1); // @21
    this.identityStickerLocations[12].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[28].translate(ps * -3, ps * 0, 0);
    this.identityStickerLocations[28].rotate(90, 0, 0, 1); // @19
    this.identityStickerLocations[28].rotate(-90, 1, 0, 0); // @23
    // lb
    this.identityStickerLocations[30].translate(ps * -3, ps * 0, 0);
    this.identityStickerLocations[30].rotate(180, 0, 0, 1); // @21
    this.identityStickerLocations[30].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[50].translate(ps * 6, ps * 0, 0);
    this.identityStickerLocations[50].rotate(-90, 1, 0, 0); // @23
    // dl
    this.identityStickerLocations[39].translate(ps * 0, ps * -3, 0);
    this.identityStickerLocations[39].rotate(180, 0, 0, 1); // @21
    this.identityStickerLocations[39].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[34].translate(ps * -3, ps * 0, 0);
    this.identityStickerLocations[34].rotate(-90, 0, 0, 1); // @25
    this.identityStickerLocations[34].rotate(-90, 1, 0, 0); // @23
    // fu
    this.identityStickerLocations[19].translate(ps * 0, ps * -0, 0);
    this.identityStickerLocations[19].rotate(90, 0, 0, 1); // @19
    this.identityStickerLocations[19].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[16].translate(ps * 0, ps * 3, 0);
    this.identityStickerLocations[16].rotate(-90, 0, 0, 1); // @25
    this.identityStickerLocations[16].rotate(-90, 1, 0, 0); // @23
    // lf
    this.identityStickerLocations[32].translate(ps * -3, ps * -0, 0);
    this.identityStickerLocations[32].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[21].rotate(180, 0, 0, 1); // @21
    this.identityStickerLocations[21].rotate(-90, 1, 0, 0); // @23
    // fd
    this.identityStickerLocations[25].rotate(90, 0, 0, -1); // @21
    this.identityStickerLocations[25].rotate(-90, 1, 0, 0); // @23
    this.identityStickerLocations[37].translate(ps * 0, ps * -3, 0);
    this.identityStickerLocations[37].rotate(90, 0, 0, 1); // @19
    this.identityStickerLocations[37].rotate(-90, 1, 0, 0); // @23
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
    let sideOffset = this.sideOffset;

    // Move all side parts to right (= position of side[0]
    // nothing to do

    // Rotate the side parts into place
    // r
    // --no transformation--
    // u
    this.identityPartLocations[sideOffset + 1].rotate(90, 0, 0, 1);
    this.identityPartLocations[sideOffset + 1].rotate(-90, 1, 0, 0);
    // f
    this.identityPartLocations[sideOffset + 2].rotate(90, 0, 1, 0);
    this.identityPartLocations[sideOffset + 2].rotate(90, 1, 0, 0);
    // l
    this.identityPartLocations[sideOffset + 3].rotate(180, 0, 1, 0);
    this.identityPartLocations[sideOffset + 3].rotate(-90, 1, 0, 0);
    // d
    this.identityPartLocations[sideOffset + 4].rotate(90, 0, 0, -1);
    this.identityPartLocations[sideOffset + 4].rotate(180, 1, 0, 0);
    // b
    this.identityPartLocations[sideOffset + 5].rotate(90, 0, -1, 0);
    this.identityPartLocations[sideOffset + 5].rotate(180, 1, 0, 0);

    // Rotate the side stickers into place
    // r
    this.identityStickerLocations[4].translate(3 * partSize, 0, 0);
    this.identityStickerLocations[4].rotate(90, 0, 1, 0);
    // u
    this.identityStickerLocations[13].translate(0, 3 * partSize, 0);
    this.identityStickerLocations[13].rotate(90, 0, 1, 0);
    this.identityStickerLocations[13].rotate(180, 1, 0, 0);
    // f
    this.identityStickerLocations[22].rotate(90, 0, 1, 0);
    this.identityStickerLocations[22].rotate(90, 1, 0, 0);
    // l
    this.identityStickerLocations[31].translate(-3 * partSize, 0, 0);
    this.identityStickerLocations[31].rotate(90, 0, 1, 0);
    this.identityStickerLocations[31].rotate(-90, 1, 0, 0);
    // d
    this.identityStickerLocations[40].translate(0, -3 * partSize, 0);
    this.identityStickerLocations[40].rotate(90, 0, 1, 0);
    this.identityStickerLocations[40].rotate(-90, 1, 0, 0);
    // b
    this.identityStickerLocations[49].translate(6 * partSize, 0, 0);
    this.identityStickerLocations[49].rotate(90, 0, 1, 0);
    this.identityStickerLocations[49].rotate(180, 1, 0, 0);

    // ----------------------------
    // Reset all rotations
    for (let i = 0; i < this.partCount; i++) {
      this.partLocations[i].matrix.load(this.identityPartLocations[i]);
    }
    for (let i = 0; i < this.stickerCount; i++) {
      this.stickerLocations[i].matrix.load(this.identityStickerLocations[i]);
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
    this.cornerObj.selectedObject = "corner0";
    this.corner_rObj.setTo(obj);
    this.corner_rObj.selectedObject = "corner0_r";
    this.initAbstractCube7Cube3D_corner_r();
    this.corner_uObj.setTo(obj);
    this.corner_uObj.selectedObject = "corner0_u";
    this.initAbstractCube7Cube3D_corner_u();
    this.corner_fObj.setTo(obj);
    this.corner_fObj.selectedObject = "corner0_f";
    this.initAbstractCube7Cube3D_corner_f();
    this.edgeObj.setTo(obj);
    this.edgeObj.selectedObject = "edge0";
    this.edge_rObj.setTo(obj);
    this.edge_rObj.selectedObject = "edge0_r";
    this.initAbstractCube7Cube3D_edge_r();
    this.edge_uObj.setTo(obj);
    this.edge_uObj.selectedObject = "edge0_u";
    this.initAbstractCube7Cube3D_edge_u();

    this.sideObj.setTo(obj);
    this.sideObj.selectedObject = "side0";
    this.side_rObj.setTo(obj);
    this.side_rObj.selectedObject = "side0_r";
    this.initAbstractCube7Cube3D_side_r();

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

  initAbstractCube7Cube3D_corner_r() {
    let s = this.corner_rObj;
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);

    this.stickerObjs[ 0] = s.clone();
    this.stickerObjs[ 8] = s180.clone();
    this.stickerObjs[18] = s.clone();
    this.stickerObjs[26] = s180.clone();
    this.stickerObjs[27] = s.clone();
    this.stickerObjs[35] = s180.clone();
    this.stickerObjs[45] = s.clone();
    this.stickerObjs[53] = s180.clone();

    this.initAbstractCube7Cube3D_textureScales();
  }
  initAbstractCube7Cube3D_corner_f() {
    let s = this.corner_fObj;
    let s180 = new J3DI.J3DIObj();
    s180.setTo(s);
    s180.rotateTexture(180);

    this.stickerObjs[ 2] = s.clone();
    this.stickerObjs[ 6] = s180.clone();
    this.stickerObjs[20] = s.clone();
    this.stickerObjs[24] = s180.clone();
    this.stickerObjs[29] = s.clone();
    this.stickerObjs[33] = s180.clone();
    this.stickerObjs[47] = s.clone();
    this.stickerObjs[51] = s180.clone();

    this.initAbstractCube7Cube3D_textureScales();
  }
  initAbstractCube7Cube3D_corner_u() {
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

    this.stickerObjs[ 9] = s180.clone();
    this.stickerObjs[11] = s90.clone();
    this.stickerObjs[15] = s270.clone();
    this.stickerObjs[17] = s.clone();
    this.stickerObjs[36] = s180.clone();
    this.stickerObjs[38] = s90.clone();
    this.stickerObjs[42] = s270.clone();
    this.stickerObjs[44] = s.clone();

    this.initAbstractCube7Cube3D_textureScales();
  }
  initAbstractCube7Cube3D_edge_u() {
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

    this.stickerObjs[12] = s180.clone();
    this.stickerObjs[14] = s.clone();
    this.stickerObjs[19] = s90.clone();
    this.stickerObjs[46] = s90.clone();
    this.stickerObjs[30] = s180.clone();
    this.stickerObjs[32] = s.clone();
    this.stickerObjs[ 3] = s180.clone();
    this.stickerObjs[ 5] = s.clone();
    this.stickerObjs[25] = s270.clone();
    this.stickerObjs[52] = s270.clone();
    this.stickerObjs[39] = s180.clone();
    this.stickerObjs[41] = s.clone();

    this.initAbstractCube7Cube3D_textureScales();
  }
  initAbstractCube7Cube3D_edge_r() {
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

    this.stickerObjs[ 1] = s.clone();
    this.stickerObjs[10] = s.clone();
    this.stickerObjs[16] = s180.clone();
    this.stickerObjs[28] = s.clone();
    this.stickerObjs[34] = s180.clone();
    this.stickerObjs[ 7] = s180.clone();
    this.stickerObjs[21] = s90.clone();
    this.stickerObjs[23] = s270.clone();
    this.stickerObjs[48] = s90.clone();
    this.stickerObjs[50] = s270.clone();
    this.stickerObjs[37] = s.clone();
    this.stickerObjs[43] = s180.clone();

    this.initAbstractCube7Cube3D_textureScales();
  }
  initAbstractCube7Cube3D_side_r() {
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

    this.initAbstractCube7Cube3D_textureScales();
  }
  initAbstractCube7Cube3D_textureScales() {
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

  /* Immediately completes the current twisting animation. */
   finishTwisting() {
     this.isTwisting=null;
   }

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
AbstractCube7Cube3D.prototype.stickerToPartMap = [
  0, 8, 2, 9, 20, 12, 1, 10, 3, // right
  4, 11, 2, 14, 21, 8, 6, 17, 0, // up
  6, 17, 0, 18, 22, 9, 7, 19, 1, // front
  4, 14, 6, 15, 23, 18, 5, 16, 7, // left
  7, 19, 1, 16, 24, 10, 5, 13, 3, // down
  2, 11, 4, 12, 25, 15, 3, 13, 5  // back
];

/** Maps parts to stickers. This is a two dimensional array. The first
 * dimension is the part index, the second dimension the orientation of
 * the part.
 * This map is filled in by the init method!!
 */
AbstractCube7Cube3D.prototype.partToStickerMap = null;

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
AbstractCube7Cube3D.prototype.stickerToFaceMap = [
  1, 1, 2, 0, 0, 0, 2, 1, 1, // right
  0, 1, 0, 0, 0, 0, 0, 1, 0, // up
  1, 0, 2, 1, 0, 1, 2, 0, 1, // front
  1, 1, 2, 0, 0, 0, 2, 1, 1, // left
  0, 1, 0, 0, 0, 0, 0, 1, 0, // down
  1, 0, 2, 1, 0, 1, 2, 0, 1 // back
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

    a.faceCount = 6;
    a.stickerOffsets = [0, 9, 18, 27, 36, 45];
    a.stickerCounts = [9, 9, 9, 9, 9, 9];

    return a;
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

