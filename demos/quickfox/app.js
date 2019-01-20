(function(){ 
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
class TextBuffer{


    clear(){

	this.contents = [];
    }

    subscribe( condition, action, clearAfter ){

	this._subscribers.push( {

	    "condition": condition,
	    "action": action,
	    "clearAfter": clearAfter || false
	} );
    }

    print(){

	var token = [];
	var tokenLength = this.contents.length;

	for( var ix = 0; ix < tokenLength; ++ix ){

	    token.push( this.contents[ix].keyValue );
	}

	return token.join("");
    }

    constructor( document, type ){

	this.element = document.createElement( type );
	this.contents = [];

	this._subscribers = [];

	this.buffer = event => {

	    this.contents.push( event.detail.key );

	    var shouldClear = false;
	    this._subscribers.forEach( s => {

		if( s.condition( this.contents ) ){

		    s.action( this.contents );

		    shouldClear = shouldClear || s.clearAfter;
		}
	    } );

	    if( shouldClear ){

		this.clear();
	    }
	};

	this.element.addEventListener(
	    "keypress", this.buffer );
    }
}
class CharBox{

    constructor( c ){

	this.text = c;

	this.elementType = "span";
	this.element = document.createElement( this.elementType );

	this.element.appendChild(
	    document.createTextNode( c ) );

	this.element.classList.add( "charbox" );
    }
}
var LexemeState = (function() {

    var states = {
	"Unfocused": "unfocused",

	"Referent": "referent",

	"SubjectFocus": "subjectfocus",
	"ObjectFocus": "objectfocus",
	"RelationFocus": "relationfocus",
    };

    return{

	"Unfocused": states.Unfocused,

	"Referent": states.Referent,

	"SubjectFocus": states.SubjectFocus,
	"ObjectFocus": states.ObjectFocus,
	"RelationFocus": states.RelationFocus,

	"All": [
	    states.Unfocused,
	    states.SubjectFocus,
	    states.ObjectFocus,
	    states.RelationFocus,
	]
    };
})();


class Lexeme{

    _showState( newLexemeState ){

	LexemeState.All.forEach( state => {

	    this.element.classList.remove( state );
	});

	this.element.classList.add( newLexemeState );
    }

    clearHighlights(){

	this.viewState = LexemeState.Unfocused;
	this._showState( LexemeState.Unfocused );
    }

    get isFocused(){

	return ( this.isSubject
		 || this.isObject
		 || this.isRelation );
    }

    get isUnfocused(){

	return this.viewState === LexemeState.Unfocused;
    }

    get isObject(){

	return this.viewState === LexemeState.ObjectFocus;
    }

    get isSubject(){

	return this.viewState === LexemeState.SubjectFocus;
    }

    get isRelation(){

	return this.viewState === LexemeState.RelationFocus;
    }

    highlightSubject(){

	this.viewState = LexemeState.SubjectFocus;
	this._showState( this.viewState );
    }

    highlightObject(){

	this.viewState = LexemeState.ObjectFocus;
	this._showState( this.viewState );
    }

    highlightRelation(){

	this.viewState = LexemeState.RelationFocus;
	this._showState( this.viewState );
    }

    showAsReferent(){

	this.element.classList.add( LexemeState.Referent );
	this.isReferent = true;

    }


    showAsNonReferent(){

	this.element.classList.remove( LexemeState.Referent );
	this.isReferent = false;
    }

    mouseover(){

	if( this.isReferent ){

	    this.tooltip.style.display = "block";

	    var rect = this.element.getBoundingClientRect();

	    var tooltipLeftPixels = (
		rect.right + window.scrollX
	    );

	    var tooltipTopPixels = (
		rect.bottom + window.scrollY - this.offsetY
	    );

	    this.element.dispatchEvent(

		    new CustomEvent( "showtooltip", {

			"bubbles": true,
			"detail": {
			    "target": this,
			    "text": this.text.toLowerCase(),
			    "clientX": tooltipLeftPixels,
			    "clientY": tooltipTopPixels
			} } )
		);
	}
    }

    mouseleave(){

	if( this.isReferent ){

	    this.tooltip.style.display = "none";

	    this.element.dispatchEvent(

		new CustomEvent( "tooltipinactive", {

		    "bubbles": true,
		    "detail": { "target": this } } )
	    );
	}
    }

    constructor( text ){

	this.text = text;
	this.length = text.length;

	this.isReferent = false;

	this.offsetY = 0;

	this.element = (() => {

	    var displayText =
		document.createTextNode( text );

	    var textSpan = document.createElement( "span" );

	    for( var ix = 0; ix < text.length; ++ix ){

		textSpan.appendChild(
		    new CharBox( text.charAt( ix ) ).element );
	    }

	    textSpan.value = text;

	    textSpan.classList.add( "lexeme" );

	    return textSpan;

	})();

	this.tooltip = (() => {

	    var tooltip = document.createElement( "div" );

	    tooltip.classList.add( "tripletooltip" );
	    tooltip.style.display = "none";

	    return tooltip;
	})();

	this.clearHighlights();

	this.element.addEventListener(
	    "clearHighlights", this.clearHighlights );

	this.element.addEventListener(
	    "click", event => {

		this.element.dispatchEvent(
		    new CustomEvent( "lexemeSelected", {

			"bubbles": true,
			"detail": { "target": this } } )
		);
	    });

	this.element.addEventListener(
	    "saveTriple", event => {

		this.showAsReferent();

		if( event.detail ){

		    var newText = document.createTextNode(
			event.detail.subject
			    + " -> " + event.detail.relation
			    + " -> " + event.detail.object
		    );

		    var newRow = document.createElement( "span" );

		    newRow.appendChild( newText );
		    this.tooltip.appendChild( newRow );
		}

	} );


	this.element.addEventListener(
	    "mouseenter", event => {

		this.mouseover();
	    } );

	this.element.addEventListener(
	    "mouseleave", event => {

		this.mouseleave();
	    } );
    }
}

class Separator{

    constructor( text ){

	this.text = text;
	this.length = text.length;

	this.element = (function(){

	    var displayText =
		document.createTextNode( text );

	    var textSpan = document.createElement( "span" );

	    textSpan.value = text;

	    textSpan.appendChild( displayText );

	    return textSpan;

	})();
    }
}


var Lexer = {

    "alphaRegex": /[a-zA-Z]/,

    "isAlpha": function( c ){

	return this.alphaRegex.test( c );
    },

    "lex": function( text ){

	if( 1 > text.length ){

	    return [];
	}

	var tokens = [];
	var currentToken = "";

	var currentIsAlpha = this.isAlpha( text.charAt( 0 ) );
	var prevIsAlpha = !currentIsAlpha;
	
	for( var ix = 0; ix < text.length; ++ix ){

	    var c = text.charAt( ix );

	    prevIsAlpha = currentIsAlpha;
	    currentIsAlpha = this.isAlpha( c );

	    if( ( prevIsAlpha && currentIsAlpha )
		|| ( !prevIsAlpha && !currentIsAlpha ) ){

		currentToken += c;
	    }

	    else if( prevIsAlpha && !currentIsAlpha ){

		tokens.push( new Lexeme( currentToken ) );
		currentToken = c;
	    }

	    else{

		tokens.push( new Separator( currentToken ) );
		currentToken = c;
	    }
	}

	tokens.push( new Lexeme ( currentToken ) );

	return tokens;
    },
};
class Tooltip{

    get childNodes(){

	return this.element.childNodes;
    }

    clear(){

	while( this.element.firstChild ){

	    this.element.removeChild( this.element.firstChild );
	}
	this.lines = [];
    }

    addItems( items ){

	this.clear();
	items.forEach( x => {

	    var text = (`${x[ 0 ]} : ${x[ 1 ]} : ${x[ 2 ]}` );

	    this.lines.push( text );
	} );

	this.render();
    }

    render(){

	var width = 0;
	this.lines.forEach( l => {

	    var line = document.createElement( "div" );

	    var linePixels = this.pixelsPerChar * l.length;
	    if( width < linePixels ){
		width = linePixels
	    }

	    line.appendChild( 
		document.createTextNode( l ) );

	    this.element.appendChild( line );
	} );

	this.element.style.width = width + "px";
    }

    show( event ){

	this.element.style.display = "block";

	this.clientX = event.clientX;
	this.clientY = event.clientY;

	this.element.style.left = this.clientX + "px";
	this.element.style.top = this.clientY + "px";
    }


    hide( event ){

	this.element.style.display = "none";
    }


    constructor(){

	this._lock = false;

	this.lines = [];

	this.pixelsPerChar = 7;

	this.elementType = "div";
	this.element = document.createElement(
	    this.elementType );

	this.element.classList.add( "tooltip" );

	this.element.style.display = "none";
	this.element.style.position = "absolute";

	this.element.addEventListener( "showtooltip", event => {

	    this.show( event.detail );
	} );

	this.element.addEventListener( "hidetooltip", event => {

	    this.hide();
	} );
    }
}
class TreeView{

    getChild( refList ){

	var nextRef = refList[ 0 ];
	var nextValue = this.children[ nextRef ];

	if( 1 == refList.length ){

	    return nextValue;
	}

	return nextValue.getChild( refList.slice( 1 ) );
    }

    constructor( json, refs=[] ){

	this.refs = refs;
	this.children = {};
	
	this.elementType = "div";
	
	this.element = ( () => {

	    var el = document.createElement( this.elementType );

	    el.classList.add( "jsonTreeView" );

	    var openBrace = document.createTextNode( "{" );

	    if( 0 < refs.length ){
		var closeBrace = document.createTextNode( "}," );
	    }

	    else{
		var closeBrace = document.createTextNode( "}" );
	    }

	    if( 0 < refs.length ){

		var lastRef = refs[ refs.length - 1 ];
		el.append(
		    document.createTextNode( lastRef + ":" ) );
	    }

	    el.append( openBrace );

	    Object.keys( json ).forEach( k => {

		if( "object" === typeof json[ k ] ){
		    
		    refs.push( k );
		    var subtree = new TreeView( json[ k ], refs )
		    refs.pop()

		    el.append( subtree.element );
		}

		else{

		    var valueDiv =
			document.createElement( this.elementType );

		    valueDiv.classList.add( "jsonTreeView" );

		    valueDiv.append(
			document.createTextNode(
			    json[ k ] + "," ) );

		    el.append( valueDiv );
		}

		this.children[ k ] = subtree;
	    } );

	    el.append( closeBrace );

	    return el;
	})();
    }
}
class TripleTree{


    iterate( f ){

	Object.keys( this.nodes ).forEach( subj => {

	    Object.keys( this.nodes[ subj ] ).forEach( rel => {

		Object.keys( this.nodes[ subj ][ rel ] )
		    .forEach( obj => {

			f( subj, rel, obj );
		    } );
	    } );
	} );
    }

    containsKey( key, depth=0 ){

	if( 0 === depth ){
	    return key in this.nodes;
	}

	else if( 1 === depth ){

	    Object.keys( this.nodes ).forEach( first => {

		if( key in this.nodes[ first ] ){

		    return true;
		}

	    } );

	    return false;
	}

	else if( 2 === depth ){

	    Object.keys( this.nodes )
		.forEach( first => {

		    Object.keys( this.nodes[ first ] )
			.forEach( second => {

			    if( key in
				this.nodes[ first ][ second ] ){

				return true;
			    }
			} );
		} );
	}
    }

    containsTriple( t ){

	if( 3 !== t.length ){

	    return false;
	}

	var first = t[ 0 ]
	var second = t[ 1 ]
	var third = t[ 2 ]

	return (

	    first in self.nodes
		&& second in self.nodes[ first ]
		&& third in self.nodes[ first ][ second ]
	)
    }

    ref( keys ){

	var result = this.nodes;

	keys.forEach( k => {

	    result = result[ k ];
	} );

	return result;
    }

    insert( triple ){

	var first = triple[ 0 ];

	if( !( first in this.nodes ) ){

	    this.nodes[ first ] = {};
	}

	var second = triple[ 1 ];

	if( !( second in this.nodes[ first ] ) ){

	    this.nodes[ first ][ second ] = {};
	}

	var third = triple[ 2 ];
	this.nodes[ first ][ second ][ third ] = third;
    }

    union( other ){

	var result = new TripleTree();

	this.iterate( ( first, second, third ) => {

	    result.insert( [ first, second, third ] );
	} );

	other.iterate( ( first, second, third ) => {

	    result.insert( [ first, second, third ] );
	} );

	return result;
    }

    flatten(){

	var result = [];

	this.iterate( ( first, second, third ) => {

	    result.push( [ first, second, third ] );
	} );

	return result;
    }

    constructor( triples=[] ){

	this.nodes = {};

	if( 0 < triples.length ){

	    triples.forEach( t => {

		this.insert( t );
	    } );
	}
    }
}

class TripleStore{

    static isReferent( token ){

	if( token ){

	    return true;
	}

	return false;
    }

    addTriple( t ){

	var subject = t.subject.toLowerCase();
	var relation = t.relation.toLowerCase();

	if( t.object ){
	    var object = t.object.toLowerCase();
	}
	else{
	    var object = null;
	}

	this.bySubject.insert( [

	    subject,
	    relation,
	    object
	] );


	this.byRelation.insert( [

	    relation,
	    subject,
	    object
	] );

	this.byObject.insert( [

	    object,
	    subject,
	    relation
	] );


	if( !this.triples[ subject ] ){

	    this.triples[ subject ] = {};
	}

	if( !this.triples[ subject ][ relation ] ){

	    this.triples[ subject ][ relation ] = {};
	}

	if( TripleStore.isReferent( object ) ){

	    this.triples[ subject ][ relation ][ object ] =
		object;
	}
    }

    toJson(){

	return JSON.stringify( this.triples );
    }


    static _queryTree( pred, tripleTree ){

	var result= new TripleTree();

	var keys = Object.keys( tripleTree.nodes );

	keys.forEach( k => {

	    if( pred( k ) ){

		var first = k;
		var seconds = tripleTree.nodes[ first ];

		Object.keys( seconds ).forEach( second => {

		    var thirds =
			tripleTree.nodes[ first ][ second ];

		    Object.keys( thirds ).forEach( third => {
			    result.insert( [
				first,
				second,
				third
			    ] );
			} );
		    } );
	    }
	} );

	return result;
    }

    querySubject( pred ){

	var result = TripleStore._queryTree( pred, this.bySubject );

	return result;
    }


    queryRelation( pred ){

	var result = TripleStore._queryTree(
	    pred, this.byRelation );

	var triples = result.flatten().map( x => {

	    return [ x[ 1 ], x[ 0 ], x[ 2 ] ];
	} );

	return new TripleTree( triples );
    }


    queryObject( pred ){

	var result =  TripleStore._queryTree( pred, this.byObject );

	var triples = result.flatten().map( x => {

	    return [ x[ 1 ], x[ 2 ], x[ 0 ]  ];
	} );

	return new TripleTree( triples );
    }


    constructor(){

	this.triples = {};

	this.bySubject = new TripleTree();
	this.byRelation = new TripleTree();
	this.byObject = new TripleTree();
    }
}

var TripleComponent = {

	"Subject": "tripleSubject",
	"Relation": "tripleRelation",
	"Object": "tripleObject",
};

class TripleState{

    clear(){

	this.subject = null;
	this.relation = null;
	this.object = null;

	this.vacant = [

	    TripleComponent.Object,
	    TripleComponent.Relation,
	    TripleComponent.Subject,
	];

	this.filled = [];
    }

    get hasSubject(){

	return null !== this.subject;
    }

    get hasObject(){

	return null !== this.object;
    }

    get hasRelation(){

	return null !== this.relation
    }

    get isComplete(){

	return ( this.hasSubject
		 && this.hasRelation );
    }

    get isFull(){

	return ( this.hasSubject
		 && this.hasRelation
		 && this.hasObject ) ;
    }


    fillNext( data ){

	if( 1 > this.vacant.length ){

	    return null;
	}

	var next = this.vacant.pop();
	this.filled.push( next );

	this.setters[ next ]( data );

	return next;
    }

    vacateLast(){

	if( 1 > this.filled.length ){

	    return;
	}

	var last = this.filled.pop();
	this.vacant.push( last );

	this.setters[ last ]( null );
    }

    _vacate( component ){

	var ix = this.filled.indexOf( component );

	if( 0 > ix ){

	    return;
	}

	this.vacant.push( component );
	this.filled.splice( ix, 1 );

	this.setters[ component ]( null );
    }

    vacateSubject(){

	this._vacate( TripleComponent.Subject );
    }

    vacateObject(){

	this._vacate( TripleComponent.Object );
    }

    vacateRelation(){

	this._vacate( TripleComponent.Relation );
    }

    setSubject( data ){

	this.subject = data;
    }

    setObject( data ){

	this.object = data;
    }

    setRelation( data ){

	this.relation = data;
    }

    constructor(){

	this.clear();

	this.setters = {}

	this.setters[ TripleComponent.Subject ] =
	    value => this.setSubject( value );

	this.setters[ TripleComponent.Object ] =
	    value => this.setObject( value );

	this.setters[ TripleComponent.Relation ] =
	    value => this.setRelation( value );
    }
}


class LayeredDisplay{

    toggle(){

	if( this._reversed ){

	    this.moveForegroundToFront();
	    this._reversed = false;
	}

	else{

	    this.moveBackgroundToFront();
	    this._reversed = true;
	}
    }

    moveForegroundToFront(){

	this.active = this.foreground;
	this._reversed = false;

	this.foreground.style.zIndex = this.activeZ;
	this.background.style.zIndex = this.inactiveZ;
    }

    moveBackgroundToFront(){

	this.active = this.background;
	this._reversed = true;

	this.foreground.style.zIndex = this.inactiveZ;
	this.background.style.zIndex = this.activeZ;
    }

    constructor(){

	this.activeZ = 2;
	this.inactiveZ = 1

	this.elementType = "div";

	this._reversed = false;

	this.container = document.createElement(
		this.elementType );

	this.foreground =
	    document.createElement( this.elementType );

	this.background =
	    document.createElement( this.elementType );

	this.container.appendChild( this.foreground );
	this.container.appendChild( this.background );

	this.container.addEventListener(
	    "tooltipactive", event => {

		this.moveBackgroundToFront();
	} );

	this.container.addEventListener(
	    "tooltipinactive", event => {

		this.moveForegroundToFront();
	} );

	this.moveForegroundToFront();
    }
}


class TextCanvas{

    get hasSubject(){

	return this.tripleState.hasSubject;
    }

    set hasSubject( boolValue ){

	this.tripleState.hasSubject = boolValue;
    }

    get hasObject(){

	return this.tripleState.hasObject;
    }

    set hasObject( boolValue ){

	this.tripleState.hasObject = boolValue;
    }

    get hasRelation(){

	return this.tripleState.hasRelation;
    }

    set hasRelation( boolValue ){

	this.tripleState.hasRelation = boolValue;
    }

    get subject(){

	return this.tripleState.subject;
    }

    get object(){

	return this.tripleState.object;
    }

    get relation(){

	return this.tripleState.relation;
    }
    
    _unfocusLexeme( lex ){

	this.lexTable[ lex.text ].forEach( l => {

	    this.unsubscribe( l.element );
	} );

	if( lex.isSubject ){

	    this.tripleState.vacateSubject();
	}
	else if( lex.isRelation ){

	    this.tripleState.vacateRelation();
	}
	else if( lex.isObject ){

	    this.tripleState.vacateObject();
	}

	lex.clearHighlights();
    }

    _focusLexeme( lex ){

	var next = this.tripleState.fillNext( lex.text );

	this.highlights.push( lex );

	this.lexTable[ lex.text ].forEach( l => {

	    this.subscribe( "saveTriple", l.element );
	} );

	if( next === TripleComponent.Subject ){

	    lex.highlightSubject();
	    return;
	}

	if( next === TripleComponent.Relation ){

	    lex.highlightRelation();
	    return;
	}

	if( next === TripleComponent.Object ){

	    lex.highlightObject();
	    return;
	}
    }

    lexemeSelected( lex ){

	if( lex.isFocused || this.tripleState.isFull ){

	    this._unfocusLexeme( lex );
	    return;
	}

	this._focusLexeme( lex );
    }

    clearHighlights(){

	this.highlights.forEach( lex => {

	    lex.clearHighlights();
	});

	this.highlights = [];
	this.tripleState.clear();
    }


    saveTriple(){

	if( !this.tripleState.isComplete ){

	    return;
	}

	var save = new CustomEvent( "saveTriple", {

	    "detail": {

		"subject": this.subject,
		"relation": this.relation,
		"object": this.object,
	    }
	});

	this.subscribers[ "saveTriple" ].forEach( target => {

	    target.dispatchEvent( save );
	});

	this.tripleStore.addTriple( this.tripleState );
    }


    subscribe( eventName, listener ){

	if( !this.subscribers.hasOwnProperty( eventName ) ){

	    this.subscribers[ eventName ] = [];
	}

	this.subscribers[ eventName ].push( listener );
    }

    unsubscribe( eventName, listener ){

	if( eventName in this.subscribers ){

	    var listenerIndex =
		this.subscribers[ eventName ].index( listener );

	    if( -1 === listenerIndex ){
		return;
	    }

	    this.subscribers[ eventName ].splice(
		listenerIndex, 1 );
	}
    }

    setMaxLineChars( charCount ){

	this.maxLineChars = charCount;
    }

    constructor( document ){

	var defaultLineChars = 40;

	this.nextColumn = 0;
	this.maxLineChars = defaultLineChars;
	this.nextLine = 0;

	this.elementType = "div";

	this.boundingRect = {
	    "top": 0,
	    "right": 0,
	    "bottom": 0,
	    "left": 0
	};

	this.tripleStore = new TripleStore();

	this.display = new LayeredDisplay();

	this.textLayer = this.display.foreground;
	this.tooltipLayer = this.display.background;

	this.highlights = [];

	this.lexTable = {};

	this.subscribers = { "saveTriple": [] };

	this.tripleState = new TripleState();

	this.tooltip = new Tooltip();
	this.tooltipLayer.appendChild( this.tooltip.element );

	this.textLayer.addEventListener(
	    "clearHighlights", event => {

		this.clearHighlights();
	});

	this.textLayer.addEventListener(
	    "hidetooltip", event => {

		this.display.moveForegroundToFront();

		this.tooltip.hide();
	    } );

	this.textLayer.addEventListener(
	    "showtooltip", event => {

		this.display.moveBackgroundToFront();

		var subjects =
		    this.tripleStore.querySubject(
			t => t == event.detail.text );

		var relations =
		    this.tripleStore.queryRelation(
			t => t == event.detail.text );

		var objects =
		    this.tripleStore.queryObject(
			t => t == event.detail.text );

		var result = subjects
		    .union( relations )
		    .union( objects )
		    .flatten();

		this.tooltip.addItems( result );

		this.tooltip.show( {
		    "clientX": event.detail.clientX,
		    "clientY": event.detail.clientY
		} );
	    } );

	this.textLayer.addEventListener(
	    "lexemeSelected", event => {

		this.lexemeSelected( event.detail.target );
	});
    }

    addLexeme( lex ){

	this.textLayer.appendChild( lex.element );

	if( !( lex.text in this.lexTable  ) ){

	    this.lexTable[ lex.text ] = [];
	}

	this.lexTable[ lex.text ].push( lex );

	var lineCharsRemaining =
	    ( this.maxLineChars - this.nextColumn );

	if( lex.length > lineCharsRemaining ){

	    this.nextColumn = 0;
	    this.nextLine += 1;
	}

	lex.columnStart = this.nextColumn;
	lex.lineNumber = this.nextLine;

	lex.offsetY = this.boundingRect.top;

	this.nextColumn += lex.length;

    }
}
function downloadTriples( data, filename ){

    var type = "application/ld+json";

    var file = new Blob( [ data ], { "type": type } );

    var a = document.createElement( "a" );
    var url = URL.createObjectURL( file );

    a.href = url;
    a.download = filename;
    document.body.appendChild( a );

    a.click();

    setTimeout(function() {

	document.body.removeChild( a );
	window.URL.revokeObjectURL( url );

    }, 0);
}


var fileSelector =
    document.getElementById( "inputFile" );

var tripleView = document.getElementById( "tripleStore" );

var store = new TripleStore();

var downloadButton = document.getElementById(
    "tripleStoreDownloadButton" );

downloadButton.addEventListener( "click", event => {

    if( fileSelector.files[0] ){

	var outputFileName = fileSelector.files[0].name;
	downloadTriples( store.toJson(), outputFileName );
    }

});

fileSelector.addEventListener(
    "change", function( event ){

	var selectedFile = fileSelector.files[0];

	var canvas = new TextCanvas( document );

	canvas.textLayer.id = "fileContents";
	canvas.tooltipLayer.id = "tooltipLayer";

	document.body.appendChild( canvas.textLayer );
	document.body.appendChild( canvas.tooltipLayer );

	canvas.boundingRect =
	    canvas.textLayer.getBoundingClientRect();

	var fileReader = new FileReader();

	fileReader.onload = function( event ){

	    var contents = event.target.result;

	    var lexemes = Lexer.lex( contents );

	    for( var ix = 0; ix < lexemes.length; ++ix ){

		canvas.addLexeme( lexemes[ix] );
	    }

	    var onEscape = function( contents ){

		return contents.slice(-1)[0].isEscape;
	    };

	    var raiseClear = function( contents ){

		var event = new CustomEvent(
		    "clearHighlights" );

		canvas.textLayer.dispatchEvent( event );
	    };

	    var onEnter = function( contents ){

		return contents.slice(-1)[0].isEnter;
	    };

	    var showTriple = function( contents ){

		var triple = {
		    "subject": canvas.subject,
		    "relation": canvas.relation,
		    "object": canvas.object
		};

		store.addTriple( triple );

		var subtext = new TreeView( store.triples );

		var newItem = document.createElement( "div" );

		newItem.appendChild( subtext.element );

		if( tripleView.firstChild ){

		    tripleView.firstChild.remove();
		}

		tripleView.appendChild( newItem );

		canvas.saveTriple();
	    };

	    var buffer = new TextBuffer( document, "div" );

	    buffer.subscribe( onEscape, raiseClear, true );
	    buffer.subscribe( onEnter, showTriple, true );

	    var keyboard = new KeyboardInput( buffer.element );
	    keyboard.bindInput( document.body );

	};

	fileReader.readAsText( selectedFile );

    });

}());
