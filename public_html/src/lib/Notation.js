/*
 * @(#)Notation.js  0.1  2011-08-12
 *
 * Copyright (c) 2011-2012 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("Notation", [],
function () {

  let Syntax = {
    /**
     * Binary prefix syntax: The affix is placed between begin and end before
     * the root.
     * <pre>
     * Binary Prefix ::= Begin , Affix , End , Root ;
     * </pre>
     *
     * Unary prefix syntax: The affix is placed before the root.
     * <pre>
     * Unary Prefix ::= Affix , Root ;
     * </pre>
     */
    PREFIX: "prefix",
    /**
     * Binary suffix syntax: The affix is placed between begin and end after
     * the root.
     * <pre>
     * Binary Suffix ::= Root , Begin , Affix , End ;
     * </pre>
     *
     * Unary suffix syntax: The affix is placed after the root.
     * <pre>
     * Suffix ::= Root, Affix ;
     * </pre>
     */
    SUFFIX: "suffix",
    /**
     * Circumfix syntax: The root is placed between begin and end.
     * <pre>
     * Circumfix ::= Begin , Root , End ;
     * </pre>
     */
    CIRCUMFIX: "circumfix",
    /**
     * Pre-Circumfix syntax: The affix is placed before the root.
     * Begin, delimiter and end tokens are placed around them.
     * <pre>
     * Precircumfix ::= Begin , Affix , Delimiter , Root , End ;
     * </pre>
     */
    PRECIRCUMFIX: "precircumfix",
    /**
     * Post-Circumfix syntax: The affix is placed after the root.
     * Begin, delimiter and end tokens are placed around them.
     * <pre>
     * Postcircumfix ::= Begin , Root , Delimiter , Affix , End ;
     * </pre>
     */
    POSTCIRCUMFIX: "postcircumfix",
    /**
     * Binary Pre-Infix syntax: The affix is placed between pre-root and post-root.
     * <pre>
     * Infix ::= Pre-Root , Affix, Post-Root;
     * </pre>
     */
    PREINFIX: "preinfix",
    /**
     * Binary Post-Infix syntax: The affix is placed between post-root and pre-root.
     * <pre>
     * Infix ::= Post-Root , Affix , Pre-Root;
     * </pre>
     */
    POSTINFIX: "postinfix"


  };

  class Symbol {
    getType() {
      return this;
    }
  }

  /** Defines a symbol. */
  class RegularSymbol extends Symbol {
    /**
     * 
     * @param {String} name
     * @param {String} alternativeName
     * @param {Array<Symbol>} terminalSymbols
     */
    constructor(name, alternativeName, terminalSymbols) {
      super();
      this.name = name;
      this.alternativeName = alternativeName;
      this.subSymbols = terminalSymbols;
    }
    isTerminalSymbol() {
      return this.subSymbols == null;
    }
    isSubSymbol(s) {
      if (this.subSymbols != null) {
        for (let i = 0; i < this.subSymbols.length; i++) {
          if (s == this.subSymbols[i])
            return true;
        }
        return false;
      } else {
        return s == this;
      }
    }
    getSubSymbols() {
      return this.subSymbols;// XXX should return a clone
    }

    getName() {
      return this.name;
    }

    getAlternativeName() {
      return this.alternativeName;
    }

    toString() {
      return this.name;
    }
  }


  /**
   * Terminal symbols.
   */
  Symbol.NOP = new RegularSymbol("NOP");
  Symbol.MOVE = new RegularSymbol("move", "twist");
  Symbol.FACE_R = new RegularSymbol("permR");
  Symbol.FACE_U = new RegularSymbol("permU");
  Symbol.FACE_F = new RegularSymbol("permF");
  Symbol.FACE_L = new RegularSymbol("permL");
  Symbol.FACE_D = new RegularSymbol("permD");
  Symbol.FACE_B = new RegularSymbol("permB");
  Symbol.PERMUTATION_PLUS = new RegularSymbol("permPlus");
  Symbol.PERMUTATION_MINUS = new RegularSymbol("permMinus");
  Symbol.PERMUTATION_PLUSPLUS = new RegularSymbol("permPlusPlus");
  Symbol.PERMUTATION_BEGIN = new RegularSymbol("permBegin", "permutationBegin");
  Symbol.PERMUTATION_END = new RegularSymbol("permEnd", "permutationEnd");
  Symbol.PERMUTATION_DELIMITER = new RegularSymbol("permDelim", "permutationDelimiter");
  Symbol.DELIMITER = new RegularSymbol("delimiter", "statementDelimiter");
  Symbol.INVERSION_BEGIN = new RegularSymbol("inversionBegin");
  Symbol.INVERSION_END = new RegularSymbol("inversionEnd");
  Symbol.INVERSION_DELIMITER = new RegularSymbol("inversionDelim");
  Symbol.INVERTOR = new RegularSymbol("invertor");
  Symbol.REFLECTION_BEGIN = new RegularSymbol("reflectionBegin");
  Symbol.REFLECTION_END = new RegularSymbol("reflectionEnd");
  Symbol.REFLECTION_DELIMITER = new RegularSymbol("reflectionDelim");
  Symbol.REFLECTOR = new RegularSymbol("reflector");
  Symbol.GROUPING_BEGIN = new RegularSymbol("groupingBegin", "sequenceBegin");
  Symbol.GROUPING_END = new RegularSymbol("groupingEnd", "sequenceEnd");
  Symbol.REPETITION_BEGIN = new RegularSymbol("repetitionBegin", "repetitorBegin");
  Symbol.REPETITION_END = new RegularSymbol("repetitionEnd", "repetitorEnd");
  Symbol.REPETITION_DELIMITER = new RegularSymbol("repetitionDelim", "repetitorDelimiter");
  Symbol.COMMUTATION_BEGIN = new RegularSymbol("commutationBegin", "commutatorBegin");
  Symbol.COMMUTATION_END = new RegularSymbol("commutationEnd", "commutatorEnd");
  Symbol.COMMUTATION_DELIMITER = new RegularSymbol("commutationDelim", "commutatorDelimiter");
  Symbol.CONJUGATION_BEGIN = new RegularSymbol("conjugationBegin", "conjugatorBegin");
  Symbol.CONJUGATION_END = new RegularSymbol("conjugationEnd", "conjugatorEnd");
  Symbol.CONJUGATION_DELIMITER = new RegularSymbol("conjugationDelim", "conjugatorDelimiter");
  Symbol.ROTATION_BEGIN = new RegularSymbol("rotationBegin", "rotatorBegin");
  Symbol.ROTATION_END = new RegularSymbol("rotationEnd", "rotatorEnd");
  Symbol.ROTATION_DELIMITER = new RegularSymbol("rotationDelim", "rotatorDelimiter");
  Symbol.MACRO = new RegularSymbol("macro");
  Symbol.MULTILINE_COMMENT_BEGIN = new RegularSymbol("commentMultiLineBegin", "slashStarCommentBegin");
  Symbol.MULTILINE_COMMENT_END = new RegularSymbol("commentMultiLineEnd", "slashStarCommentEnd");
  Symbol.SINGLELINE_COMMENT_BEGIN = new RegularSymbol("commentSingleLineBegin", "slashSlashComment");

  Symbol.COMMUTATION = new RegularSymbol("commutation", [
    Symbol.COMMUTATION_BEGIN,
    Symbol.COMMUTATION_END,
    Symbol.COMMUTATION_DELIMITER
  ]);
  Symbol.CONJUGATION = new RegularSymbol("conjugation", [
    Symbol.CONJUGATION_BEGIN,
    Symbol.CONJUGATION_END,
    Symbol.CONJUGATION_DELIMITER
  ]);
  Symbol.GROUPING = new RegularSymbol("grouping", [
    Symbol.GROUPING_BEGIN,
    Symbol.GROUPING_END
  ]);
  Symbol.INVERSION = new RegularSymbol("inversion", [
    Symbol.INVERSION_BEGIN,
    Symbol.INVERSION_END,
    Symbol.INVERSION_DELIMITER,
    Symbol.INVERTOR
  ]);
  Symbol.PERMUTATION = new RegularSymbol("permutation", [
    Symbol.FACE_R,
    Symbol.FACE_U,
    Symbol.FACE_F,
    Symbol.FACE_L,
    Symbol.FACE_D,
    Symbol.FACE_B,
    Symbol.PERMUTATION_PLUS,
    Symbol.PERMUTATION_MINUS,
    Symbol.PERMUTATION_PLUSPLUS,
    Symbol.PERMUTATION_BEGIN,
    Symbol.PERMUTATION_END,
    Symbol.PERMUTATION_DELIMITER
  ]);
  Symbol.REFLECTION = new RegularSymbol("reflection", [
    Symbol.REFLECTION_BEGIN,
    Symbol.REFLECTION_END,
    Symbol.REFLECTION_DELIMITER,
    Symbol.REFLECTOR
  ]);
  Symbol.REPETITION = new RegularSymbol("repetition", [
    Symbol.REPETITION_BEGIN,
    Symbol.REPETITION_END,
    Symbol.REPETITION_DELIMITER
  ]);
  Symbol.ROTATION = new RegularSymbol("rotation", [
    Symbol.ROTATION_BEGIN,
    Symbol.ROTATION_END,
    Symbol.ROTATION_DELIMITER
  ]);
  Symbol.COMMENT = new RegularSymbol("comment", [
    Symbol.MULTILINE_COMMENT_BEGIN,
    Symbol.MULTILINE_COMMENT_END,
    Symbol.SINGLELINE_COMMENT_BEGIN
  ]);
  Symbol.STATEMENT = new RegularSymbol("statement", [
    Symbol.NOP,
    Symbol.MOVE,
    Symbol.GROUPING,
    Symbol.INVERSION,
    Symbol.REFLECTION,
    Symbol.CONJUGATION,
    Symbol.COMMUTATION,
    Symbol.ROTATION,
    Symbol.PERMUTATION,
    Symbol.DELIMITER,
    Symbol.REPETITION
  ]);
  Symbol.SEQUENCE = new RegularSymbol("sequence", [
    Symbol.STATEMENT,
    Symbol.COMMENT
  ]);

  /**
   * Symbol for a move.
   * Instances of this class are immutable.
   * <p>
   * This class must be Java 1.1 compliant.
   *
   * @author Werner Randelshofer.
   * @version 2.0 2007-06-16 Renamed from Twist to Move.
   * <br>1.0 May 1, 2006 Created.
   */
  class MoveSymbol extends Symbol {
    constructor(axis, layerMask, angle) {
      super();
      this.axis = axis;
      this.layerMask = layerMask;
      this.angle = angle;
    }

    /**
     * Returns an inverse Move of this Move.
     */
    toInverse() {
      return new MoveSymbol(this.axis, this.layerMask, -this.angle);
    }

    getAxis() {
      return this.axis;
    }

    getAngle() {
      return this.angle;
    }

    getLayerMask() {
      return this.layerMask;
    }

    getLayerList() {
      let buf = "";
      for (let i = 0; i < 8; i++) {
        if ((this.layerMask & (1 << i)) != 0) {
          if (buf.length() > 0) {
            buf += ',';
          }
          buf += (i + 1);
        }
      }
      return buf;
    }

    toString() {
      return "Move axis=" + this.axis + " mask=" + this.layerMask + " angle=" + this.angle;
    }
    /** Gets the type of the symbol. 
     * (Actually this is like requesting the class of the symbol.
     */
    getType() {
      return Symbol.MOVE;
    }
  }
  Symbol.R = new MoveSymbol(0, 4, 1);
  Symbol.L = new MoveSymbol(0, 1, -1);
  Symbol.U = new MoveSymbol(1, 4, 1);
  Symbol.D = new MoveSymbol(1, 1, -1);
  Symbol.F = new MoveSymbol(2, 4, 1);
  Symbol.B = new MoveSymbol(2, 1, -1);
  Symbol.RI = new MoveSymbol(0, 4, -1);
  Symbol.LI = new MoveSymbol(0, 1, 1);
  Symbol.UI = new MoveSymbol(1, 4, -1);
  Symbol.DI = new MoveSymbol(1, 1, 1);
  Symbol.FI = new MoveSymbol(2, 4, -1);
  Symbol.BI = new MoveSymbol(2, 1, 1);
  Symbol.R2 = new MoveSymbol(0, 4, 2);
  Symbol.L2 = new MoveSymbol(0, 1, 2);
  Symbol.U2 = new MoveSymbol(1, 4, 2);
  Symbol.D2 = new MoveSymbol(1, 1, 2);
  Symbol.F2 = new MoveSymbol(2, 4, 2);
  Symbol.B2 = new MoveSymbol(2, 1, 2);
  Symbol.CR = new MoveSymbol(0, 7, 1);
  Symbol.CL = new MoveSymbol(0, 7, -1);
  Symbol.CU = new MoveSymbol(1, 7, 1);
  Symbol.CD = new MoveSymbol(1, 7, -1);
  Symbol.CF = new MoveSymbol(2, 7, 1);
  Symbol.CB = new MoveSymbol(2, 7, -1);
  Symbol.CR2 = new MoveSymbol(0, 7, 2);
  Symbol.CL2 = new MoveSymbol(0, 7, 2);
  Symbol.CU2 = new MoveSymbol(1, 7, 2);
  Symbol.CD2 = new MoveSymbol(1, 7, 2);
  Symbol.CF2 = new MoveSymbol(2, 7, 2);
  Symbol.CB2 = new MoveSymbol(2, 7, 2);

  /** Defines a notation. */
  class Notation {
    constructor() {
      this.macros = [];
      this.keywords = [];
      this.specials = [];

      this.layerCount = 3;
      this.symbolToTokenMap = {};
      this.tokenToSymbolMap = {};
      this.moveToTokenMap = {};
      this.tokenToMoveMap = {};
      this.symbolToSyntaxMap = {};
    }

    /**
     * Returns the macros defined by this notation.
     * @returns {Array<MacroNode>} macros;
     */
    getMacros() {
      return this.macros;
    }
    getKeywords() {
      return this.keywords;
    }
    getSpecials() {
      return this.specials;
    }
    getLayerCount() {
      return this.layerCount;
    }
    addToken(symbol, token) {
      // Add to symbolToTokenMap
      if (null == this.symbolToTokenMap[symbol]) {
        this.symbolToTokenMap[symbol] = token;
      }

      // Add to tokenToSymbolMap
      let symbols = this.tokenToSymbolMap[token];
      if (symbols == null) {
        symbols = [];
        this.tokenToSymbolMap[token] = symbols;
      }
      symbols.push(symbol);
      if (Symbol.PERMUTATION.isSubSymbol(symbol)) {
        symbols.add(Symbol.PERMUTATION);
      }
    }

    getTokenToSymbolMap() {
      return this.tokenToSymbolMap;
    }
    isSyntax(symbol,syntax) {
      return this.symbolToSyntaxMap[symbol]==syntax;
    }
  }
  /** Defines a default notation that works for 3x3 and 2x2 cubes. */
  class DefaultNotation extends Notation {
    constructor(layerCount) {
      super();

      this.layerCount = layerCount == null ? 3 : layerCount;

      this.keywords = [
        'R', 'U', 'F', 'L', 'D', 'B',
        'R2', 'U2', 'F2', 'L2', 'D2', 'B2',
        "R'", "U'", "F'", "L'", "D'", "B'",
        'MR', 'MU', 'MF', 'ML', 'MD', 'MB',
        'CR', 'CU', 'CF', 'CL', 'CD', 'CB',
        "MR'", "MU'", "MF'", "ML'", "MD'", "MB'",
        "CR'", "CU'", "CF'", "CL'", "CD'", "CB'",
        'MR2', 'MU2', 'MF2', 'ML2', 'MD2', 'MB2',
        'CR2', 'CU2', 'CF2', 'CL2', 'CD2', 'CB2',
        "'"];
      this.specials = ['.', '·', '(', ')'];

      this.addToken(Symbol.NOP, "·");
      this.addToken(Symbol.NOP, ".");
      this.addToken(Symbol.FACE_R, "r");
      this.addToken(Symbol.FACE_U, "u");
      this.addToken(Symbol.FACE_F, "f");
      this.addToken(Symbol.FACE_L, "l");
      this.addToken(Symbol.FACE_D, "d");
      this.addToken(Symbol.FACE_B, "b");
      this.addToken(Symbol.PERMUTATION_PLUS, "+");
      this.addToken(Symbol.PERMUTATION_MINUS, "-");
      this.addToken(Symbol.PERMUTATION_PLUSPLUS, "++");
      this.addToken(Symbol.PERMUTATION_BEGIN, "(");
      this.addToken(Symbol.PERMUTATION_END, ")");
      this.addToken(Symbol.PERMUTATION_DELIMITER, ",");
      //addToken(Symbol.DELIMITER ,"");
      //addToken(Symbol.INVERSION_BEGIN ,"(");
      //addToken(Symbol.INVERSION_END ,")");
      //addToken(Symbol.INVERSION_DELIMITER ,"");
      this.addToken(Symbol.INVERTOR, "'");
      //addToken(Symbol.REFLECTION_BEGIN ,"(");
      //addToken(Symbol.REFLECTION_END ,")");
      //addToken(Symbol.REFLECTION_DELIMITER ,"");
      this.addToken(Symbol.REFLECTOR, "*");
      this.addToken(Symbol.GROUPING_BEGIN, "(");
      this.addToken(Symbol.GROUPING_END, ")");
      //addToken(Symbol.REPETITION_BEGIN ,"");
      //addToken(Symbol.REPETITION_END ,"");
      //addToken(Symbol.REPETITION_DELIMITER ,"");
      this.addToken(Symbol.COMMUTATION_BEGIN, "[");
      this.addToken(Symbol.COMMUTATION_END, "]");
      this.addToken(Symbol.COMMUTATION_DELIMITER, ",");
      this.addToken(Symbol.CONJUGATION_BEGIN, "<");
      this.addToken(Symbol.CONJUGATION_END, ">");
      //addToken(Symbol.CONJUGATION_DELIMITER ,":");
      this.addToken(Symbol.ROTATION_BEGIN, "<");
      this.addToken(Symbol.ROTATION_END, ">'");
      //addToken(Symbol.ROTATION_DELIMITER ,"::");
      // addToken(Symbol.MACRO ,"");
      this.addToken(Symbol.MULTILINE_COMMENT_BEGIN, "/*");
      this.addToken(Symbol.MULTILINE_COMMENT_END, "*/");
      this.addToken(Symbol.SINGLELINE_COMMENT_BEGIN, "//");

      // Layer masks
      let inner = 1;
      let middle = 1 << (this.layerCount / 2);
      let outer = 1 << (this.layerCount - 1);
      let all = inner | middle | outer;

      this.addToken(new MoveSymbol(0, outer, 1), "R");
      this.addToken(new MoveSymbol(1, outer, 1), "U");
      this.addToken(new MoveSymbol(2, outer, 1), "F");
      this.addToken(new MoveSymbol(0, inner, -1), "L");
      this.addToken(new MoveSymbol(1, inner, -1), "D");
      this.addToken(new MoveSymbol(2, inner, -1), "B");

      this.addToken(new MoveSymbol(0, outer, -1), "R'");
      this.addToken(new MoveSymbol(1, outer, -1), "U'");
      this.addToken(new MoveSymbol(2, outer, -1), "F'");
      this.addToken(new MoveSymbol(0, inner, 1), "L'");
      this.addToken(new MoveSymbol(1, inner, 1), "D'");
      this.addToken(new MoveSymbol(2, inner, 1), "B'");

      this.addToken(new MoveSymbol(0, outer, 2), "R2");
      this.addToken(new MoveSymbol(1, outer, 2), "U2");
      this.addToken(new MoveSymbol(2, outer, 2), "F2");
      this.addToken(new MoveSymbol(0, inner, -2), "L2");
      this.addToken(new MoveSymbol(1, inner, -2), "D2");
      this.addToken(new MoveSymbol(2, inner, -2), "B2");

      this.addToken(new MoveSymbol(0, middle, 1), "MR");
      this.addToken(new MoveSymbol(1, middle, 1), "MU");
      this.addToken(new MoveSymbol(2, middle, 1), "MF");
      this.addToken(new MoveSymbol(0, middle, -1), "ML");
      this.addToken(new MoveSymbol(1, middle, -1), "MD");
      this.addToken(new MoveSymbol(2, middle, -1), "MB");

      this.addToken(new MoveSymbol(0, all, 1), "CR");
      this.addToken(new MoveSymbol(1, all, 1), "CU");
      this.addToken(new MoveSymbol(2, all, 1), "CF");
      this.addToken(new MoveSymbol(0, all, -1), "CL");
      this.addToken(new MoveSymbol(1, all, -1), "CD");
      this.addToken(new MoveSymbol(2, all, -1), "CB");

      this.addToken(new MoveSymbol(0, all, 2), "CR2");
      this.addToken(new MoveSymbol(1, all, 2), "CU2");
      this.addToken(new MoveSymbol(2, all, 2), "CF2");
      this.addToken(new MoveSymbol(0, all, -2), "CL2");
      this.addToken(new MoveSymbol(1, all, -2), "CD2");
      this.addToken(new MoveSymbol(2, all, -2), "CB2");

      this.symbolToSyntaxMap[Symbol.COMMUTATION] = Syntax.PRECIRCUMFIX;
      this.symbolToSyntaxMap[Symbol.CONJUGATION] = Syntax.PREFIX;
      this.symbolToSyntaxMap[Symbol.ROTATION] = Syntax.PREFIX;
      this.symbolToSyntaxMap[Symbol.GROUPING] = Syntax.CIRCUMFIX;
      this.symbolToSyntaxMap[Symbol.PERMUTATION] = Syntax.PRECIRCUMFIX;
      this.symbolToSyntaxMap[Symbol.REPETITION] = Syntax.SUFFIX;
      this.symbolToSyntaxMap[Symbol.INVERSION] = Syntax.SUFFIX;

    }
  }


// ------------------
// MODULE API    
// ------------------
  return {
    Notation: Notation,
    DefaultNotation: DefaultNotation,
    Symbol: Symbol,
    Syntax: Syntax,
  };
});
