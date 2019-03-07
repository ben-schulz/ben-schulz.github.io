(function(){ 
class TextLoader{

    load( file ){

	var reader = new FileReader();
	reader.onload = event => {

	    var contents = event.target.result; 

	    if( null !== this.onload ){

		this.onload( contents );
	    }
	};

	reader.readAsText( file );
    }

    constructor( displayText="read something" ){

	this.onload = null;

	this.element = document.createElement( "div" );

	this.element.appendChild(
	    document.createTextNode( displayText ) );

	this.element.classList.add( "textloader" );

	this.upload = document.createElement( "input" );
	this.upload.type = "file";

	this.upload.addEventListener( "change", event => {

	    this.load( this.upload.files[ 0 ] );
	} );

	this.element.addEventListener( "click", event => {

	    this.upload.click( event );
	} );
    }
}
class JsonPersister{

    download( data ){

	var json = JSON.stringify( data );
	var type = "application/json";

	var file = new Blob( [ json ], { "type": type } );

	this.ondownload( file );
    }

    constructor( ondownload ){

	this.ondownload = ondownload;
    }
}


class JsonDownload{

    _download( file ){

	var a = document.createElement( "a" );
	var url = URL.createObjectURL( file );

	a.href = url;
	a.download = this.filename || "out.json";
	document.body.appendChild( a );

	a.click();

	setTimeout(function() {

	    document.body.removeChild( a );
	    window.URL.revokeObjectURL( url );

	}, 0);
    }

    downloadObject( value ){

	this._persister.download( value );
    }

    click(){

	if( null !== this.value ){

	    this.downloadObject( this.value );
	}
    }

    constructor( displayText="download marks" ){

	this.element = document.createElement( "div" );

	this.element.appendChild(
	    document.createTextNode( displayText ) );

	this.element.classList.add( "jsondownloader" );

	this.filename = 'out.json';
	this.value = null;

	this._persister = new JsonPersister( this._download );

	this.element.addEventListener( "click", event => {

	    this.click( event );
	} );
    }
}
var Patterns = (function(){
    return {

	"singleAlphaNum": /^[a-zA-Z0-9]$/,
	"alphanumOnly": /^[a-zA-Z0-9]+$/,
	"spaceOnly": /^\s+$/,
	"isPrintable": /^\S+$/,
    };
})();


class Lexeme{

    get length(){

	return this.text.length;
    }

    get isSimpleWord(){

	return Patterns.alphanumOnly.test( this.text );
    }

    get isSpace(){

	return Patterns.spaceOnly.test( this.text );
    }

    get isPrintable(){

	return Patterns.isPrintable.test( this.text );
    }

    constructor( text ){

	this.text = text;
    }
}


var Lexer = (function(){

    return{

	"isAlphaNum": function( c ){

	    return Patterns.singleAlphaNum.test( c );
	},

	"lex": function( text ){

	    if( 1 > text.length ){

		return [];
	    }

	    var tokens = [];
	    var currentToken = "";

	    var currentIsAlpha = this.isAlphaNum( text.charAt( 0 ) );
	    var prevIsAlpha = !currentIsAlpha;

	    for( var ix = 0; ix < text.length; ++ix ){

		var c = text.charAt( ix );

		prevIsAlpha = currentIsAlpha;
		currentIsAlpha = this.isAlphaNum( c );

		if( ( prevIsAlpha && currentIsAlpha )
		    || ( !prevIsAlpha && !currentIsAlpha ) ){

		    currentToken += c;
		}

		else{

		    tokens.push( new Lexeme( currentToken ) );
		    currentToken = c;
		}
	    }

	    tokens.push( new Lexeme( currentToken ) );

	    return tokens;
	}
    };

})();
class Verse{

    get lineCount(){

	return this._textLines.length;
    }

    forEachWordLine( f ){

	for( var ix = 0; ix < this.lineCount; ++ix ){

	    f( this.lineWords( ix ) );
	}
    }

    lineWords( lineNumber ){

	if( this._wordLineEnds.length == lineNumber ){

	    var startIndex = this._wordLineEnds[ lineNumber - 1];

	    return this._lexemes.slice( startIndex );
	}

	if( 0 < lineNumber ){

	    var startIndex = this._wordLineEnds[ lineNumber - 1];
	    var endIndex = this._wordLineEnds[ lineNumber ];

	    return this._lexemes.slice( startIndex, endIndex );
	}

	if( 0 == lineNumber ){

	    var startIndex = 0;
	    var endIndex = this._wordLineEnds[ lineNumber ];

	    return this._lexemes.slice( startIndex, endIndex );
	}

    }

    lineText( lineNumber ){

	if( lineNumber >= this._textLines.length ){

	    return null;
	}

	var lineStart = this._textLines[ lineNumber ][ 0 ];
	var lineEnd = this._textLines[ lineNumber ][ 1 ];

	return this._flat.slice( lineStart, lineEnd );
    }

    _calculateLineEndColumns( lineLength ){

	var textLineEnds = [];
	var currentEnd = 0;

	for( var ix = 0; ix < this._lexemes.length; ++ix ){

	    var token = this._lexemes[ ix ];

	    if( token.length + currentEnd > lineLength ){

		textLineEnds.push( currentEnd );
		currentEnd = 0;
	    }
	    currentEnd += token.length;
	}

	textLineEnds.push( currentEnd );

	return textLineEnds;
    }

    _calculateTextLineIndices( lineEnds ){

	var textLines = [];

	var lineNumber = 0;
	while( lineNumber < lineEnds.length ){

	    var startIndex = 0;
	    for( var ix = 0; ix < lineNumber; ++ix ){

		var nextLineLength = lineEnds[ ix ];
		startIndex += nextLineLength;
	    }

	    var endIndex = (
		startIndex + lineEnds[ lineNumber ] );

	    textLines.push( [ startIndex, endIndex ] );
	    lineNumber += 1;
	}

	return textLines;
    }

    _calculateWordLineIndices( lineEnds ){

	var wordLineIndices = [];
	var lexemeIndex = 0;

	for( var ix = 0; ix < lineEnds.length; ++ix ){

	    var lineLength = lineEnds[ ix ];

	    var columnsUsed = 0;
	    while( columnsUsed < lineLength ){

		columnsUsed += this._lexemes[ lexemeIndex ].length;
		lexemeIndex += 1;
	    }

	    wordLineIndices.push( lexemeIndex );
	}

	return wordLineIndices;
    }

    constructor( text, lineLength=40 ){

	this._flat = text;
	this._lexemes = Lexer.lex( text );

	this.lineLength = lineLength;

	var textLineEnds =
	    this._calculateLineEndColumns( lineLength );

	this._textLines = this._calculateTextLineIndices(
	    textLineEnds );

	this._wordLineEnds = this._calculateWordLineIndices(
	    textLineEnds );
    }
}
class TextSlice{

    get length(){

	return this.end - this.start;
    }

    get isValid(){

	return "number" === typeof this.start
	    && "number" === typeof this.end;
    }

    get isClosed(){

	return "number" === typeof this.start
	    && "number" === typeof this.end
	    && 0 <= this.start
	    && 0 <= this.end;
    }

    constructor( start, end ){

	this.start = Math.min( start, end )
	this.end = Math.max( start, end )
    }
}

class CharBox{

    get innerText(){

	return this.element.innerText;
    }

    setCursor(){

	this.element.id = "cursor";

	var rect = this.element.getBoundingClientRect();

	if( 0 >= rect.top ){

	    window.scrollBy( 0, -window.innerHeight + 40 );
	}

	if( window.innerHeight <= rect.bottom ){

	    window.scrollBy( 0, window.innerHeight - 40 );
	}
    }

    clearCursor(){

	this.element.id = null;
    }

    setHighlight( type="text" ){

	this.element.classList.add( type + "Mark" );
    }

    clearHighlight( type="text" ){

	this.element.classList.remove( type + "Mark" );
    }

    constructor( c ){

	this.text = c;
	this.element = document.createElement( "div" );

	this.element.appendChild(
	    document.createTextNode( this.text ) );

	this.element.classList.add( "charBox" );
    }
}

class WordBox{

    constructor( word ){

	this.element = document.createElement( "div" );

	this.text = word.text;
	this.charBoxes = [];

	for( var ix = 0; ix < word.text.length; ++ix ){

	    if( word.isPrintable ){
		var c = word.text[ ix ];
	    }
	    else{
		var c = " ";
	    }

	    var charBox = new CharBox( c );
	    this.element.appendChild( charBox.element );
	    this.charBoxes.push( charBox );
	}

	this.element.classList.add( "wordBox" );
    }
}

class LineBox{

    get length(){

	return this.charBoxes.length;
    }

    constructor( tokens ){

	this.element = document.createElement( "div" );

	this.charBoxes = [];
	this.wordBoxArray = [];
	for( var ix = 0; ix < tokens.length; ++ix ){

	    var wordBox = new WordBox( tokens[ ix ] );

	    var wordElement = wordBox.element;
	    var charElements = wordBox.charBoxes;

	    this.wordBoxArray.push( wordElement );
	    charElements.forEach(
		c => this.charBoxes.push( c ) );

	    this.element.appendChild( wordElement );
	}
    }
}

class PageBox{

    get lastPos(){

	return this.charBoxes.length - 1;
    }

    home( line ){

	if( 0 < line ){

	    var prevLine = line - 1;

	    return this.lineEnds[ prevLine ] + 1;
	}

	return 0;
    }

    end( line ){

	return this.lineEnds[ line ];
    }

    charPos( line, col ){

	var _line = Math.max( 0, line );
	var prevLine = Math.max( 0, _line - 1 );

	if( 0 < _line ){

	    var lineChars = this.lineEnds[ prevLine ] + 1;
	}
	else{
	    var lineChars = 0;
	}

	return lineChars + col;
    }

    lineNumber( charIndex ){

	if( 0 > charIndex || charIndex > this.lastPos ){

	    return -1;
	}

	var line = 0;
	while( charIndex > this.lineEnds[ line ] ){

	    line += 1;
	}

	return line;
    }

    textSlice( start, end ){

	if( 0 > start || this.lastPos < end ){

	    return null;
	}

	return this.text.slice( start, end ).join( "" );
    }

    charBoxAt( line, col ){

	return this.charBoxes[ this.charPos( line, col ) ];
    }

    charBoxRange( line1, col1, line2, col2 ){

	var ix1 = this.charPos( line1, col1 );
	var ix2 = this.charPos( line2, col2 );

	if( ix1 == ix2 ){

	    return [];
	}

	var slice = new TextSlice( ix1, ix2 );

	return this.charBoxes.slice( slice.start, slice.end + 1 );
    }

    constructor( lexerOutput ){

	this.element = document.createElement( "div" );
	this.element.classList.add( "textReader" );

	this.lines = [];
	this.lineEnds = [];
	this.charBoxes = [];
	this.text = [];

	var charCount = 0;
	lexerOutput.forEachWordLine( line => {

	    var lineBox = new LineBox( line );

	    charCount += lineBox.length;
	    this.lineEnds.push( charCount - 1 );

	    this.lines.push( lineBox );
	    lineBox.charBoxes.forEach( c => {

		this.charBoxes.push( c );
		this.text.push( c.text );
	    } );

	    this.element.appendChild( lineBox.element );
	} );
    }
}

class TextPage{


    get charCount(){

	return this.pageBox.charBoxes.length;
    }

    get lineCount(){

	return this._verses.lineCount;
    }

    lineEndCol( line ){

	if( line < this.lineCount ){

	    return ( this._verses
		     .lineText( line ).length - 1 );
	}

	return -1;
    }

    get currentLineEndCol(){

	return this.lineEndCol( this.cursorLine );
    }

    charBoxAt( line, col ){

	return this.pageBox.charBoxAt( line, col );
    }

    get cursorPos(){

	return this.pageBox.charPos(
	    this.cursorLine, this.cursorCol );
    }

    get markStartPos(){

	if( this.markSet ){

	    return this.pageBox.charPos(
		this.markLine, this.markCol );
	}

	return -1;
    }

    get cursorBox(){

	return this.charBoxAt(
	    this.cursorLine, this.cursorCol );
    }

    get cursorText(){

	return this.charBoxAt(
	    this.cursorLine, this.cursorCol ).text;
    }

    get markSet(){

	return null !== this.markLine;
    }

    _setCursor(){

	var line = this.cursorLine;
	var col = this.cursorCol;
	var charBox = this.charBoxAt( line, col );

	if( charBox ){
	    charBox.setCursor();
	}
    }

    _clearCursor(){

	var line = this.cursorLine;
	var col = this.cursorCol;
	var charBox = this.charBoxAt( line, col );

	if( charBox ){
	    charBox.clearCursor();
	}
    }

    cursorDown(){

	var nextLine = this.cursorLine + 1;

	if( this.lineCount <= nextLine ){

	    return;
	}

	var nextColumn = Math.min( this.cursorCol,
				   this.lineEndCol( nextLine ) );

	var nextPos = this.pageBox.charPos( nextLine,
					    nextColumn );

	var forwardMoves = nextPos - this.cursorPos;

	this.cursorRight( forwardMoves );
    }

    cursorUp(){

	var nextLine = this.cursorLine - 1;

	if( nextLine < 0 ){

	    return;
	}

	var nextColumn = Math.min( this.cursorCol,
				   this.lineEndCol( nextLine ) );

	var nextPos = this.pageBox.charPos( nextLine,
					    nextColumn );

	var backwardMoves = this.cursorPos - nextPos;

	this.cursorLeft( backwardMoves );
    }

    cursorRight( count=1 ){

	var prevPos = this.cursorPos;

	var colsRemaining = (
	    this.pageBox.end( this.cursorLine ) - this.cursorPos );

	this._clearCursor();
	if( count <= colsRemaining ){

	    this.cursorCol += count;
	}
	else if( this.cursorLine < this.lineCount - 1 ){

	    var newLineNumber = this.pageBox.lineNumber(
		this.cursorPos + count );

	    var newLineHome =
		this.pageBox.home( newLineNumber );

	    var newCol = (
		this.cursorPos + count  - newLineHome );

	    this.cursorCol = newCol;
	    this.cursorLine = newLineNumber;
	}
	else{

	    this.cursorCol = (
		this.pageBox.end( this.cursorLine )
		    - this.pageBox.home( this.cursorLine ) );
	}
	this._setCursor();

	if( !this.markSet ){

	    return;
	}

	var currentPos = this.cursorPos;
	for( var pos = prevPos; pos < currentPos; ++pos ){

	    if( this.markStartPos <= pos ){

		this.highlightChar( pos );
	    }
	    else{

		this.clearChar( pos );
	    }
	}

	this.markEndPos = Math.min( this.markEndPos + count,
				    this.charCount - 1 );
    }

    cursorLeft( count=1 ){

	var prevPos = this.cursorPos;
	var colsRemaining = this.cursorCol;

	this._clearCursor();
	if( count <= colsRemaining ){

	    this.cursorCol -= count;
	}
	else if( this.cursorLine > 0 ){

	    var newLine = this.pageBox.lineNumber(
		this.cursorPos - count );

	    var currentLineHome =
		this.pageBox.home( newLine );

	    var currentLineEnd =
		this.pageBox.lineEnds[ newLine ];

	    var newCol = (
		this.cursorPos - count - currentLineHome );

	    this.cursorCol = newCol;
	    this.cursorLine = newLine;
	}
	else{

	    this.cursorCol = 0;
	}
	this._setCursor();

	if( !this.markSet ){

	    return;
	}

	var currentPos = this.cursorPos;
	for( var pos = currentPos; pos < prevPos; ++pos ){

	    if( this.markStartPos > pos ){

		this.highlightChar( pos );
	    }
	    else{

		this.clearChar( pos );
	    }
	}

	this.markEndPos = Math.max( this.markEndPos - count, 0 );
    }

    wordRight(){

	if( this.cursorCol == this.pageBox.lastPos ){

	    return;
	}

	this.cursorRight();
	while( " " == this.cursorText ){

	    this.cursorRight();
	}

	var prevPos = this.cursorPos - 1;
	while( this.cursorText != " "
	       && prevPos != this.cursorPos ){

	    prevPos = this.cursorPos;
	    this.cursorRight();
	}
    }

    wordLeft(){

	if( 0 == this.cursorCol ){

	    return;
	}

	this.cursorLeft();
	while( " " == this.cursorText ){

	    this.cursorLeft();
	}

	var prevPos = this.cursorPos + 1;
	while( this.cursorText != " "
	       && prevPos != this.cursorPos ){

	    prevPos = this.cursorPos;
	    this.cursorLeft();
	}

	if( 1 < this.cursorPos ){
	    this.cursorRight();
	}
    }

    highlightChar( pos ){

	this.pageBox.charBoxes[ pos ]
	    .setHighlight( this.markType );
    }

    clearChar( pos, markType=null ){

	if( null === markType ){

	    var markType = this.markType;
	}

	this.pageBox.charBoxes[ pos ]
	    .clearHighlight( markType );
    }

    toggleMark( type="text" ){

	if( null !== this.markType && type != this.markType ){

	    return;
	}

	if( this.markSet ){

	    this.unsetMark( type );
	}
	else{

	    this.setMark( type );
	}
    }

    setMark( type="text" ){

	this.markLine = this.cursorLine;
	this.markCol = this.cursorCol;

	this.markType = type;

	this.markEndPos = this.markStartPos;

	this.activeMarks[ type ] = {

	    "start": this.markStartPos,
	    "end": null
	};
    }

    unsetMark( type="text" ){

	this.activeMarks[ type ][ "end" ] =
	    this.markEndPos;

	this.clearMark();
    }

    clearMark(){

	this.markLine = null;
	this.markCol = null;

	this.markType = null;
	this.markEndPos = null;
    }

    get markedText(){

	var slice =
	    new TextSlice( this.markStartPos, this.markEndPos );

	return this.pageBox.textSlice( slice.start, slice.end );
    }

    persistMarks(){

	if( null == this.onpersist ){

	    return;
	}

	var output = {};
	this.markTypes.forEach( t => {

	    var start = this.activeMarks[ t ].start;
	    if( null !== this.activeMarks[ t ].end ){

		var end = this.activeMarks[ t ].end;
	    }
	    else{

		var end = this.cursorPos;
	    }
	    var slice = new TextSlice( start, end );

	    if( slice.isClosed ){

		output[ t ] = {
		    "start": slice.start,
		    "end": slice.end
		};
	    }
	} );

	this.onpersist( output );
	this.clearAll();
    }

    get markTypes(){

	return Object.keys( this.activeMarks );
    }

    clearAll(){

	this.markTypes.forEach( t => {

	    var start = this.activeMarks[ t ].start;
	    if( null !== this.activeMarks[ t ].end ){

		var end = this.activeMarks[ t ].end;
	    }
	    else{

		var end = this.cursorPos;
	    }
	    var slice = new TextSlice( start, end );

	    if( slice.isValid ){

		for( var pos = slice.start;
		     pos <= slice.end; ++pos ){

		    this.clearChar( pos, t );
		}
	    }

	} );

	this.clearMark();

	this.activeMarks = {};
    }

    constructor( text, lineLength=60 ){

	var verses = new Verse( text, lineLength );

	this._verses = verses;

	this.pageBox = new PageBox( verses );
	this.element = this.pageBox.element;

	this.cursorLine = 0;
	this.cursorCol = 0;

	this._setCursor();

	this.markLine = null;
	this.markCol = null;

	this.markType = null;
	this.markEndPos = null;

	this.activeMarks = {};

	this.onpersist = null;
	this._highlightedText = [];
    }
}
var KeyCode = {

    "Letter": s => {

	var singleAlpha = /[a-zA-Z]/;

	if( 1 == s.length && singleAlpha.test( s ) ){

	    return s;
	}

	return null;
    },

    "Numeral": s => {

	var singleNum = /[0-9]/;

	if( 1 == s.length && singleNum.test( s ) ){

	    return s;
	}

	return null;
    },

    "Escape": "Escape",
    "Backspace": "Backspace",
    "Enter": "Enter"
};

class Key{

    charEquals( c ){

	return this.keyValue == c;
    }

    constructor( key ){

	this.keyValue = key;

	this.isBackspace = key === KeyCode.Backspace;
	this.isEscape = key === KeyCode.Escape;
	this.isEnter = key === KeyCode.Enter;
    }
}

class KeyboardInput{

    _dispatch( eventType, key ){

	var detail = { "detail" : { "key": new Key( key ) } };

	var event = new CustomEvent( eventType, detail );

	this.target.dispatchEvent( event );

    }

    keypress( key ){

	this._dispatch( "keypress", key );
    }

    keydown( key ){

	this._dispatch( "keydown", key );
    }

    keyup( key ){

	this._dispatch( "keyup", key );
    }


    typeKeys( seq ){

	for( var ix = 0; ix < seq.length; ++ix ){

	    this._dispatch( "keypress", seq[ix] );
	}
    }

    bindInput( node ){

	node.addEventListener(
	    "keypress", event => this.keypress( event.key ) );

	node.addEventListener(
	    "keydown", event => this.keydown( event.key ) );

	node.addEventListener(
	    "keyup", event => this.keyup( event.key ) );
    }

    constructor( target ){

	this.target = target;
    }
}
class CursorEvent{

    constructor( type ){

	var detail = {

	    "type": type
	};

	this.type = type;
	this.event = new CustomEvent( "cursorInput",
				      { "detail": detail } );
    }
}

class KeyDispatcher{

    subscribe( eventType, handler ){

	this._handlers[ eventType ] = handler;
    }

    dispatch( event ){

	this._handlers[ event.type ]( event.detail );
    }

    constructor( mapping = null ){

	this._handlers = mapping || {};
    }
}
var Annotations = ( function(){

    return {
	"marks":[]
    }

}() );

var keyMap = {

    "w": "moveUp",
    "s": "moveDown",
    "a": "moveLeft",
    "d": "moveRight",

    "q": "wordLeft",
    "e": "wordRight",

    "m": "toggleMark",
    "u": "toggleSubject",
    "i": "toggleRelation",
    "o": "toggleObject",

    "Enter": "persistMarks",
    "Escape": "clearAll"
};

var bindHandlers = function( page ){

    return {
	"moveUp": _ => page.cursorUp(),
	"moveDown": _ => page.cursorDown(),
	"moveLeft": _ => page.cursorLeft(),
	"moveRight": _ => page.cursorRight(),

	"wordLeft": _ => page.wordLeft(),
	"wordRight": _ => page.wordRight(),

	"toggleMark": _ => page.toggleMark( "text" ),
	"toggleSubject": _ => page.toggleMark( "subject" ),
	"toggleRelation": _ => page.toggleMark( "relation" ),
	"toggleObject": _ => page.toggleMark( "object" ),

	"unsetMark": _ => page.unsetMark(),

	"persistMarks": _ => page.persistMarks(),
	"clearAll": _ => page.clearAll(),
    };
};

var bindKeys = function( handlers ){

    var result = {};
    Object.keys( keyMap ).forEach( key => {

	var actionName = keyMap[ key ];

	result[ key ] = handlers[ actionName ];
    } );

    return result;
};


var bindKeyboardEvents = function( handlers ){

    document.addEventListener(

	"keydown", event => {

	    var key = event.key;

	    if( key in handlers ){
		handlers[ key ]();
	    }
	}
    );
};

var controls = document.getElementById( "controlPanel" );

var textLoader = new TextLoader();

controls.appendChild( textLoader.element );

textLoader.onload = text => {

    var page = new TextPage( text );

    page.onpersist = mark => {

	Annotations.marks.push( mark );
    };

    var pageHandlers = bindHandlers( page );
    var keyHandlers = bindKeys( pageHandlers );

    bindKeyboardEvents( keyHandlers );

    document.body.appendChild( page.element );
};



var jsonDownloader = new JsonDownload();
controls.appendChild( jsonDownloader.element );

jsonDownloader.value = Annotations;


var keyLegend = document.createElement( "table" );
keyLegend.id = "keyLegend";

var makeDocCell = function( key, val ){

    var cell = document.createElement( "td" );
    cell.style.paddingLeft = "3px";
    cell.style.paddingRight = "3px";
    cell.style.paddingTop = "3px";
    cell.style.paddingBottom = "3px";

    cell.appendChild(
	document.createTextNode( key + " : " + val ) );

    return cell;
};

var keys = Object.keys( keyMap )
for( var ix = 0; ix < keys.length; ix += 3 ){

    var row = document.createElement( "tr" );

    var k0 = keys[ ix ];
    var cell0 = makeDocCell( k0, keyMap[ k0 ] );

    var k1 = keys[ ix + 1 ];
    if( undefined === k1 ){

	break;
    }
    var cell1 = makeDocCell( k1, keyMap[ k1 ] );

    var k2 = keys[ ix + 2 ];
    if( undefined === k2 ){

	break;
    }

    var cell2 = makeDocCell( k2, keyMap[ k2 ] );

    row.appendChild( cell0 );
    row.appendChild( cell1 );
    row.appendChild( cell2 );

    keyLegend.appendChild( row );
}

document.body.appendChild( keyLegend );
}());