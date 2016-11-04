/*
 * @(#)Tokenizer.js  1.0  2016-10-29
 * Copyright (c) 2011 Werner Randelshofer, Switzerland.
 * You may only use this software in accordance with the license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("Tokenizer", [],
function () {

// ttypes for Tokenizer
// ----------------------
  let TT_WORD = "word";
  let TT_EOF = "eof";
  let TT_SKIP = "skip";

// the following ttypes can be activated on demand
  let TT_KEYWORD = "keyword"
  let TT_NUMBER = "number";
  let TT_COMMENT = "comment";
  let TT_SPECIAL = "special";

// the following ttypes are used internally
  let TT_COMMENT_BEGIN = "commentBegin"; // FIXME implement me
  let TT_DIGIT = "numberDigit";

  /**
   * Node of keyword tree.
   * 
   * Example tree structure, for the keywords "ab", and "abcd".
   * 
   * ''.KeywordTree(null)
   * ''.'a'.KeywordTree(null)
   * ''.'a'.'b'.KeywordTree("ab")
   * ''.'a'.'b'.'c'.KeywordTree(null)
   * ''.'a'.'b'.'c'.'d'.KeywordTree("abcd")
   */
  class KeywordTree {
    /**
     * Constructos a new instance.
     * .
     * @param {type} keyword
     */
    constructor(keyword) {
      this.keyword = keyword;
      this.children = {};
    }
  }


  /**
   * Represents a greedy tokenizer.
   * 
   * By default this tokenizer parses the entire input sequence as a single word.
   * You can activate skipping of whitespaces by invoking addWhitespaceTokens().
   * You can activate tokenizaton of comments, by invoking addMultilineTokens(begin,end)
   * or addSingleline.
   * You can activate tokenization of positive integer numbers, by invokint addDigitTokens().
   * You can activate tokenization of keywords, by adding keyword specials.
   */
  class Tokenizer {
    constructor() {
      this.specials = {}; // Map<Character,Object> maps char to  ttype
      this.digits = {}; // Map<Character,Object> maps char to  ttype
      this.commentBeginEnd = []; // Map<String,Strings> maps comment begin to end
      this.input = "";
      this.pos = 0;
      this.pushedBack = false;
      this.ttype = TT_EOF;
      this.tstart = 0;
      this.tend = 0;
      this.sval = null;
      this.nval = null;
      this.tsymbol=null;
      this.keywordTree = new KeywordTree(null);
      this.needChar = true;
    }

    /**
     * Defines a special character token.
     * 
     * @param {Character} token
     * @param {Object} ttype
     * @returns nothing
     */
    addSpecial(token, ttype) {
      if (token.length != 1)
        throw new "token must be 1 character!, token:" + token;
      this.specials[token] = ttype;
    }
    /**
     * Adds a digit token. (Also use this for adding signs, and decimal point tokens!).
     * 
     * @param {Character} token
     * @param {Object} ttype
     * @returns nothing
     */
    addDigit(token, ttype) {
      if (token.length != 1)
        throw new "token must be 1 character!, token:" + token;
      this.digits[token] = ttype;
    }
    /**
     * Defines the tokens needed for parsing non-negative integers.
     * 
     * @param {String} token
     * @param {Object} ttype
     * @returns nothing
     */
    addNumbers() {
      this.addDigit("0", TT_DIGIT);
      this.addDigit("1", TT_DIGIT);
      this.addDigit("2", TT_DIGIT);
      this.addDigit("3", TT_DIGIT);
      this.addDigit("4", TT_DIGIT);
      this.addDigit("5", TT_DIGIT);
      this.addDigit("6", TT_DIGIT);
      this.addDigit("7", TT_DIGIT);
      this.addDigit("8", TT_DIGIT);
      this.addDigit("9", TT_DIGIT);
    }
    /**
     * Defines the specials needed for skipping whitespace.
     * 
     * @param {String} token
     * @param {Object} ttype
     * @returns nothing
     */
    skipWhitespace() {
      this.addSpecial(" ", TT_SKIP);
      this.addSpecial("\f", TT_SKIP);
      this.addSpecial("\n", TT_SKIP);
      this.addSpecial("\r", TT_SKIP);
      this.addSpecial("\t", TT_SKIP);
      this.addSpecial("\v", TT_SKIP);
      this.addSpecial("\u00a0", TT_SKIP);
      this.addSpecial("\u2028", TT_SKIP);
      this.addSpecial("\u2029", TT_SKIP);
    }
    /**
     * Defines a keyword token.
     * 
     * @param {String} token
     * @returns nothing
     */
    addKeyword(token,symbol) {
      let node = this.keywordTree;
      for (let i = 0; i < token.length; i++) {
        let ch = token.charAt(i);
        let child = node.children[ch];
        if (child == null) {
          child = new KeywordTree(null);
          node.children[ch] = child;
        }
        node = child;
      }
      node.keyword = token;
      node.symbol = symbol;
    }
    /**
     * Defines keyword tokens.
     * 
     * @param {Array<String>} tokens
     * @returns nothing
     */
    addKeywords(tokens) {
      for (let i=0;i<tokens.length;i++) {
        this.addKeyword(tokens[i]);
      }
    }
    /**
     * Defines special character tokens.
     * 
     * @param {Array<Character>} tokens
     * @returns nothing
     */
    addSpecials(tokens) {
      for (let i=0;i<tokens.length;i++) {
        this.addSpecial(tokens[i],tokens[i]);
      }
    }

    /** Sets the input for the tokenizer. 
     * 
     * @param [String] input;
     */
    setInput(input) {
      this.input = input;
      this.pos = 0;
      this.pushedBack = false;
      this.ttype = null;
      this.tstart = null;
      this.tend = null;
      this.sval = null;
      this.tsymbol=null;
      this.needChar = true;
    }
    
    getInputLength() {
      return this.input.length;
    }

    /** Returns the current token type. 
     * 
     * @returns [Object] token type
     */
    getTokenType() {
      return this.ttype;
    }

    /** Returns the current token string value. 
     * 
     * @returns [String] value or null
     */
    getStringValue() {
      return this.sval;
    }

    /** Returns the current token numeric value. 
     * 
     * @returns [Number] value or null
     */
    getNumericValue() {
      return this.nval;
    }
    /**
     * Returns the current token symbol value
     * 
     * @returns {unresolved}
     */
    getSymbolValue() {
      return this.tsymbol;
    }

    /**
     * Returns the start position of the current token
     * 
     * @returns {unresolved}
     */
    getStartPosition() {
      return this.tstart;
    }
    /**
     * Returns the end position of the current token
     * 
     * @returns {unresolved}
     */
    getEndPosition() {
      return this.tend;
    }
    
    /** Parses the next token. 
     * @return [Object] ttype
     */
    nextToken() {
      if (this.pushedBack) {
        this.pushedBack = false;
        return this.ttype;
      }

      let start = this.pos;
      let ch = this.read();

      // try to skip characters
      while (ch != null && this.specials[ch] == TT_SKIP) {
        ch = this.read();
        start += 1;
      }

      // start position of the token

      // try to tokenize a keyword 
      let node = this.keywordTree;
      let foundNode = null;
      let end = start;
      while (ch != null && node.children[ch] != null) {
        node = node.children[ch];
        if (node.keyword != null) {
          foundNode = node;
          end = this.pos;
        }
        ch = this.read();
      }
      if (foundNode != null) {
        this.setPosition(end);
        this.ttype = TT_KEYWORD;
        this.tstart = start;
        this.tend = end;
        this.sval = foundNode.keyword;
        this.tsymbol = foundNode.symbol;
        return this.ttype;
      }
      this.setPosition(start);
      ch = this.read();

       // try to tokenize a number
      if (ch != null && this.digits[ch] == TT_DIGIT) {
        while (ch != null && this.digits[ch] == TT_DIGIT) {
          ch = this.read();
        }
        if (ch!=null) {
        this.unread();
        }
        this.ttype = TT_NUMBER;
        this.tstart = start;
        this.tend = this.pos;
        this.sval = this.input.substring(start, this.pos);
        this.nval = Number.valueOf(this.sval);
        this.tsymbol = null;
        return this.ttype;
      }

      // try to tokenize a word
      if (ch != null && this.specials[ch] == null) {
        while (ch != null && this.specials[ch] == null) {
          ch = this.read();
        }
        if (ch!=null) {
        this.unread();
        }
        this.ttype = TT_WORD;
        this.tstart = start;
        this.tend = this.pos;
        this.sval = this.input.substring(start, this.pos);
        this.tsymbol=null;
        return this.ttype;
      }
      
      // try to tokenize a special character
      if (ch != null && this.specials[ch] != null) {
        this.ttype = TT_SPECIAL;
        this.tsymbol = this.specials[ch];
        this.tstart = start;
        this.tend = end;
        this.sval = ch;
        return this.ttype;
      }
      // FIXME implement me
      this.ttype = TT_EOF;
      return this.ttype;
    }

    /**
     * Reads the next character from input.
     * 
     * @return the next character or null in case of EOF
     */
    read() {
      if (this.pos < this.input.length) {
        let ch = this.input.charAt(this.pos);
        this.pos = this.pos + 1;
        return ch;
      } else {
        this.pos = this.input.length;
        return null;
      }
    }
    /**
     * Unreads the last character from input.
     */
    unread() {
      if (this.pos > 0) {
        this.pos = this.pos - 1;
      }
    }
    /**
     * Sets the input position.
     */
    setPosition(newValue) {
      this.pos = newValue;
    }
    
    pushBack() {
      this.pushedBack=true;
    }
  }

/** A simple push back reader. */
class PushBackReader {
  constructor(str) {
    this.str=str;
    this.pos=0;
    this.ch=null;
    this.pushedBack=false;
  }
  read() {
    if (this.pushedBack) {
      this.pushedBack=false;
      return this.ch;
    }
    if (this.pos<this.str.length) {
      this.ch= this.str.charAt(this.pos++);
    }else{
      this.ch=null;
    }
    return this.ch;
  }
  pushBack() {
    this.pushedBack=true;
  }
  skipWhitespace() {
    let c = this.read();
    while (c==' '||c=='\n'||c=='\t') {
      c=this.read();
    }
    this.pushBack();
  }
  getChar() {
    return this.ch;
  }
  getPosition() {
    return this.pos;
  }
}

// ------------------
// MODULE API    
// ------------------
  return {
    TT_WORD: TT_WORD,
    TT_KEYWORD: TT_KEYWORD,
    TT_SKIP: TT_SKIP,
    TT_EOF: TT_EOF,
    TT_NUMBER: TT_NUMBER,
    TT_COMMENT: TT_COMMENT,
    Tokenizer: Tokenizer,
    PushBackReader:PushBackReader
  };
});
