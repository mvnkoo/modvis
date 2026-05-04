import { createToken, Lexer, TokenType } from 'chevrotain';

export const Whitespace = createToken({
  name: 'Whitespace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
});

export const LineComment = createToken({
  name: 'LineComment',
  pattern: /!![^\n]*/,
  group: 'comments',
});

export const BlockComment = createToken({
  name: 'BlockComment',
  pattern: /\/\*[\s\S]*?\*\//,
  group: 'comments',
});

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-ZäöüÄÖÜß][a-zA-Z0-9äöüÄÖÜß_]*/,
});

export const HashIdentifier = createToken({
  name: 'HashIdentifier',
  pattern: /#[a-zA-ZäöüÄÖÜß][a-zA-Z0-9äöüÄÖÜß_.]*/,
});

function kw(name: string, literal?: string): TokenType {
  return createToken({
    name,
    pattern: new RegExp(literal ?? name),
    longer_alt: Identifier,
  });
}

export const Interlis = kw('Interlis', 'INTERLIS');
export const Version = kw('Version', 'VERSION');
export const Model = kw('Model', 'MODEL');
export const Topic = kw('Topic', 'TOPIC');
export const Class = kw('Class', 'CLASS');
export const Structure = kw('Structure', 'STRUCTURE');
export const Association = kw('Association', 'ASSOCIATION');
export const Enumeration = kw('Enumeration', 'ENUMERATION');
export const Domain = kw('Domain', 'DOMAIN');
export const Unit = kw('Unit', 'UNIT');
export const Function = kw('Function', 'FUNCTION');
export const View = kw('View', 'VIEW');
export const Graphic = kw('Graphic', 'GRAPHIC');
export const Refsystem = kw('Refsystem', 'REFSYSTEM');
export const Coordsystem = kw('Coordsystem', 'COORDSYSTEM');
export const Imports = kw('Imports', 'IMPORTS');
export const End = kw('End', 'END');
export const Extends = kw('Extends', 'EXTENDS');
export const Extended = kw('Extended', 'EXTENDED');
export const Abstract = kw('Abstract', 'ABSTRACT');
export const Final = kw('Final', 'FINAL');
export const Mandatory = kw('Mandatory', 'MANDATORY');
export const All = kw('All', 'ALL');
export const Of = kw('Of', 'OF');
export const Bag = kw('Bag', 'BAG');
export const List = kw('List', 'LIST');
export const Reference = kw('Reference', 'REFERENCE');
export const Base = kw('Base', 'BASE');
export const Constraint = kw('Constraint', 'CONSTRAINT');
export const Existence = kw('Existence', 'EXISTENCE');
export const Unique = kw('Unique', 'UNIQUE');
export const Set = kw('Set', 'SET');
export const Where = kw('Where', 'WHERE');
export const Required = kw('Required', 'REQUIRED');
export const Numeric = kw('Numeric', 'NUMERIC');
export const Text = kw('Text', 'TEXT');
export const MText = kw('MText', 'MTEXT');
export const Boolean = kw('Boolean', 'BOOLEAN');
export const Date = kw('Date', 'DATE');
export const DateTime = kw('DateTime', 'DATETIME');
export const Coord = kw('Coord', 'COORD');
export const MultiCoord = kw('MultiCoord', 'MULTICOORD');
export const Polyline = kw('Polyline', 'POLYLINE');
export const MultiPolyline = kw('MultiPolyline', 'MULTIPOLYLINE');
export const Surface = kw('Surface', 'SURFACE');
export const MultiSurface = kw('MultiSurface', 'MULTISURFACE');
export const Area = kw('Area', 'AREA');
export const MultiArea = kw('MultiArea', 'MULTIAREA');
export const AnyClass = kw('AnyClass', 'ANYCLASS');
export const AnyStructure = kw('AnyStructure', 'ANYSTRUCTURE');
export const Translation = kw('Translation', 'TRANSLATION');
export const At = kw('At', 'AT');
export const Or = kw('Or', 'OR');
export const And = kw('And', 'AND');
export const Not = kw('Not', 'NOT');
export const Null = kw('Null', 'NULL');
export const True = kw('True', 'TRUE');
export const False = kw('False', 'FALSE');
export const Inherit = kw('Inherit', 'INHERIT');
export const To = kw('To', 'TO');
export const From = kw('From', 'FROM');
export const Without = kw('Without', 'WITHOUT');
export const With = kw('With', 'WITH');
export const Oid = kw('Oid', 'OID');
export const Tid = kw('Tid', 'TID');
export const As = kw('As', 'AS');
export const Type = kw('Type', 'TYPE');
export const External = kw('External', 'EXTERNAL');
export const Restriction = kw('Restriction', 'RESTRICTION');
export const Attribute = kw('Attribute', 'ATTRIBUTE');
export const Unqualified = kw('Unqualified', 'UNQUALIFIED');
export const Basket = kw('Basket', 'BASKET');
export const Depends = kw('Depends', 'DEPENDS');
export const On = kw('On', 'ON');
export const No = kw('No', 'NO');
export const Format = kw('Format', 'FORMAT');
export const In = kw('In', 'IN');
export const Constraints = kw('Constraints', 'CONSTRAINTS');
export const Parameter = kw('Parameter', 'PARAMETER');
export const Symbology = kw('Symbology', 'SYMBOLOGY');
export const Sign = kw('Sign', 'SIGN');
export const Contracted = kw('Contracted', 'CONTRACTED');
export const Circular = kw('Circular', 'CIRCULAR');
export const Ordered = kw('Ordered', 'ORDERED');
export const Projection = kw('Projection', 'PROJECTION');
export const Join = kw('Join', 'JOIN');
export const Union = kw('Union', 'UNION');
export const Aggregation = kw('Aggregation', 'AGGREGATION');
export const Inspection = kw('Inspection', 'INSPECTION');
export const Equal = kw('Equal', 'EQUAL');
export const By = kw('By', 'BY');
export const Clockwise = kw('Clockwise', 'CLOCKWISE');
export const Counterclockwise = kw('Counterclockwise', 'COUNTERCLOCKWISE');
export const Refsys = kw('Refsys', 'REFSYS');
export const Continuous = kw('Continuous', 'CONTINUOUS');
export const Subdivision = kw('Subdivision', 'SUBDIVISION');
export const Transient = kw('Transient', 'TRANSIENT');
export const Generic = kw('Generic', 'GENERIC');

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(?:[^"\\]|\\.)*"/,
});

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/,
});

export const DotDot = createToken({ name: 'DotDot', pattern: /\.\./ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });
export const ColonEquals = createToken({ name: 'ColonEquals', pattern: /:=/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Equals = createToken({ name: 'Equals', pattern: /=/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/ });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const ArrowLeft = createToken({ name: 'ArrowLeft', pattern: /<--/ });
export const ArrowRight = createToken({ name: 'ArrowRight', pattern: /-->/ });
export const ArrowBoth = createToken({ name: 'ArrowBoth', pattern: /<->/ });
export const CompositionArrow = createToken({ name: 'CompositionArrow', pattern: /-<#>/ });
export const AggregationArrow = createToken({ name: 'AggregationArrow', pattern: /-<>/ });
export const DashDash = createToken({ name: 'DashDash', pattern: /--/ });
export const Star = createToken({ name: 'Star', pattern: /\*/ });
export const Plus = createToken({ name: 'Plus', pattern: /\+/ });
export const Minus = createToken({ name: 'Minus', pattern: /-/ });
export const Slash = createToken({ name: 'Slash', pattern: /\// });
export const LessEqual = createToken({ name: 'LessEqual', pattern: /<=/ });
export const GreaterEqual = createToken({ name: 'GreaterEqual', pattern: />=/ });
export const NotEqual = createToken({ name: 'NotEqual', pattern: /!=/ });
export const EqualEqual = createToken({ name: 'EqualEqual', pattern: /==/ });
export const Less = createToken({ name: 'Less', pattern: /</ });
export const Greater = createToken({ name: 'Greater', pattern: />/ });
export const At2 = createToken({ name: 'At2', pattern: /@/ });
export const Tilde = createToken({ name: 'Tilde', pattern: /~/ });

export const allTokens: TokenType[] = [
  Whitespace,
  LineComment,
  BlockComment,

  Interlis, Version, Model, Topic, Class, Structure, Association, Enumeration,
  Domain, Unit, Function, View, Graphic, Refsystem, Coordsystem, Imports,
  End, Extends, Extended, Abstract, Final, Mandatory, All, Of, Bag, List,
  Reference, Base, Constraints, Constraint, Existence, Unique, Set, Where, Required,
  Numeric, Text, MText, Boolean, DateTime, Date,
  Coord, MultiCoord, Polyline, MultiPolyline, Surface, MultiSurface, Area, MultiArea,
  AnyClass, AnyStructure, Translation, Attribute, At, Ordered, Or, And, Not, Null, True, False,
  Inherit, Inspection, To, From, Without, With, Oid, Tid, As, Type, External, Restriction,
  Unqualified, Basket, Depends, On, No, Format, In,
  Projection, Join, Union, Aggregation, Equal, By,
  Parameter, Symbology, Sign, Contracted,
  Counterclockwise, Clockwise, Circular, Refsys,
  Continuous, Subdivision, Transient, Generic,

  Identifier,
  HashIdentifier,

  StringLiteral,
  NumberLiteral,

  DotDot, Dot,
  ColonEquals, Colon, Semicolon, Comma,
  LParen, RParen, LBrace, RBrace, LBracket, RBracket,
  ArrowLeft, ArrowRight, ArrowBoth, CompositionArrow, AggregationArrow, DashDash,
  LessEqual, GreaterEqual, NotEqual, EqualEqual,
  Less, Greater, Equals,
  Star, Plus, Minus, Slash, At2, Tilde,
];

export const IliLexer = new Lexer(allTokens, {
  positionTracking: 'onlyOffset',
});
