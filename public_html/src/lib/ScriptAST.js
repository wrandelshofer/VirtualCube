/*
 * @(#)ScriptAST.js  0.1  2011-08-12
 * Copyright (c) 2011 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("ScriptAST", [],
  function () {

    /**
     * Represents an Abstract Syntax Tree Node
     */
    class Node {
      constructor(layerCount, startPosition, endPosition) {
        this.children = [];
        this.parent = null;
        this.layerCount = layerCount;
        this.startPostion = startPosition;
        this.endPosition = endPosition;
      }

      add(child) {
        if (child.parent != null) {
          child.removeFromParent();
        }
        child.parent = this;
        this.children.push(child);
      }
      remove(child) {
        if (child.parent == this) {
          let index = this.children.indexOf(child);
          if (index != -1) {
            this.children.splice(index, 1);
          }
          child.parent = null;
        }
      }

      removeFromParent() {
        if (this.parent != null) {
          this.parent.remove(this);
        }
      }
      getChildCount() {
        return this.children.length;
      }
      getChildAt(index) {
        return this.children[index];
      }

      setStartPosition(newValue) {
        this.startPosition = newValue;
      }
      setEndPosition(newValue) {
        this.endPosition = newValue;
      }

      getStartPosition() {
        return this.startPosition;
      }
      getEndPosition() {
        return this.endPosition;
      }

      applyTo(cube) {
        for (let i = 0; i < this.children.length; i++) {
          this.children[i].applyTo(cube);
        }
      }
    }

    /**
     * A CommutationNode holds a commutator A and a single child B.
     * The side effect of a commutation node is A B A' B'.
     */
    class CommutationNode extends Node {
      constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
        this.commutator = null;
      }
      setCommutator(newValue) {
        this.commutator = newValue;
      }
    }
    /**
     * A ConjugationNode holds a conjugator A and a single child B.
     * The side effect of a conjugation node is A B A'.
     */
    class ConjugationNode extends Node {
      constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
        this.conjugator = null;
      }
      setConjugator(newValue) {
        this.conjugator = newValue;
      }
    }
    class SequenceNode extends Node {
      constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
      }
    }
    class StatementNode extends Node {
      constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
      }
    }
    class GroupingNode extends Node {
      constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
        this.layerCount = layerCount;
      }
    }

    class InversionNode extends Node {
      constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
      }
    }

    class PermutationNode extends Node {
      constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
      }
    }

    class ReflectionNode extends Node {
      constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
      }
    }

    class RepetitionNode extends Node {
      constructor(layerCount, startPosition, endPosition, repeatCount) {
        super(layerCount, startPosition, endPosition);
        this.repeatCount = repeatCount;
      }
      setRepeatCount(newValue) {
        this.repeatCount = newValue;
      }
    }
    class NOPNode extends Node {
      constructor(layerCount, startPosition, endPosition) {
        super(layerCount, startPosition, endPosition);
      }
    }

    class MoveNode extends Node {

      /** Script nodes. */
      constructor(layerCount, axis, layerMask, angle) {
        super(layerCount, -1, -1);
        this.axis = axis;
        this.angle = angle;
        this.layerMask = layerMask;
      }

      setAxis(newValue) {
        this.axis = newValue;
      }
      setAngle(newValue) {
        this.angle = newValue;
      }
      setLayerCount(newValue) {
        this.layerCount = newValue;
      }
      setLayerMask(newValue) {
        this.layerMask = newValue;
      }

      /** Applies the node to the specified cube. */
      applyTo(cube) {
        if (!this.doesNothing()) {
          cube.transform(this.axis, this.layerMask, this.angle);
        }
      }
      /** Applies the inverse of the node to the specified cube. */
      applyInverseTo(cube) {
        if (!this.doesNothing()) {
          cube.transform(this.axis, this.layerMask, -this.angle);
        }
      }
      /** Returns true if this node does nothing. */
      doesNothing() {
        return this.angle == 0 || this.layerMask == 0;
      }
      /** Tries to consume the given MoveNode. 
       * Returns true if successful.
       * This MoveNode may return true for doesNothing afterwards!);
       */
      consume(that) {
        if (that.axis == this.axis
          && that.layerMask == this.layerMask) {
          this.angle = (this.angle + that.angle) % 4;
          if (this.angle == 3)
            this.angle = -1;
          else if (this.angle == -3)
            this.angle = 1;
          return true;
        }
        return false;
      }
      toString() {
        return 'MoveNode{ax:' + this.axis + ' an:' + this.angle + ' lm:' + this.layerMask + '}';
      }
    }

// ------------------
// MODULE API    
// ------------------
    return {
      CommutationNode: CommutationNode,
      ConjugationNode: ConjugationNode,
      GroupingNode: GroupingNode,
      InversionNode: InversionNode,
      Node: Node,
      MoveNode: MoveNode,
      NOPNode: NOPNode,
      ReflectionNode: ReflectionNode,
      RepetitionNode: RepetitionNode,
      SequenceNode: SequenceNode,
      StatementNode: StatementNode,
      PermutationNode: PermutationNode,
    };
  });
