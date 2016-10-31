/*
 * @(#)ScriptParser.js  0.1  2011-08-12
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("ScriptParser", ["Notation","ScriptAST"],
function (Notation,AST) {

  /**
   * Represents an Abstract Syntax Tree Node
   */
  class Node {

  }

  class TwistNode extends Node {

    /** Script nodes. */
    constructor(axis, layerMask, angle) {
      this.axis = axis;
      this.angle = angle;
      this.layerMask = layerMask;
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
    /** Tries to consume the given TwistNode. 
     * Returns true if successful.
     * This TwistNode may return true for doesNothing afterwards!);
     */
    consume(that) {
      if (that.axis == this.axis
      && that.layerMask == this.layerMask) {
//var ts=this.toString();
        this.angle = (this.angle + that.angle) % 4;
        if (this.angle == 3)
          this.angle = -1;
        else if (this.angle == -3)
          this.angle = 1;
//console.log('consume:'+ts+' + '+that+" => "+this);    
        return true;
      }
      return false;
    }
    toString() {
      return 'TwistNode{ax:' + this.axis + ' an:' + this.angle + ' lm:' + this.layerMask + '}';
    }
  }

const UNKNOWN_MASK = 0;
const GROUPING_MASK = 1;
const CONJUGATION_MASK = 2;
const COMMUTATION_MASK = 4;
const ROTATION_MASK = 8;
const PERMUTATION_MASK = 16;
const INVERSION_MASK = 32;
const REFLECTION_MASK = 64;


  /**
   * Implements a parser for a specific notation..
   */
  class ScriptParser {
    /**
     * Creates a new parser.
     * @param {Notation} notation
     * @param {Map<String,MacroNode>} localMacros
     */
    constructor(notation, localMacros) {
      this.notation = notation;
      this.macros = [];
      
        if (localMacros != null) {
            for (let macro in localMacros) {
                macros.push(macro);
            }
        }
        // global macros override local macros
        for (let macro in notation.getMacros()) {
            macros.push(macro);
        }
      
    }

    /**
     * Parses the specified string.
     * @param {type} str
     * @throws a message if the parsing fails.
     */
    parse(str) {
      throw "parsing is not implemented yet";
    }
    
    /**
     * Parses a move.
     * 
     * @param {Tokenizer} t
     * @param {Node} parent
     * @returns {Node}
     * @throws {String} describing the parse error
     */
     parseMove(t, parent) {
        let move = new ScriptAST.MoveNode(notation.getLayerCount());
        parent.add(move);

        if (t.nextToken() != Tokenizer.TT_WORD) {
            throw "Move: Symbol missing.", t.getStartPosition(), t.getEndPosition();
        }
        move.setStartPosition(t.getStartPosition());
        let token = fetchGreedy(t.sval);
        let symbol = notation.getSymbolFor(token, Notation.Symbols.MOVE);

        if (Notation.Symbols.MOVE == symbol) {
            notation.configureMoveFromToken(move, token);
            move.setEndPosition(t.getStartPosition() + token.length() - 1);
            t.consumeGreedy(token);
        } else {
            throw "Move: Invalid token " + t.sval, t.getStartPosition(), t.getEndPosition();
        }
        return move;
    }
    
  }

  /** Returns an array of script nodes. */
  let createRandomScript = function (scrambleCount, scrambleMinCount) {
    if (scrambleCount == null)
      scrambleCount = 21;
    if (scrambleMinCount == null)
      scrambleMinCount = 6;

    var scrambler = new Array(Math.floor(Math.random() * scrambleCount - scrambleMinCount) + scrambleMinCount);

    // Keep track of previous axis, to avoid two subsequent moves on
    // the same axis.
    var prevAxis = -1;
    var axis, layerMask, angle;
    for (var i = 0; i < scrambleCount; i++) {
      while ((axis = Math.floor(Math.random() * 3)) == prevAxis) {
      }
      prevAxis = axis;
//    while ((layerMask = Math.floor(Math.random()*(1 << this.layerCount))) == 0) {}
      layerMask = 1 << Math.floor(Math.random() * this.layerCount);
      while ((angle = Math.floor(Math.random() * 5) - 2) == 0) {
      }
      scrambler[i] = new TwistNode(axis, layerMask, angle);
    }

    return scrambler;
  }

// ------------------
// MODULE API    
// ------------------
  return {
    ScriptParser: ScriptParser,
    createRandomScript: createRandomScript
  };
});
