/*
 * @(#)Tokenizer.js  1.0  2016-10-29
 *
 * Copyright (c) 2011-2016 Werner Randelshofer, Switzerland.
 * You may not use, copy or modify this file, except in compliance with the
 * accompanying license terms.
 */
"use strict";

// --------------
// require.js
// --------------
define("Tokenizer", [],
function () {

// ttypes for GreedyTokenizer
// ----------------------
let TT_WORD="word";
let TT_EOF="eof";
let TT_SKIP="skip";

// the following ttypes can be activated on demand
let TT_KEYWORD="keyword"
let TT_NUMBER="number";
let TT_COMMENT="comment";

// the following ttypes are used internally
let TTT_COMMENT_BEGIN="commentBegin";
let TTT_DIGIT="numberDigit";
let TTT_KEYWORD_PART="keywordPart";

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
class KeywordTree  {
  /**
   * Constructos a new instance.
   * .
   * @param {type} keyword
   */
  constructor(keyword) {
    this.keyword=keyword;
    this.children={};
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
   * You can activate tokenization of keywords, by adding keyword tokens.
   */
  class GreedyTokenizer {
      constructor() {
        this.tokens={}; // Map<String,Object> maps text to  ttype
        this.commentBeginEnd=[]; // Map<String,Strings> maps comment begin to end
        this.input="";
        this.pos=0;
        this.pushBack=false;
        this.ttype=TT_EOF;
        this.tstart=0;
        this.tend=0;
        this.tstring=null;
        this.keywordTree=new KeywordTree(null);
      }
      
      /**
       * Defines a character token.
       * 
       * @param {Character} token
       * @param {Object} ttype
       * @returns nothing
       */
      addToken(token, ttype) {
        if (token.length!=1) throw new "token must be 1 character!, token:"+token;
        if (ttype==TT_WORD) {
        delete this.token[token];
        }else{
        this.tokens[token]=ttype;
        }
      }
      /**
       * Defines the tokens needed for parsing positive integers.
       * 
       * @param {String} token
       * @param {Object} ttype
       * @returns nothing
       */
      addDigitTokens() {
        this.addToken("0",TTT_DIGIT);
        this.addToken("1",TTT_DIGIT);
        this.addToken("2",TTT_DIGIT);
        this.addToken("3",TTT_DIGIT);
        this.addToken("4",TTT_DIGIT);
        this.addToken("5",TTT_DIGIT);
        this.addToken("6",TTT_DIGIT);
        this.addToken("7",TTT_DIGIT);
        this.addToken("8",TTT_DIGIT);
        this.addToken("9",TTT_DIGIT);
      }
      /**
       * Defines the tokens needed for skipping whitespace.
       * 
       * @param {String} token
       * @param {Object} ttype
       * @returns nothing
       */
      skipWhitespaceTokens() {
        this.addToken(" ",TT_SKIP);
        this.addToken("\f",TT_SKIP);
        this.addToken("\n",TT_SKIP);
        this.addToken("\r",TT_SKIP);
        this.addToken("\t",TT_SKIP);
        this.addToken("\v",TT_SKIP);
        this.addToken("\u00a0",TT_SKIP);
        this.addToken("\u2028",TT_SKIP);
        this.addToken("\u2029",TT_SKIP);
      }
      /**
       * Defines a keyword token.
       * 
       * @param {String} token
       * @returns nothing
       */
      addKeyword(token) {
        let node=this.keywordTree;
        for (let i=0;i<token.length;i++) {
          let ch=token.charAt(i);
console.log('Tokenizer.addKeyword '+ch);          
          let child=node.children[ch];
          if (child==null) {
            child=new KeywordTree(null);
            node.children[ch]=child;
          }
          node=child;
        }
        node.keyword=token;
      }
      
      /** Sets the input for the tokenizer. 
       * 
       * @param [String] input;
       */
      setInput(input) {
        this.input=input;
        this.pos=0;
        this.pushBack=false;
        this.ttype=null;
        this.tstart=null;
        this.tstring=null;
      }
      
      /** Returns the current token type. 
       * 
       * @returns [Object] token type
       */
      getTType() {
        return this.ttype;
      }
      
      /** Returns the current token string value. 
       * 
       * @returns [String] value or nul
       */
      getTString() {
        return this.tstring;
      }
      
      /** Parses the next token. 
       * @return [Object] ttype
       */
      next() {
        if (this.pushBack) {
          this.pushBack=false;
          return this.ttype;
        }
        
        let ch=this.read();
        
        // try to skip characters
        while (ch!=null&&this.tokens[ch]==TT_SKIP) {
          ch=this.read();
        }
        
        // start position of the token
        let start=this.pos - 1; 
        
        // try to tokenize a keyword 
        let node=this.keywordTree;
        let keyword=null;
        while (ch!=null&&node.children[ch]!=null) {
          node=node.children[ch];
          if (node.keyword!=null) {
            keyword=node.keyword;
          }
          ch=this.read();
        }
        if (keyword != null) {
          this.setPosition(start+keyword.length);
          this.ttype=TT_KEYWORD;
          this.tstart=start;
          this.tstring=keyword;
          return this.ttype;
        }
        
        // try to tokenize a word
        while (ch!=null&&this.tokens[ch]==null) {
          ch=this.read();
        }
        if (ch!=null) {this.unread();}
        if (this.pos>start+1) {
          this.ttype=TT_WORD;
          this.tstart=start;
          this.tstring=this.input.substring(start,this.pos);
          return this.ttype;
        } else {
          this.unread();
        }
        // FIXME implement me
        this.ttype=TT_EOF;
        return this.ttype;
      }
      
      /**
       * Reads the next character from input.
       * 
       * @return the next character or null in case of EOF
       */
      read() {
        if (this.pos<this.input.length) {
          let ch=this.input.charAt(this.pos);
          this.pos = this.pos+1;
          return ch;
        } else {
          this.pos=this.input.length;
          return null;
        }
      }
      /**
       * Unreads the last character from input.
       */
      unread() {
        if (this.pos>0) {
          this.pos = this.pos-1;
        }
      }
      /**
       * Sets the input position.
       */
      setPosition(newValue) {
        this.pos=newValue;
      }
  }

// ------------------
// MODULE API    
// ------------------
  return {
    TT_WORD:TT_WORD,
    TT_KEYWORD:TT_KEYWORD,
    TT_SKIP:TT_SKIP,
    TT_EOF:TT_EOF,
    TT_NUMBER:TT_NUMBER,
    TT_COMMENT:TT_COMMENT,
    GreedyTokenizer: GreedyTokenizer
  };
});
