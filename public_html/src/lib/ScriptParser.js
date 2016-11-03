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
    ? function (msg, args) {
      if (args === undefined)
        console.log('ScriptParser.js ' + msg);
      else
        console.log('ScriptParser.js ' + msg, args);
    }
    : function () {},

    warning: (true) // Enable or disable logging for this module.
    ? function (msg, args) {
      if (args === undefined)
        console.log('ScriptParser.js WARNING ' + msg);
      else
        console.log('ScriptParser.js WARNING ' + msg, args);
    }
    : function () {},

    error: (true) // Enable or disable logging for this module.
    ? function (msg, args) {
      if (args === undefined)
        console.log('ScriptParser.js ERROR ' + msg);
      else
        console.log('ScriptParser.js ERROR ' + msg, args);
    }
    : function () {}
  };

  class ParseException {
    constructor(msg, start, end) {
      this.msg = msg;
      this.start = start;
      this.end = end;
    }
    toString() {
      return this.msg + " at:" + this.start + ".." + this.end;
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
     * Returns true if the array contains a symbol of the specified symbol type
     * @param {type} array of symbols
     * @param {type} type desired type
     * @return true if array contains a symbol of the specified type
     */
    containsType(symbols, type) {
      for (let i = 0; i < symbols.length; i++) {
        let s = symbols[i];
        if (s.getType() == type) {
          return true;
        }
      }
      return false;
    }
    /**
     * Returns true if the array contains a symbol of the specified symbol type
     * @param {type} array of symbols
     * @param {type} type desired type
     * @return true if array contains a symbol of the specified type
     */
    intersectsTypes(symbols, types) {
      for (let i = 0; i < symbols.length; i++) {
        let s = symbols[i];
        for (let j = 0; j < types.length; j++) {
          let type = types[j];
          if (s.getType() == type) {
            return true;
          }
        }
      }
      return false;
    }
    /**
     * Returns true if the array contains at least one symbol, and
     * only symbols of the specified symbol type.
     * 
     * @param {type} array of symbols
     * @param {type} type desired type
     * @return true if array contains a symbol of the specified type
     */
    isType(symbols, type) {
      for (let i = 0; i < symbols.length; i++) {
        let s = symbols[i];
        if (s.getType() != type) {
          return false;
        }
      }
      return symbols.length > 0;
    }
    /**
     * Extracts the first symbol which has one of the types
     * @param {type} array of symbols
     * @param {type} types selection of types
     * @return a symbol or null
     */
    extractSymbol(symbols, types) {
      for (let i = 0; i < symbols.length; i++) {
        let s = symbols[i];
        if (types[s.getType()] != null) {
          return s;
        }
      }
      return null;
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
      let ntn = this.notation;
      let Sym = Notation.Symbol;
      let Stx = Notation.Syntax;

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
      if (this.containsType(symbols, Sym.MACRO)) {
        t.pushBack();
        return this.parseMacro(t, parent);
      }

      // Is it a Move?
      if (this.containsType(symbols, Sym.MOVE)) {
        t.pushBack();
        return this.parseMove(t, parent);
      }

      // Is it a NOP?
      if (this.containsType(symbols, Sym.NOP)) {
        t.pushBack();
        return this.parseNOP(t, parent);
      }


      // Is it a Permutation sign token? Parse a permutation.
      let sign = this.extractSymbol(symbols, [Sym.PERMUTATION_PLUS,
        Sym.PERMUTATION_MINUS,
        Sym.PERMUTATION_PLUSPLUS]);
      if (ntn.isSyntax(Sym.PERMUTATION, Notation.Syntax.PREFIX)
      && sign != null) {
        let startpos = t.getStartPosition();
        t.pushBack();
        if (t.nextToken() != StreamTokenizer.TT_KEYWORD) {
          throw new ParseException(
          "Permutation: Unexpected token - expected a keyword.", t.getStartPosition(), t.getEndPosition());
        }
        symbols = t.getSymbolValue();
        if (!this.containsType(symbols, Sym.PERMUTATION_BEGIN)) {
          throw new ParseException(
          "Permutation: Unexpected token - expected permutation begin.", t.getStartPosition(), t.getEndPosition());
        }

        let pnode = this.parsePermutation(t, parent, startpos, sign);
        return pnode;
      }
      // Okay, it's not a move and not a permutation sign.
      // Since we allow for some ambiguity of the
      // tokens used by the grouping, conjugation, commutation and permutation
      // statement it gets a little bit complicated here.
      // Create a bit mask with a bit for each expected statement.
      let expressionMask
      = ((this.containsType(symbols, Sym.GROUPING_BEGIN)) ? GROUPING_MASK : UNKNOWN_MASK) | //
      ((ntn.isSyntax(Sym.CONJUGATION, Stx.PRECIRCUMFIX) && this.containsType(symbol, Sym.CONJUGATION_BEGIN)) ? CONJUGATION_MASK : UNKNOWN_MASK) | //
      ((ntn.isSyntax(Sym.COMMUTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.COMMUTATION_BEGIN)) ? COMMUTATION_MASK : UNKNOWN_MASK) | //
      ((ntn.isSyntax(Sym.ROTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.ROTATION_BEGIN)) ? ROTATION_MASK : UNKNOWN_MASK) | //
      ((ntn.isSyntax(Sym.INVERSION, Stx.CIRCUMFIX) && this.containsType(symbols, Sym.INVERSION_BEGIN)) ? INVERSION_MASK : UNKNOWN_MASK) | //
      ((ntn.isSyntax(Sym.REFLECTION, Stx.CIRCUMFIX) && this.containsType(symbols, Sym.REFLECTION_BEGIN)) ? REFLECTION_MASK : UNKNOWN_MASK) | //
      ((ntn.isSupported(Sym.PERMUTATION) && this.containsType(symbols, Sym.PERMUTATION_BEGIN)) ? PERMUTATION_MASK : UNKNOWN_MASK);

      // Is it a Permutation Begin token without any ambiguity?
      if (expressionMask == PERMUTATION_MASK) {
        return parsePermutation(t, parent, p, null);
      }

      // Is it an ambiguous permutation begin token?
      if ((expressionMask & PERMUTATION_MASK) == PERMUTATION_MASK) {
        let startPos = t.getStartPosition();
        // Look ahead
        if (t.nextToken() != Tokenizer.TT_KEYWORD) {
          throw new ParseException("Statement: keyword expected.", t.getStartPosition(), t.getEndPosition());
        }
        symbols = t.getSymbolValue();
        t.pushBack();
        if (symbols != null && this.intersectsTypes(symbols, Sym.PERMUTATION.getSubSymbols())) {
          return this.parsePermutation(t, parent, startPos);
        } else {
          return this.parseCompoundStatement(t, parent, startPos,expressionMask ^ PERMUTATION_MASK);
        }
      }

      // Is it one of the other Begin tokens?
      if (expressionMask != UNKNOWN_MASK) {
        return parseCompoundStatement(t, parent, expressionMask);
      }

      throw new ParseException("Statement: Invalid Statement " + t.sval, t.getStartPosition(), t.getEndPosition());
    }

    /** Parses the remainder of a permutation statement after its PERMUTATION_BEGIN token has been consumed. 
     * 
     * @param {Tokenizer} t
     * @param {Node} parent
     * @param {int} startPos the start position of the PERMUTATION_BEGIN begin token
     * @returns {unresolved} the parsed permutation
     * @throws parse exception
     */
    parsePermutation(t, parent, startPos) {
      throw new ParseException("Permutation: Not implemented " + t.sval, t.getStartPosition(), t.getEndPosition());
    }
    /** Parses a compound statement after its XXX_BEGIN token has been consumed. 
     * 
     * @param {Tokenizer} t
     * @param {Node} parent
     * @param {int} startPos the start position of the XXX_BEGIN begin token
     * @param {int} beginTypeMask the mask indicating which XXX_BEGIN token was consumed
     * @returns {unresolved} the parsed compound statement
     * @throws parse exception
     */
    parseCompoundStatement(t, parent, startPos, beginTypeMask) {
      let ntn = this.notation;
      let Sym = Notation.Symbol;
      let Stx = Notation.Syntax;
      
      let seq1 = new AST.SequenceNode();
      seq1.setStartPosition(startPos);
      parent.add(seq1);
      let seq2 = null;
      let grouping = seq1;

        // The final type mask reflects the final type that we have determined
        // after parsing all of the grouping.
        let finalTypeMask = beginTypeMask & (GROUPING_MASK | CONJUGATION_MASK | COMMUTATION_MASK | ROTATION_MASK | REFLECTION_MASK | INVERSION_MASK);
      
        // Evaluate: {Statement} , (GROUPING_END | COMMUTATION_END | CONJUGATION_END | ROTATION_END) ;
        TheGrouping:
        while (true) {
            switch (t.nextToken()) {
                case Tokenizer.TT_KEYWORD:
                  let symbols = t.getSymbolValue();
                    // Look ahead the nextElement token.

                    let endTypeMask
                            = ((this.containsType(symbols, Sym.GROUPING_END)) ? GROUPING_MASK : UNKNOWN_MASK) | //
                            ((ntn.isSyntax(Sym.CONJUGATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.CONJUGATION_END)) ? CONJUGATION_MASK : UNKNOWN_MASK) | //
                            ((ntn.isSyntax(Sym.COMMUTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.COMMUTATION_END)) ? COMMUTATION_MASK : UNKNOWN_MASK) | //
                            ((ntn.isSyntax(Sym.INVERSION, Stx.CIRCUMFIX) && this.containsType(symbols, Sym.INVERSION_END)) ? INVERSION_MASK : UNKNOWN_MASK) | //
                            ((ntn.isSyntax(Sym.REFLECTION, Stx.CIRCUMFIX) && this.containsType(symbols, Sym.REFLECTION_END)) ? REFLECTION_MASK : UNKNOWN_MASK) | //
                            ((ntn.isSyntax(Sym.ROTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.ROTATION_END)) ? ROTATION_MASK : UNKNOWN_MASK);
                    let delimiterTypeMask
                            = ((ntn.isSyntax(Symbol.CONJUGATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.CONJUGATION_DELIMITER)) ? CONJUGATION_MASK : 0) 
                            | ((ntn.isSyntax(Sym.COMMUTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.COMMUTATION_DELIMITER)) ? COMMUTATION_MASK : 0) 
                            | ((ntn.isSyntax(Sym.ROTATION, Stx.PRECIRCUMFIX) && this.containsType(symbols, Sym.ROTATION_DELIMITER)) ? ROTATION_MASK : 0);

                    if (endTypeMask != 0) {
                        finalTypeMask &= endTypeMask;
                        grouping.setEndPosition(t.getEndPosition());
                        break TheGrouping;

                    } else if (delimiterTypeMask != 0) {
                        finalTypeMask &= delimiterTypeMask;
                        if (finalTypeMask == 0) {
                            throw new ParseException("Grouping: Invalid delimiter.", t.getStartPosition(), t.getEndPosition());
                        }
                        if (seq2 == null) {
                            seq1.setEndPosition(t.getStartPosition());
                            seq2 = new SequenceNode(notation.getLayerCount());
                            seq2.setStartPosition(t.getEndPosition());
                            parent.add(seq2);
                            grouping = seq2;
                        } else {
                            throw new ParseException("Grouping: Delimiter must occur only once", t.getStartPosition(), t.getEndPosition());
                        }
 
                    } else {
                        t.pushBack();
                        this.parseExpression(t, grouping);
                    }
                    break;
                case StreamPosTokenizer.TT_EOF:
                    throw new ParseException(
                            "Grouping: End missing.", t.getStartPosition(), t.getEndPosition());
                default:
                    throw new ParseException(
                            "Grouping: Internal error.", t.getStartPosition(), t.getEndPosition());
            }
        }
      
        seq1.removeFromParent();
        if (seq2 == null) {
            // There is no second sequence. 
            // The compound statement can only be a grouping.
            finalTypeMask &= GROUPING_MASK;
        } else {
            // There is a second sequence. Remove it from its parent, because we
            // will integrate it into the compound statement.
            seq2.removeFromParent();

            // The compound statement can not be a grouping.
            finalTypeMask &= -1 ^ GROUPING_MASK;
        }
      
        switch (finalTypeMask) {
            case GROUPING_MASK:
                if (seq2 != null) {
                    throw new ParseException(
                            "Grouping: Invalid Grouping.", startPos, t.getEndPosition());
                } else {
                    grouping = new AST.GroupingNode(ntn.getLayerCount(), startPos, t.getEndPosition());
                    while (seq1.getChildCount() > 0) {
                        grouping.add(seq1.getChildAt(0));
                    }
                }
                break;

            case INVERSION_MASK:
                if (seq2 != null) {
                    throw new ParseException(
                            "Inversion: Invalid Inversion.", startPos, t.getEndPosition());
                } else {
                    grouping = new AST.InversionNode(ntn.getLayerCount(), startPos, t.getEndPosition());
                    while (seq1.getChildCount() > 0) {
                        grouping.add(seq1.getChildAt(0));
                    }
                }
                break;

            case REFLECTION_MASK:
                if (seq2 != null) {
                    throw new ParseException(
                            "Reflection: Invalid Reflection.", startPos, t.getEndPosition());
                } else {
                    grouping = new AST.ReflectionNode(notation.getLayerCount(), startPos, t.getEndPosition());
                    while (seq1.getChildCount() > 0) {
                        grouping.add(seq1.getChildAt(0));
                    }
                }
                break;

            case CONJUGATION_MASK:
                if (seq2 == null) {
                    throw new ParseException(
                            "Conjugation: Conjugate missing.", startPos, t.getEndPosition());
                } else {
                    grouping = new AST.ConjugationNode(notation.getLayerCount(), seq1, seq2, startPos, t.getEndPosition());
                }
                break;

            case COMMUTATION_MASK:
                if (seq2 == null) {
                    if (seq1.getChildCount() == 2 && seq1.getSymbol() == Symbol.SEQUENCE) {
                        grouping = new AST.CommutationNode(notation.getLayerCount(), seq1.getChildAt(0), seq1.getChildAt(1), startPos, t.getEndPosition());
                    } else {
                        throw new ParseException(
                                "Commutation: Commutee missing.", startPos, t.getEndPosition());
                    }
                } else {
                    grouping = new AST.CommutationNode(notation.getLayerCount(), seq1, seq2, startPos, t.getEndPosition());
                }
                break;

            case ROTATION_MASK:
                if (seq2 == null) {
                    throw new ParseException(
                            "Rotation: Rotatee missing.", startPos, t.getEndPosition());
                } else {
                    grouping = new AST.RotationNode(notation.getLayerCount(), seq1, seq2, startPos, t.getEndPosition());
                }
                break;

            default:
                let ambiguous = '';
                if ((finalTypeMask & GROUPING_MASK) != 0) {
                    ambiguous+=("Grouping");
                }
                if ((finalTypeMask & INVERSION_MASK) != 0) {
                    if (ambiguous.length != 0) {
                        ambiguous+=(" or ");
                    }
                    ambiguous+=("Inversion");
                }
                if ((finalTypeMask & REFLECTION_MASK) != 0) {
                    if (ambiguous.length != 0) {
                        ambiguous+=(" or ");
                    }
                    ambiguous+=("Reflection");
                }
                if ((finalTypeMask & CONJUGATION_MASK) != 0) {
                    if (ambiguous.length != 0) {
                        ambiguous+=(" or ");
                    }
                    ambiguous.append("Conjugation");
                }
                if ((finalTypeMask & COMMUTATION_MASK) != 0) {
                    if (ambiguous.length() != 0) {
                        ambiguous+=(" or ");
                    }
                    ambiguous+=("Commutation");
                }
                if ((finalTypeMask & ROTATION_MASK) != 0) {
                    if (ambiguous.length() != 0) {
                        ambiguous+=(" or ");
                    }
                    ambiguous+=("Rotation");
                }
                throw new ParseException(
                        "Compound Statement: Ambiguous compound statement, possibilities are " + ambiguous + ".", startPos, t.getEndPosition());
        }

        parent.add(grouping);
        return grouping;
    }
    /** Parses a macro. 
     * 
     * @param {Tokenizer} t
     * @param {Node} parent
     * @returns {unresolved} the parsed macro
     * @throws parse exception
     */
    parseMacro(t, parent) {
      throw new ParseException("Macro: Not implemented " + t.sval, t.getStartPosition(), t.getEndPosition());
    }
    /** Parses a NOP. 
     * 
     * @param {Tokenizer} t
     * @param {Node} parent
     * @returns {unresolved} the parsed NOP
     * @throws parse exception
     */
    parseNOP(t, parent) {
      if (t.nextToken() != Tokenizer.TT_KEYWORD) {
        throw new ParseException("NOP: \"" + t.getStringValue() + "\" is a " + t.getTokenType() + " but not a keyword.", t.getStartPosition(), t.getEndPosition());
      }
      let symbols = t.getSymbolValue();
      if (!this.containsType(symbols, Notation.Symbol.NOP)) {
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
        if (symbols[i].getType() == Notation.Symbol.MOVE) {
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
    ParseException: ParseException,
    ScriptParser: ScriptParser,
    createRandomScript: createRandomScript,
    newTwistNode: (axis, layerMask, angle) => new AST.MoveNode(3, axis, layerMask, angle)
  };
});
