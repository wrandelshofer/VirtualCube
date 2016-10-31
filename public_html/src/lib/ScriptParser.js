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
define("ScriptParser", ["Notation", "ScriptAST", "Tokenizer"],
function (Notation, AST, Tokenizer) {
let module = {
  log: (true) // Enable or disable logging for this module.
    ? function(msg) { console.log('ScriptParser.js '+msg); }
    : function() {}
}

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
      this.tokenizer = null;

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

    getTokenizer() {
      if (this.tokenizer == null) {
        let tt = new Tokenizer.GreedyTokenizer();
        tt.skipWhitespace();
        tt.parseNumbers();

        let tokenToSymbolMap = this.notation.getTokenToSymbolMap();
        for (let i in tokenToSymbolMap) {
          tt.addKeyword(i, tokenToSymbolMap[i]);
        }
        /*
         tt.addSpecials(this.notation.getSpecials());
         tt.addKeywords(this.notation.getKeywords());*/
        this.tokenizer = tt;
      }
      return this.tokenizer;
    }

    /**
     * Parses the specified string.
     * @param {type} str
     * @return {SequenceNode} the parsed script
     * @throws a message if the parsing fails.
     */
    parse(str) {
      let tt = this.getTokenizer();
      tt.setInput(str);
      let root = new AST.SequenceNode();
      let i=0;
      while (tt.nextToken() != Tokenizer.TT_EOF) {
        tt.pushBack();
        this.parseMove(tt, root);
        i++;
        if (i>100) throw "too many iterations! "+tt.getTokenType()+" pos:"+tt.pos;
      }
      return root;
    }

    /**
     * Parses a move.
     * 
     * @param {Tokenizer} t
     * @param {Node} parent
     * @returns {unresolved}
     * @throws parse exception
     */
    parseMove(t, parent) {
      let move = new AST.MoveNode(this.notation.getLayerCount());
      parent.add(move);

      if (t.nextToken() != Tokenizer.TT_KEYWORD) {
        throw "Move: \"" + t.getStringValue() + "\" is a "+t.getTokenType()+" but not a keyword. start:" + t.getStartPosition() + " end:" + t.getEndPosition();
      }
      let symbols = t.getSymbolValue();
      let symbol = null;
      for (let i = 0; i < symbols.length; i++) {
        if (symbols[i].getSymbol() == Notation.Symbol.MOVE) {
          symbol = symbols[i];
          break;
        }
      }
      if (symbol == null) {
        throw "Move: \"" + t.getStringValue() + "\" is not a Move. start:" + t.getStartPosition() + " end:" + t.getEndPosition();
      }

      move.setStartPosition(t.getStartPosition());
      move.setEndPosition(t.getEndPosition());
      move.setAxis(symbol.getAxis());
      move.setAngle(symbol.getAngle());
      move.setLayerMask(symbol.getLayerMask());
      return move;
    }

  }

  /** Returns an array of script nodes. */
  let createRandomScript = function (layerCount, scrambleCount, scrambleMinCount) {
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
      layerMask = 1 << Math.floor(Math.random() * layerCount);
      while ((angle = Math.floor(Math.random() * 5) - 2) == 0) {
      }
      scrambler[i] = new AST.MoveNode(layerCount,axis, layerMask, angle);
    }

    return scrambler;
  }

// ------------------
// MODULE API    
// ------------------
  return {
    ScriptParser: ScriptParser,
    createRandomScript: createRandomScript,
    newTwistNode: (axis, layerMask, angle) => new AST.MoveNode(3, axis, layerMask, angle)
  };
});
