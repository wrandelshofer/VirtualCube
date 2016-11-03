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
    ? function (msg) {
      console.log('ScriptParser.js ' + msg);
    }
    : function () {},
    error: (true) // Enable or disable logging for this module.
    ? function (msg) {
      console.log('ScriptParser.js ERROR ' + msg);
    }
    : function () {}
  }

  class ParseException {
    constructor(msg, start, end) {
      this.msg = msg;
      this.start = start;
      this.end = end;
    }
    toString() {
      return this.msg+" at:"+this.start+".."+this.end;
    }
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
        let tt = new Tokenizer.Tokenizer();
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
      let i = 0;
      while (tt.nextToken() != Tokenizer.TT_EOF) {
        tt.pushBack();
        this.parseStatement(tt, root);
        i++;
        if (i > 1000)
          throw "too many iterations! " + tt.getTokenType() + " pos:" + tt.pos;
      }
      return root;
    }
    /**
     * Parses a Statement.
     * 
     * @param {Tokenizer} t
     * @param {Node} parent
     * @returns {unresolved} the parsed statement
     * @throws parse exception
     */
    parseStatement(t, parent) {
      // Fetch the next token.
      if (t.nextToken() != Tokenizer.TT_KEYWORD) {
        throw new ParseException("Statement: \"" + t.getStringValue() + "\" is a " + t.getTokenType() + " but not a keyword.", t.getStartPosition(), t.getEndPosition());
      }
      let symbols = t.getSymbolValue();

      // Evaluate: Macro
      if (symbols.length == 0) {
        throw new ParseException("Statement: Unknown statement " + t.sval, t.getStartPosition(), t.getEndPosition());
      }

      // Is it a Macro?
      for (let i = 0; i < symbols.length; i++) {
        let s = symbols[i];
        if (s.getSymbol() == Notation.Symbol.MACRO) {
          t.pushBack();
          return this.parseMacro(t, parent);
        }
      }

      // Is it a Move?
      for (let i = 0; i < symbols.length; i++) {
        let s = symbols[i];
        if (s.getSymbol() == Notation.Symbol.MOVE) {
          t.pushBack();
          return this.parseMove(t, parent);
        }
      }

      // Is it a NOP?
      for (let i = 0; i < symbols.length; i++) {
        let s = symbols[i];
        if (s.getSymbol() == Notation.Symbol.NOP) {
          t.pushBack();
          return this.parseNOP(t, parent);
        }
      }

      /*
       
       // Is it a Permutation sign token? Parse a permutation.
       if (notation.getSyntax(Symbol.PERMUTATION) == Syntax.PREFIX && (notation.isTokenFor(token, Symbol.PERMUTATION_PLUS) || notation.isTokenFor(token, Symbol.PERMUTATION_MINUS) || notation.isTokenFor(token, Symbol.PERMUTATION_PLUSPLUS))) {
       int startpos = t.getStartPosition();
       t.pushBack();
       Symbol sign = parsePermutationSign(t, parent);
       if (sign != null) {
       if (t.nextToken() != StreamTokenizer.TT_WORD) {
       throw new ParseException(
       "Permutation: Unexpected token - expected a word.", t.getStartPosition(), t.getEndPosition());
       }
       token = fetchGreedy(t.sval);
       if (!notation.isTokenFor(token, Symbol.PERMUTATION_BEGIN)) {
       throw new ParseException(
       "Permutation: Unexpected token - expected permutation begin.", t.getStartPosition(), t.getEndPosition());
       }
       t.consumeGreedy(token);
       
       PermutationNode pnode = (PermutationNode) parsePermutation(t, parent, startpos, sign);
       return pnode;
       }
       }
       
       // Okay, it's not a move and not a permutation sign.
       // Since we allow for some ambiguity of the
       // tokens used by the grouping, conjugation, commutation and permutation
       // statement it gets a little bit complicated here.
       // Create a bit mask with a bit for each expected statement.
       int expressionMask
       = ((notation.isTokenFor(token, Symbol.GROUPING_BEGIN)) ? GROUPING_MASK : UNKNOWN_MASK) | //
       ((notation.getSyntax(Symbol.CONJUGATION) == Syntax.PRECIRCUMFIX && notation.isTokenFor(token, Symbol.CONJUGATION_BEGIN)) ? CONJUGATION_MASK : UNKNOWN_MASK) | //
       ((notation.getSyntax(Symbol.COMMUTATION) == Syntax.PRECIRCUMFIX && notation.isTokenFor(token, Symbol.COMMUTATION_BEGIN)) ? COMMUTATION_MASK : UNKNOWN_MASK) | //
       ((notation.getSyntax(Symbol.ROTATION) == Syntax.PRECIRCUMFIX && notation.isTokenFor(token, Symbol.ROTATION_BEGIN)) ? ROTATION_MASK : UNKNOWN_MASK) | //
       ((notation.getSyntax(Symbol.INVERSION) == Syntax.CIRCUMFIX && notation.isTokenFor(token, Symbol.INVERSION_BEGIN)) ? INVERSION_MASK : UNKNOWN_MASK) | //
       ((notation.getSyntax(Symbol.REFLECTION) == Syntax.CIRCUMFIX && notation.isTokenFor(token, Symbol.REFLECTION_BEGIN)) ? REFLECTION_MASK : UNKNOWN_MASK) | //
       ((notation.isSupported(Symbol.PERMUTATION) && notation.isTokenFor(token, Symbol.PERMUTATION_BEGIN)) ? PERMUTATION_MASK : UNKNOWN_MASK);
       
       // Is it a Permutation Begin token without any ambiguity?
       if (expressionMask == PERMUTATION_MASK) {
       int p = t.getStartPosition();
       t.consumeGreedy(token);
       return parsePermutation(t, parent, p, null);
       
       // Is it an ambiguous permutation begin token?
       } else if ((expressionMask & PERMUTATION_MASK) == PERMUTATION_MASK) {
       int p = t.getStartPosition();
       t.consumeGreedy(token);
       
       // Look ahead
       if (t.nextToken() != StreamPosTokenizer.TT_WORD) {
       throw new ParseException("Statement: Word missing.", t.getStartPosition(), t.getEndPosition());
       }
       // Lets be greedy.
       token = fetchGreedy(t.sval);
       t.pushBack();
       if (token != null
       && notation.isTokenFor(token, Symbol.PERMUTATION)
       && !notation.isTokenFor(token, Symbol.GROUPING_BEGIN)) {
       return parsePermutation(t, parent, p, null);
       } else {
       return parseCompoundStatement(t, parent, p, expressionMask);
       }
       
       // Is it one of the other Begin tokens?
       } else if (expressionMask != UNKNOWN_MASK) {
       int p = t.getStartPosition();
       t.consumeGreedy(token);
       return parseCompoundStatement(t, parent, p, expressionMask);
       }
       */
      throw new ParseException("Statement: Invalid Statement " + t.sval, t.getStartPosition(), t.getEndPosition());
    }

    /** Parses a NOP. 
     * 
     * @param {Tokenizer} t
     * @param {Node} parent
     * @returns {unresolved} the parsed move
     * @throws parse exception
     */
    parseNOP(t, parent) {
      if (t.nextToken() != Tokenizer.TT_KEYWORD) {
        throw new ParseException("NOP: \"" + t.getStringValue() + "\" is a " + t.getTokenType() + " but not a keyword.", t.getStartPosition(), t.getEndPosition());
      }
      let symbols = t.getSymbolValue();
      let symbol = null;
      for (let i = 0; i < symbols.length; i++) {
        if (symbols[i].getSymbol() == Notation.Symbol.NOP) {
          symbol = symbols[i];
          break;
        }
      }
      if (symbol == null) {
        throw new ParseException("Move: \"" + t.getStringValue() + "\" is not a NOP", t.getStartPosition(), t.getEndPosition());
      }

      module.log('parsing NOP: "' + t.getStringValue() + '".');
      let nop = new AST.NOPNode(t.getStartPosition(), t.getEndPosition());
      parent.add(nop);
      return nop;
    }

    /**
     * Parses a move.
     * 
     * @param {Tokenizer} t
     * @param {Node} parent
     * @returns {unresolved} the parsed move
     * @throws parse exception
     */
    parseMove(t, parent) {
      let move = new AST.MoveNode(this.notation.getLayerCount());
      parent.add(move);

      if (t.nextToken() != Tokenizer.TT_KEYWORD) {
        throw new ParseException("Move: \"" + t.getStringValue() + "\" is a " + t.getTokenType() + " but not a keyword.", t.getStartPosition(), t.getEndPosition());
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
        throw new ParseException("Move: \"" + t.getStringValue() + "\" is not a Move", t.getStartPosition(), t.getEndPosition());
      }

      module.log('parsing Move: "' + t.getStringValue() + '".');
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
      scrambler[i] = new AST.MoveNode(layerCount, axis, layerMask, angle);
    }

    return scrambler;
  }

// ------------------
// MODULE API    
// ------------------
  return {
    ParseException:ParseException,
    ScriptParser: ScriptParser,
    createRandomScript: createRandomScript,
    newTwistNode: (axis, layerMask, angle) => new AST.MoveNode(3, axis, layerMask, angle)
  };
});
