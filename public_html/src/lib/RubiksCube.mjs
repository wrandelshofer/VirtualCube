/* @(#)RubiksCube.mjs
 * Copyright (c) 2018 Werner Randelshofer, Switzerland. MIT License.
 */

import Cube from './Cube.mjs';

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

/**
 * Represents the state of a 3-times sliced cube (Rubik's Cube) by the location 
 * and orientation of its parts.
 * <p>
 * A Rubik's Cube has 8 corner parts, 12 edge parts, 6 face parts and one
 * center part. The parts divide each face of the cube into 3 x 3 layers.
 * <p>
 * <b>Corner parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the corner parts:
 * <pre>
 *             +---+---+---+
 *             |4.0|   |2.0|
 *             +---     ---+
 *             |     1     |
 *             +---     ---+
 *             |6.0|   |0.0|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |4.1|   |6.2|6.1|   |0.2|0.1|   |2.2|2.1|   |4.2|
 * +---     ---+---     ---+---    +---+---     ---+
 * |     3     |     2     |     0     |     5     |
 * +---     ---+---     ---+---    +---+---     ---+
 * |5.2|   |7.1|7.2|   |1.1|1.2|   |3.1|3.2|   |5.1|
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |7.0|   |1.0|
 *             +---     ---+
 *             |     4     |
 *             +---     ---+
 *             |5.0|   |3.0|
 *             +---+---+---+
 * </pre>
 * <p>
 * <b>Edge parts</b>
 * <p>
 * The following diagram shows the initial orientations and locations of 
 * the edge parts:
 * <pre>
 *             +---+---+---+
 *             |   |3.1|   |
 *             +--- --- ---+
 *             |6.0| 1 |0.0|
 *             +--- --- ---+
 *             |   |9.1|   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 * |   |6.1|   |   |9.0|   |   |0.1|   |   |3.0|   |
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |7.0| 3 10.0|10.1 2 |1.1|1.0| 0 |4.0|4.1| 5 |7.1|
 * +--- --- ---+--- --- ---+--- --- ---+--- --- ---+
 * |   |8.1|   |   |11.0   |   |2.1|   |   |5.0|   |
 * +---+---+---+---+---+---+---+---+---+---+---+---+
 *             |   |11.1   |
 *             +--- --- ---+
 *             |8.0| 4 |2.0|
 *             +--- --- ---+
 *             |   |5.1|   |
 *             +---+---+---+
 * </pre>
 * <p>
 * <b>Side parts</b>
 * <p>
 * The following diagram shows the initial orientation and location of 
 * the face parts:
 * <pre>
 *             +------------+
 *             |     .1     |
 *             |    ---     |
 *             | .0| 1 |.2  |
 *             |    ---     |
 *             |     .3     |
 * +-----------+------------+-----------+-----------+
 * |     .0    |     .2     |     .3    |    .1     |
 * |    ---    |    ---     |    ---    |    ---    |
 * | .3| 3 |.1 | .1| 2 |.3  | .2| 0 |.0 | .0| 5 |.2 |
 * |    ---    |    ---     |    ---    |    ---    |
 * |     .2    |    .0      |     .1    |     .3    |
 * +-----------+------------+-----------+-----------+
 *             |     .0     |
 *             |    ---     |
 *             | .3| 4 |.1  |
 *             |    ---     |
 *             |     .2     |
 *             +------------+
 * </pre>
 * <p>
 * For more information about the location and orientation of the parts see
 * {@link Cube}.
 */
class RubiksCube extends Cube.Cube {
  /** Creates a new instance. */
  constructor() {
    super(3);
    this.reset();
  }

  /**
   * Returns the current layer mask on which the orientation of the part lies.
   * Returns 0 if no mask can be determined (the center part).
   */
  getPartLayerMask(part, orientation) {
    let face = this.getPartFace(part, orientation);
    if (part < this.cornerLoc.length) { // corner parts
        return (face < 3) ? 4 : 1;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length) { // edge parts
        return 2;
    } else if (part < this.cornerLoc.length + this.edgeLoc.length + this.sideLoc.length) {  // side parts
        return (face < 3) ? 4 : 1;
    } else { // center part
        return 0;
    }
  }
    
  /**
  * Transforms the cube without firing an event.
  *
  * @param  axis  0=x, 1=y, 2=z axis.
  * @param  layerMask A bitmask specifying the layers to be transformed.
  *           The size of the layer mask depends on the value returned by
  *           <code>getLayerCount(axis)</code>. The layer mask has the
  *           following meaning:
  *           7=rotate the whole cube;<br>
  *           1=twist slice near the axis (left, down, back)<br>
  *           2=twist slice in the middle of the axis<br>
  *           4=twist slice far away from the axis (right, top, up)
  * @param  angle  positive values=clockwise rotation<br>
  *                negative values=counterclockwise rotation<br>
  *               1=90 degrees<br>
  *               2=180 degrees
  */
  transform0(axis, layerMask, angle) {
    if (angle == 0) {
      return; // NOP
    }

    // Convert angle -2 to 2 to simplify the switch statements
    let an = (angle == -2) ? 2 : angle;

    if ((layerMask & 1) != 0) {
        let repeat;
        switch (an) {
        case -1: repeat=1; break;
        case  1: repeat=3; break;
        case  2: repeat=2; break;
        }
        for (let i=0;i<repeat;i++) {
            // twist at left, bottom, back
            switch (axis) {
            case 0: this.twistL(); break;
            case 1: this.twistD(); break;
            case 2: this.twistB(); break;
            }
        }
    }
    if ((layerMask & 2) != 0) {
        let repeat;
        switch (an) {
        case -1: repeat=3; break;
        case  1: repeat=1; break;
        case  2: repeat=2; break;
        }
        for (let i=0;i<repeat;i++) {
            // twist at left middle, bottom middle, back middle
            switch (axis) {
            case 0: this.twistMR(); break;
            case 1: this.twistMU(); break;
            case 2: this.twistMF(); break;
            }
        }
    }

    if ((layerMask & 4) != 0) {
        let repeat;
        switch (an) {
        case -1: repeat=3; break;
        case  1: repeat=1; break;
        case  2: repeat=2; break;
        }
        for (let i=0;i<repeat;i++) {
            // twist at right, top, front
            switch (axis) {
            case 0: this.twistR(); break;
            case 1: this.twistU(); break;
            case 2: this.twistF(); break;
            }
        }
    }
  }

  twistR() {
      this.fourCycle(this.cornerLoc, 0, 1, 3, 2, this.cornerOrient, 1, 2, 1, 2, 3);
      this.fourCycle(this.edgeLoc, 0, 1, 2, 4, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[0] = (this.sideOrient[0] + 3) % 4;
  }

  twistU() {
      this.fourCycle(this.cornerLoc, 0, 2, 4, 6, this.cornerOrient, 0, 0, 0, 0, 3);
      this.fourCycle(this.edgeLoc, 0, 3, 6, 9, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[1] = (this.sideOrient[1] + 3) % 4;
  }

  twistF() {
      this.fourCycle(this.cornerLoc, 6, 7, 1, 0, this.cornerOrient, 1, 2, 1, 2, 3);
      this.fourCycle(this.edgeLoc, 9, 10, 11, 1, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[2] = (this.sideOrient[2] + 3) % 4;
  }

  twistL() {
      this.fourCycle(this.cornerLoc, 6, 4, 5, 7, this.cornerOrient, 2, 1, 2, 1, 3);
      this.fourCycle(this.edgeLoc, 6, 7, 8, 10, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[3] = (this.sideOrient[3] + 3) % 4;
  }

  twistD() {
      this.fourCycle(this.cornerLoc, 7, 5, 3, 1, this.cornerOrient, 0, 0, 0, 0, 3);
      this.fourCycle(this.edgeLoc, 2, 11, 8, 5, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[4] = (this.sideOrient[4] + 3) % 4;
  }

  twistB() {
      this.fourCycle(this.cornerLoc, 2, 3, 5, 4, this.cornerOrient, 1, 2, 1, 2, 3);
      this.fourCycle(this.edgeLoc, 3, 4, 5, 7, this.edgeOrient, 1, 1, 1, 1, 2);
      this.sideOrient[5] = (this.sideOrient[5] + 3) % 4;
  }

  twistMR() {
      this.fourCycle(this.edgeLoc, 3, 9, 11, 5, this.edgeOrient, 1, 1, 1, 1, 2);
      this.fourCycle(this.sideLoc, 2, 4, 5, 1, this.sideOrient, 2, 3, 2, 1, 4);
  }

  twistMU() {
      this.fourCycle(this.edgeLoc, 1, 4, 7, 10, this.edgeOrient, 1, 1, 1, 1, 2);
      this.fourCycle(this.sideLoc, 3, 2, 0, 5, this.sideOrient, 2, 1, 2, 3, 4);
  }

  twistMF() {
      this.fourCycle(this.edgeLoc, 0, 6, 8, 2, this.edgeOrient, 1, 1, 1, 1, 2);
      this.fourCycle(this.sideLoc, 0, 1, 3, 4, this.sideOrient, 1, 2, 3, 2, 4);
  }

  clone() {
    let that = new RubiksCube();
    that.setTo(this);
    return that;
  }
}

// ------------------
// MODULE API    
// ------------------
export default {
    RubiksCube: RubiksCube,

};
