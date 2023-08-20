/* @(#)ScriptParser.mjs
 * Copyright (c) 2023 Werner Randelshofer, Switzerland. MIT License.
 */

import Notation from './ScriptNotation.mjs';
import AST from './ScriptAST.mjs';
import Tokenizer from './Tokenizer.mjs';
let Symbol = Notation.Symbol;

let module = {
  log: (false && console != null && console.log != null) ? console.log : () => {
  },
  info: (true && console != null && console.info != null) ? console.info : () => {
  },
  warning: (true && console != null && console.warn != null) ? console.warn : () => {
  },
  error: (true && console != null && console.error != null) ? console.error : () => {
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
 * Defines the API for a ScriptParser.
 * Clients of this module may only use methods defined in this interface.
 */
class ScriptParserInterface {
  /**
   * Creates a new parser.
   * @param {Notation.ScriptNotation} notation, must be non-null
   * @param {Map<String,String>} localMacros, must be non-null
   */
  constructor(notation, localMacros) {
  	// This constructor is abstract.
  	// EcmaScript 2019 does not support abstract constructors, so this is a constructor with empty body.
  	// Subclasses must call super (this is enforced by EcmaScript).
  }

  /**
   * Parses a Script.
   * @param {string} input, must be non-null
   * @return {AST.Node} abstract syntax tree, is non-null
   * @throws {Tokenizer.ParseException} if parsing failed
   */
  parse(input) {
  	// EcmaScript 2019 does not support abstract method, so this is a method with empty body.
  	// Subclasses should not call super, because this implementation just throws a ParseException.
  	throw new Tokenizer.ParseException("The ScriptParserInterface cannot parse anything.",0,0)
  }
}

/**
 * Implements a parser for a specific notation.
 */
class ScriptParser extends ScriptParserInterface {
  /**
   * Creates a new parser.
   * @param {Notation} notation
   * @param {Map<String,String>} localMacros
   */
  constructor(notation, localMacros) {
  	super(notation, localMacros);
    this.notation = notation;
    this.macros = new Map();
    if (localMacros != null) {
      for (let entry in localMacros.entries()) {
        macros.set(entry[0],entry[1]);
      }
    }
    // global macros override local macros
    for (let entry in notation.getMacros().entries()) {
      macros.set(entry[0],entry[1]);
    }
  }

  createBinaryNode(tt, binary, operand1, operand2) {
    if (operand1 == null || operand2 == null) {
      throw this.createException(tt, "Binary: Two operands expected.");
    }
    binary.add(operand1);
    binary.add(operand2);
    return binary;
  }

  createCompositeNode(tt, operation, operand1, operand2) {
    let node = undefined;
    switch (operation.getCompositeSymbol()) {
      case Notation.Symbol.GROUPING:
        node = this.createUnaryNode(tt, new AST.GroupingNode(), operand1, operand2);
        break;
      case Notation.Symbol.INVERSION:
        node = this.createUnaryNode(tt, new AST.InversionNode(), operand1, operand2);
        break;
      case Notation.Symbol.REFLECTION:
        node = this.createUnaryNode(tt, new AST.ReflectionNode(), operand1, operand2);
        break;
      case Notation.Symbol.REPETITION:
        node = this.createRepetitionNode(tt, operand1, operand2);
        break;
      case Notation.Symbol.ROTATION:
        node = this.createBinaryNode(tt, new AST.RotationNode(), operand1, operand2);
        break;
      case Notation.Symbol.COMMUTATION:
        node = this.createBinaryNode(tt, new AST.CommutationNode(), operand1, operand2);
        break;
      case Notation.Symbol.CONJUGATION:
        node = this.createBinaryNode(tt, new AST.ConjugationNode(), operand1, operand2);
        break;
      default:
        throw new AssertionError("Composite. Unexpected operation: " + operation);
    }
    return node;
  }

  createException(tt, msg) {
    return new Tokenizer.ParseException(msg + " Found \"" + tt.getStringValue() + "\".", tt.getStartPosition(), tt.getEndPosition());
  }

  createRepetitionNode(tt, operand1, operand2) {
    if (operand1 == null || operand2 != null) {
      throw this.createException(tt, "Repetition: One operand expected.");
    }
    let n = new AST.RepetitionNode();
    n.add(operand1);
    return n;
  }

  createTokenizer(notation) {
    let tt = new Tokenizer.Tokenizer();
    tt.addNumbers();
    tt.skipWhitespace();

    for (let token of notation.getTokens()) {
      tt.addKeyword(token);
    }
    for (let id in this.macros.keys()) {
      tt.addKeyword(id);
    }

    let mbegin = notation.getToken(Notation.Symbol.MULTILINE_COMMENT_BEGIN);
    let mend = notation.getToken(Notation.Symbol.MULTILINE_COMMENT_END);
    if (mbegin != null && mend != null && mbegin.length > 0 && mend.length > 0) {
      tt.addComment(mbegin, mend);
    }
    let sbegin = notation.getToken(Notation.Symbol.SINGLELINE_COMMENT_BEGIN);
    if (sbegin != null && sbegin.length > 0) {
      tt.addComment(sbegin, "\n");
    }

    return tt;
  }

  createUnaryNode(tt, unary, operand1, operand2) {
    if (operand1 == null || operand2 != null) {
      throw this.createException(tt, "Unary: One operand expected.");
    }
    if (operand1 instanceof AST.SequenceNode) {
      unary.addAll(operand1.getChildren().slice(0));
    } else {
      unary.add(operand1);
    }
    return unary;
  }

  getNotation() {
    return this.notation;
  }

  parse(input) {
    let tt = this.createTokenizer(this.notation);
    tt.setInput(input);
    return this.parseScript(tt);
  }

  parseCircumfix(tt, parent, symbol) {
    let startPos = tt.getStartPosition();
    let operand1 = this.parseCircumfixOperand(tt, symbol);
    let compositeNode = this.createCompositeNode(tt, symbol, operand1, null);
    compositeNode.setStartPosition(startPos);
    compositeNode.setEndPosition(tt.getEndPosition());
    parent.add(compositeNode);
  }

  parseCircumfixOperand(tt, symbol) {
    let nodes = this.parseCircumfixOperands(tt, symbol);
    if (nodes.length != 1) {
      throw this.createException(tt, "Circumfix: Exactly one operand expected.");
    }
    return nodes[0];
  }

  parseCircumfixOperands(tt, symbol) {
    if (!Notation.Symbol.isBegin(symbol)) {
      throw this.createException(tt, "Circumfix: Begin expected.");
    }
    let compositeSymbol = symbol.getCompositeSymbol();
    let operands = [];
    let operand = new AST.SequenceNode();
    operand.setStartPosition(tt.getEndPosition());
    operands.push(operand);
    Loop:
      while (true) {
      switch (tt.nextToken()) {
        case Tokenizer.TT_NUMBER:
          tt.pushBack();
          this.parseStatement(tt, operand);
          break;
        case Tokenizer.TT_KEYWORD:
          let maybeSeparatorOrEnd = tt.getStringValue();
          for (let symbol1 of this.notation.getSymbols(maybeSeparatorOrEnd)) {
            if (symbol1.getCompositeSymbol() == compositeSymbol) {
              if (Notation.Symbol.isDelimiter(symbol1)) {
                operand.setEndPosition(tt.getStartPosition());
                operand = new AST.SequenceNode();
                operand.setStartPosition(tt.getEndPosition());
                operands.push(operand);
                continue Loop;
              } else if (Notation.Symbol.isEnd(symbol1)) {
                break Loop;
              }
            }
          }
          tt.pushBack();
          this.parseStatement(tt, operand);
          break;
        default:
          throw this.createException(tt, "Circumfix: Number,  or End expected.");
      }
    }
    operand.setEndPosition(tt.getStartPosition());
    return operands;
  }

  /**
   * Progressively parses a statement with a syntax that is known not to
   * be of type {@link Syntax#SUFFIX}.
   * <p>
   * This method tries out to parse the given token with the given syntax.
   * <p>
   * On success,  method ( a method called from it) either adds a
   * new child to the parent or replaces the last child.
   *
   * @param tt the tokenizer
   * @param parent the parent of the statement
   * @param token the current token
   * @param symbol the symbol that we want to try out
   * @on parse failure
   */
  parseNonSuffix(tt, parent, token, symbol) {
    let c = symbol.getCompositeSymbol();
    if (c == Symbol.PERMUTATION) {
      tt.pushBack();
      this.parsePermutation(tt, parent);
      return;
    }

    let syntax = this.notation.getSyntax(symbol);
    switch (syntax) {
      case Notation.Syntax.PRIMARY:
        this.parsePrimary(tt, parent, token, symbol);
        break;
      case Notation.Syntax.PREFIX:
        this.parsePrefix(tt, parent, symbol);
        break;
      case Notation.Syntax.CIRCUMFIX:
        this.parseCircumfix(tt, parent, symbol);
        break;
      case Notation.Syntax.PRECIRCUMFIX:
        this.parsePrecircumfix(tt, parent, symbol);
        break;
      case Notation.Syntax.POSTCIRCUMFIX:
        this.parsePostcircumfix(tt, parent, symbol);
        break;
      case Notation.Syntax.PREINFIX:
        this.parsePreinfix(tt, parent, symbol);
        break;
      case Notation.Syntax.POSTINFIX:
        this.parsePostinfix(tt, parent, symbol);
        break;
      default:
        throw this.createException(tt, "Unexpected Syntax: " + syntax);
    }
  }

  /**
   * Progressively parses a statement with a syntax that is known not to
   * be of type {@link Syntax#SUFFIX}.
   * <p>
   * This method tries out all symbols that could work for the next token
   * of the tokenizer. If a symbol does not work out,  method backtracks
   * and tries the next symbol.
   * <p>
   * On success,  method ( a method called from it) either adds a
   * new child to the parent or replaces the last child.
   *
   * @param tt   the tokenizer
   * @param parent Node the parent of the statement
   * @throws Tokenizer.ParseException
   */
  parseNonSuffixOrBacktrack(tt, parent) {
    if (tt.nextToken() != Tokenizer.TT_KEYWORD) {
      throw this.createException(tt, "Statement: Keyword expected.");
    }

    // Backtracking algorithm: try out each possible symbol for the given token.
    let e = null;
    let savedChildren = parent.getChildren().slice(0);
    let savedTokenizer = new Tokenizer.Tokenizer();
    savedTokenizer.setTo(tt);
    let token = tt.getStringValue();
    for (let symbol of this.notation.getSymbols(token)) {
      try {
        this.parseNonSuffix(tt, parent, token, symbol);
        // Parse was successful
        return;
      } catch (pe) {
        if (!(pe instanceof Tokenizer.ParseException)) {
          throw pe;
        }
        // Parse failed: backtrack and try with another symbol.
        tt.setTo(savedTokenizer);
        parent.removeAllChildren();
        parent.addAll(savedChildren);
        if (e == null || e.getEndPosition() < pe.getEndPosition()) {
          e = pe;
        }
      }
    }
    throw (e != null) ? e : this.createException(tt, "Statement: Illegal token.");
  }

  parsePermutation(tt, parent) {
    let permutation = new AST.PermutationCycleNode(tt.getStartPosition(), tt.getStartPosition());

    let sign = null;
    let syntax = this.notation.getSyntax(Notation.Symbol.PERMUTATION);
    if (syntax == Notation.Syntax.PREFIX) {
      sign = this.parsePermutationSign(tt);
    }
    if (tt.nextToken() != Tokenizer.TT_KEYWORD ||
      this.notation.getSymbolInCompositeSymbol(tt.getStringValue(), Symbol.PERMUTATION) != Symbol.PERMUTATION_BEGIN) {
      throw this.createException(tt, "Permutation: Begin expected.");
    }
    if (syntax == Notation.Syntax.PRECIRCUMFIX) {
      sign = this.parsePermutationSign(tt);
    }

    PermutationCycle:
      while (true) {
      switch (tt.nextToken()) {
        case Tokenizer.TT_KEYWORD:
          let sym = this.notation.getSymbolInCompositeSymbol(tt.getStringValue(), Symbol.PERMUTATION);
          if (sym == Symbol.PERMUTATION_END) {
            break PermutationCycle;
          } else if (sym == null) {
            throw this.createException(tt, "Permutation: PermutationItem expected.");
          } else if (sym == Symbol.PERMUTATION_DELIMITER) {
            // consume
          } else {
            tt.pushBack();
            this.parsePermutationItem(tt, permutation, syntax);
          }
          break;
        default:
          throw this.createException(tt, "Permutation: PermutationItem expected.");
      }
    }

    if (syntax == Notation.Syntax.SUFFIX) {
      sign = this.parsePermutationSign(tt);
    }
    if (syntax != Notation.Syntax.POSTCIRCUMFIX) {
      // postcircumfix is read in parsePermutationItem.
      permutation.setSignSymbol(sign);
    }
    permutation.setEndPosition(tt.getEndPosition());
    parent.add(permutation);
  }

  parsePermutationFaces(t) {
    let faceSymbols = [];
    while (true) {
      if (t.nextToken() == Tokenizer.TT_KEYWORD) {
        let symbol = this.notation.getSymbolInCompositeSymbol(t.getStringValue(), Symbol.PERMUTATION);
        if (symbol != null && Symbol.isFaceSymbol(symbol)) {
          faceSymbols.push(symbol);
          continue;
        }
      }
      break;
    }
    t.pushBack();

    let type = faceSymbols.length;
    if (type == 0) {
      throw this.createException(t, "PermutationItem: Face expected.");
    }
    if (this.notation.getLayerCount() < 3 && type < 3) {
      throw this.createException(t, "PermutationItem: The 2x2 cube only has corner parts.");
    }

    return faceSymbols;
  }

  parsePermutationItem(t, parent, syntax) {
    let sign = null;

    if (syntax == Notation.Syntax.PRECIRCUMFIX || syntax == Notation.Syntax.PREFIX) {
      sign = this.parsePermutationSign(t);
    }

    let layerCount = this.notation.getLayerCount();
    let faceSymbols = this.parsePermutationFaces(t);
    let partNumber = this.parsePermutationPartNumber(t, layerCount, faceSymbols.length);

    if ((syntax == Notation.Syntax.POSTCIRCUMFIX || syntax == Notation.Syntax.SUFFIX)) {
      sign = this.parsePermutationSign(t);
    }

    parent.addPermItem(faceSymbols.length, sign, faceSymbols, partNumber, layerCount);
  }

  parsePermutationPartNumber(t, layerCount, type) {
    let partNumber = 0;
    if (t.nextToken() == Tokenizer.TT_NUMBER) {
      partNumber = t.getNumericValue();
    } else {
      t.pushBack();
    }
    switch (type) {
      case 3:
        if (partNumber != 0) {
          throw this.createException(t, "PermutationItem: Invalid corner part number: " + partNumber);
        }
        break;
      case 2:
      {
        let valid;
        switch (layerCount) {
          case 4:
            valid = 1 <= partNumber && partNumber <= 2;
            break;
          case 5:
            valid = 0 <= partNumber && partNumber <= 2;
            break;
          case 6:
            valid = 1 <= partNumber && partNumber <= 4;
            break;
          case 7:
            valid = 0 <= partNumber && partNumber <= 4;
            break;
          default:
            valid = partNumber == 0;
            break;
        }
        if (!valid) {
          throw this.createException(t, "PermutationItem: Invalid edge part number: " + partNumber);
        }
        switch (layerCount) {
          case 4:
          case 6:
            partNumber -= 1;
            break;
        }
        break;
      }
      case 1:
      {
        let valid;
        switch (layerCount) {
          case 4:
            valid = 1 <= partNumber && partNumber <= 4;
            break;
          case 5:
            valid = 0 <= partNumber && partNumber <= 8;
            break;
          case 6:
            valid = 1 <= partNumber && partNumber <= 16;
            break;
          case 7:
            valid = 0 <= partNumber && partNumber <= 24;
            break;
          default:
            valid = partNumber == 0;
            break;
        }
        if (!valid) {
          throw this.createException(t, "PermutationItem: Invalid side part number: " + partNumber);
        }
        switch (layerCount) {
          case 4:
          case 6:
            partNumber -= 1;
            break;
        }
        break;
      }
    }
    return partNumber;
  }

  /**
   * Parses a permutation sign and returns null or one of the three sign
   * symbols.
   */
  parsePermutationSign(t) {
    if (t.nextToken() == Tokenizer.TT_KEYWORD) {
      let symbol = this.notation.getSymbolInCompositeSymbol(t.getStringValue(), Symbol.PERMUTATION);
      if (symbol != null && Symbol.isPermutationSign(symbol)) {
        return symbol;
      }
    }
    t.pushBack();
    return null;
  }

  parsePostcircumfix(tt, parent, symbol) {
    let start = tt.getStartPosition();
    let operands = this.parseCircumfixOperands(tt, symbol);
    if (operands.length != 2) {
      throw this.createException(tt, "Postcircumfix: Two operands expected.");
    }
    let end = tt.getEndPosition();
    let node = this.createCompositeNode(tt, symbol, operands[1], operands[0]);
    node.setStartPosition(start);
    node.setEndPosition(end);
    parent.add(node);
  }

  /**
   * Replaces the last child of parent with a post-infix expression.
   *
   * @param tt   the tokenizer
   * @param parent the parent
   * @param symbol the symbol with post-infix syntax
   * @on parsing failure
   */
  parsePostinfix(tt, parent, symbol) {
    if (parent.getChildCount() == 0) {
      throw this.createException(tt, "Postinfix: Operand expected.");
    }
    let operand2 = parent.getChildAt(parent.getChildCount() - 1);
    let node = undefined;
    if (symbol.getCompositeSymbol() == Symbol.REPETITION) {
      if (tt.nextToken() != Tokenizer.TT_NUMBER) {
        throw new Tokenizer.ParseException("Repetition: Repetition count expected.", tt.getStartPosition(), tt.getEndPosition());
      }
      node = this.createCompositeNode(tt, symbol, operand2, null);
      node.setRepeatCount(tt.getNumericValue());
    } else {
      let tempParent = new AST.SequenceNode();
      this.parseStatement(tt, tempParent);
      let operand1 = tempParent.getChildAt(0);
      node = this.createCompositeNode(tt, symbol, operand1, operand2);
    }
    node.setStartPosition(operand2.getStartPosition());
    node.setEndPosition(tt.getEndPosition());
    parent.add(node);
  }

  parsePrecircumfix(tt, parent, symbol) {
    let start = tt.getStartPosition();
    let operands = this.parseCircumfixOperands(tt, symbol);
    if (operands.length != 2) {
      throw this.createException(tt, "Precircumfix: Two operands expected.");
    }
    let end = tt.getEndPosition();
    let node = this.createCompositeNode(tt, symbol, operands[0], operands[1]);
    node.setStartPosition(start);
    node.setEndPosition(end);
    parent.add(node);
  }

  parsePrefix(tt, parent, symbol) {
    let startPosition = tt.getStartPosition();
    let node = undefined;
    if (Notation.Symbol.isBegin(symbol)) {
      let operand1 = this.parseCircumfixOperand(tt, symbol);
      let tempParent = new AST.SequenceNode();
      this.parseStatement(tt, tempParent);
      let operand2 = tempParent.getChildAt(0);
      node = this.createCompositeNode(tt, symbol, operand1, operand2);
    } else if (Notation.Symbol.isOperator(symbol)) {
      let operand1 = new AST.SequenceNode();
      this.parseStatement(tt, operand1);
      node = this.createCompositeNode(tt, symbol, operand1, null);
    } else {
      throw this.createException(tt, "Prefix: Begin or Operator expected.");
    }
    node.setStartPosition(startPosition);
    node.setEndPosition(tt.getEndPosition());
    parent.add(node);
  }

  /**
   * Replaces the last child of parent with a pre-infix expression.
   *
   * @param tt   the tokenizer
   * @param parent the parent
   * @param symbol the symbol with pre-infix syntax
   * @on parsing failure
   */
  parsePreinfix(tt, parent, symbol) {
    if (parent.getChildCount() == 0) {
      throw this.createException(tt, "Preinfix: Operand expected.");
    }
    let operand1 = parent.getChildAt(parent.getChildCount() - 1);
    let tempParent = new AST.SequenceNode();
    this.parseStatement(tt, tempParent);
    let operand2 = tempParent.getChildAt(0);
    let node = this.createCompositeNode(tt, symbol, operand1, operand2);
    node.setStartPosition(operand1.getStartPosition());
    node.setEndPosition(tt.getEndPosition());
    parent.add(node);
  }

  parsePrimary(tt, parent, token, symbol) {
    let child = undefined;
    switch (symbol) {
      case Notation.Symbol.NOP:
        child = new AST.NOPNode(tt.getStartPosition(), tt.getEndPosition());
        break;
      case Notation.Symbol.MOVE:
        let move = this.notation.getMoveFromToken(token);
        child = new AST.MoveNode(move.getLayerCount(), move.getAxis(), move.getLayerMask(), move.getAngle(),
          tt.getStartPosition(), tt.getEndPosition());
        break;
      case Notation.Symbol.MACRO:
        // Expand macro
        try {
          let macro = this.notation.getMacro(token);
          let macroScript = this.parse(macro);
          let macroNode = new AST.MacroNode(null, macro, tt.getStartPosition(), tt.getEndPosition());
          macroNode.add(macroScript);
          child = macroNode;
        } catch (e) {
          throw new Tokenizer.ParseException("Error in macro \"" + token + "\":" + e.getMessage()
            + " at " + e.getStartPosition() + ".." + e.getEndPosition(),
            tt.getStartPosition(), tt.getEndPosition());
        }
        break;
      default:
        throw this.createException(tt, "Primary Expression: " + symbol + " cannot be used as a primary expression.");
    }
    parent.add(child);
  }

  /**
   * Adds a child to the parent or ( the repetition has suffix syntax)
   * replaces the last child of the parent.
   *
   * @param tt   the tokenizer
   * @param parent the parent
   * @on parsing failure
   */
  parseRepetition(tt, parent) {
    if (tt.nextToken() != Tokenizer.TT_NUMBER) {
      throw new Tokenizer.ParseException("Repetition: Number expected.", tt.getStartPosition(), tt.getEndPosition());
    }
    let start = tt.getStartPosition();
    let repeatCount = tt.getNumericValue();
    let syntax = this.notation.getSyntax(Notation.Symbol.REPETITION);
    let operand = new AST.SequenceNode();
    switch (syntax) {
      case Notation.Syntax.PREFIX:
        this.parseStatement(tt, operand);
        break;
      case Notation.Syntax.SUFFIX:
      {
        if (parent.getChildCount() < 1) {
          throw this.createException(tt, "Repetition: Operand missing.");
        }
        let sibling = parent.getChildAt(parent.getChildCount() - 1);
        start = sibling.getStartPosition();
        operand.add(sibling);
        break;
      }
      case Notation.Syntax.PREINFIX:
        if (tt.nextToken() != Tokenizer.TT_KEYWORD
          || !this.notation.getSymbols(tt.getStringValue()).contains(Notation.Symbol.REPETITION_OPERATOR)) {
          throw this.createException(tt, "Repetition: Operator expected.");
        }
        this.parseStatement(tt, operand);
        break;
      case Notation.Syntax.POSTINFIX:
        // Note: Postinfix syntax is handled by parsePostinfix.
        // We only get here,  the operator is missing!
        throw this.createException(tt, "Repetition: Operator expected.");
      case Notation.Syntax.CIRCUMFIX:
      case Notation.Syntax.PRECIRCUMFIX:
      case Notation.Syntax.POSTCIRCUMFIX:
      {
        throw new Tokenizer.ParseException("Repetition: Illegal syntax: " + syntax, tt.getStartPosition(), tt.getEndPosition());
      }
    }
    let repetitionNode = new AST.RepetitionNode();
    repetitionNode.addAll(operand.getChildren().slice(0));
    repetitionNode.setRepeatCount(repeatCount);
    repetitionNode.setStartPosition(start);
    repetitionNode.setEndPosition(tt.getEndPosition());
    parent.add(repetitionNode);
  }

  parseScript(tt) {
    let script = new AST.SequenceNode();
    script.setStartPosition(tt.getStartPosition());
    while (tt.nextToken() != Tokenizer.TT_EOF) {
      tt.pushBack();
      this.parseStatement(tt, script);
    }
    script.setEndPosition(tt.getEndPosition());
    return script;
  }

  /**
   * Progressively parses a statement.
   * <p>
   * This method either adds a new child to the parent or replaces the last
   * child.
   *
   * @param tt   the tokenizer
   * @param parent the parent of the statement
   * @throws Tokenizer.ParseException
   */
  parseStatement(tt, parent) {
    switch (tt.nextToken()) {
      case Tokenizer.TT_NUMBER:
        tt.pushBack();
        this.parseRepetition(tt, parent);
        break;
      case Tokenizer.TT_KEYWORD:
        tt.pushBack();
        this.parseNonSuffixOrBacktrack(tt, parent);
        break;
      default:
        throw this.createException(tt, "Statement: Keyword or Number expected.");
    }

    // We parse suffix expressions here,  that they have precedence over
    // other expressions.
    this.parseSuffixes(tt, parent);
  }

  /**
   * Replaces the last child of parent with a suffix expression.
   *
   * @param tt   the tokenizer
   * @param parent the parent
   * @param symbol the symbol with suffix syntax
   * @on parsing failure
   */
  parseSuffix(tt, parent, symbol) {
    if (parent.getChildCount() < 1) {
      throw new Tokenizer.ParseException("Suffix: No sibling for suffix.", tt.getStartPosition(), tt.getEndPosition());
    }
    let sibling = parent.getChildAt(parent.getChildCount() - 1);
    let startPosition = sibling.getStartPosition();
    let node = undefined;
    if (Notation.Symbol.isBegin(symbol)) {
      let operand1 = this.parseCircumfixOperand(tt, symbol);
      node = this.createCompositeNode(tt, symbol, operand1, sibling);
    } else if (Notation.Symbol.isOperator(symbol)) {
      node = this.createCompositeNode(tt, symbol, sibling, null);
    } else {
      throw this.createException(tt, "Suffix: Begin or Operator expected.");
    }
    node.setStartPosition(startPosition);
    node.setEndPosition(tt.getEndPosition());
    parent.add(node);
  }

  /**
   * Tries to replace the last child of the parent with a suffix expression(s).
   * <p>
   * This method replaces the last child of the parent,  time a
   * suffix has been parsed succesfully.
   *
   * @param tt   the tokenizer
   * @param parent the parent of the statement
   */
  parseSuffixes(tt, parent) {
    let savedTT = new Tokenizer.Tokenizer();
    savedTT.setTo(tt);
    Outer:
      while (true) {
      if (tt.nextToken() == Tokenizer.TT_KEYWORD) {
        let token = tt.getStringValue();

        // Backtracking algorithm: try out each possible symbol for the given token.
        for (let symbol of this.notation.getSymbols(token)) {
          if (symbol.getCompositeSymbol() != Symbol.PERMUTATION
            && this.notation.getSyntax(symbol) == Notation.Syntax.SUFFIX) {

            try {
              this.parseSuffix(tt, parent, symbol);
              // Success: parse next suffix.
              savedTT.setTo(tt);
              continue Outer;
            } catch (e) {
              // Failure: backtrack and try another symbol.
              tt.setTo(savedTT);
            }

          }
        }
      } else if (tt.getTokenType() == Tokenizer.TT_NUMBER
        && this.notation.getSyntax(Notation.Symbol.REPETITION) == Notation.Syntax.SUFFIX) {
        try {
          tt.pushBack();
          this.parseRepetition(tt, parent);
          savedTT.setTo(tt);
          continue;
        } catch (e) {
          // Failure: try with another symbol.
          tt.setTo(savedTT);
        }
      }
      // We failed with all symbols that we tried out.
      break;
    }
    tt.setTo(savedTT);
  }
}


// ------------------
// MODULE API
// ------------------
export default {
  /* Provides a class that implements ScriptParserInterface.
   * This model gives no guarantee, that ScriptParser provides other constructors or
   * methods than the ones defined in ScriptParserInterface.
   */
  ScriptParser: ScriptParser
};
