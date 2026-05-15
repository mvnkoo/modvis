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

export const SkipBody = createToken({ name: 'SkipBody', pattern: Lexer.NA });

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-ZäöüÄÖÜß][a-zA-Z0-9äöüÄÖÜß_]*/,
  categories: SkipBody,
});

export const HashIdentifier = createToken({
  name: 'HashIdentifier',
  pattern: /#[a-zA-ZäöüÄÖÜß][a-zA-Z0-9äöüÄÖÜß_.]*/,
  categories: SkipBody,
});

function kw(name: string, literal?: string): TokenType {
  return createToken({
    name,
    pattern: new RegExp(literal ?? name),
    longer_alt: Identifier,
  });
}

function skw(name: string, literal?: string): TokenType {
  return createToken({
    name,
    pattern: new RegExp(literal ?? name),
    longer_alt: Identifier,
    categories: SkipBody,
  });
}

export const Interlis = skw('Interlis', 'INTERLIS');
export const Version = skw('Version', 'VERSION');
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
export const Imports = skw('Imports', 'IMPORTS');
export const End = kw('End', 'END');
export const Extends = skw('Extends', 'EXTENDS');
export const Extended = skw('Extended', 'EXTENDED');
export const Abstract = skw('Abstract', 'ABSTRACT');
export const Final = skw('Final', 'FINAL');
export const Mandatory = skw('Mandatory', 'MANDATORY');
export const All = skw('All', 'ALL');
export const Of = skw('Of', 'OF');
export const Bag = skw('Bag', 'BAG');
export const List = skw('List', 'LIST');
export const Reference = skw('Reference', 'REFERENCE');
export const Base = skw('Base', 'BASE');
export const Constraint = skw('Constraint', 'CONSTRAINT');
export const Existence = skw('Existence', 'EXISTENCE');
export const Unique = skw('Unique', 'UNIQUE');
export const Set = skw('Set', 'SET');
export const Where = skw('Where', 'WHERE');
export const Required = skw('Required', 'REQUIRED');
export const Numeric = skw('Numeric', 'NUMERIC');
export const Text = skw('Text', 'TEXT');
export const MText = skw('MText', 'MTEXT');
export const Boolean = skw('Boolean', 'BOOLEAN');
export const Date = skw('Date', 'DATE');
export const DateTime = skw('DateTime', 'DATETIME');
export const Coord = skw('Coord', 'COORD');
export const MultiCoord = skw('MultiCoord', 'MULTICOORD');
export const Polyline = skw('Polyline', 'POLYLINE');
export const MultiPolyline = skw('MultiPolyline', 'MULTIPOLYLINE');
export const Surface = skw('Surface', 'SURFACE');
export const MultiSurface = skw('MultiSurface', 'MULTISURFACE');
export const Area = skw('Area', 'AREA');
export const MultiArea = skw('MultiArea', 'MULTIAREA');
export const AnyClass = skw('AnyClass', 'ANYCLASS');
export const AnyStructure = skw('AnyStructure', 'ANYSTRUCTURE');
export const Translation = skw('Translation', 'TRANSLATION');
export const At = skw('At', 'AT');
export const Or = skw('Or', 'OR');
export const And = skw('And', 'AND');
export const Not = skw('Not', 'NOT');
export const Null = skw('Null', 'NULL');
export const True = skw('True', 'TRUE');
export const False = skw('False', 'FALSE');
export const Inherit = skw('Inherit', 'INHERIT');
export const To = skw('To', 'TO');
export const From = skw('From', 'FROM');
export const Without = skw('Without', 'WITHOUT');
export const With = skw('With', 'WITH');
export const Oid = skw('Oid', 'OID');
export const Tid = skw('Tid', 'TID');
export const As = skw('As', 'AS');
export const Type = skw('Type', 'TYPE');
export const External = kw('External', 'EXTERNAL');
export const Restriction = skw('Restriction', 'RESTRICTION');
export const Attribute = skw('Attribute', 'ATTRIBUTE');
export const Unqualified = skw('Unqualified', 'UNQUALIFIED');
export const Basket = skw('Basket', 'BASKET');
export const Depends = skw('Depends', 'DEPENDS');
export const On = skw('On', 'ON');
export const No = skw('No', 'NO');
export const Format = skw('Format', 'FORMAT');
export const Based = skw('Based', 'BASED');
export const In = skw('In', 'IN');
export const Constraints = skw('Constraints', 'CONSTRAINTS');
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
  categories: SkipBody,
});

export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/,
  categories: SkipBody,
});

export const DotDot = createToken({ name: 'DotDot', pattern: /\.\./, categories: SkipBody });
export const Dot = createToken({ name: 'Dot', pattern: /\./, categories: SkipBody });
export const ColonEquals = createToken({ name: 'ColonEquals', pattern: /:=/, categories: SkipBody });
export const Colon = createToken({ name: 'Colon', pattern: /:/, categories: SkipBody });
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/, categories: SkipBody });
export const Equals = createToken({ name: 'Equals', pattern: /=/, categories: SkipBody });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBrace = createToken({ name: 'LBrace', pattern: /\{/, categories: SkipBody });
export const RBrace = createToken({ name: 'RBrace', pattern: /\}/, categories: SkipBody });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/, categories: SkipBody });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/, categories: SkipBody });
export const ArrowLeft = createToken({ name: 'ArrowLeft', pattern: /<--/, categories: SkipBody });
export const ArrowRight = createToken({ name: 'ArrowRight', pattern: /-->/, categories: SkipBody });
export const ArrowBoth = createToken({ name: 'ArrowBoth', pattern: /<->/, categories: SkipBody });
export const CompositionArrow = createToken({ name: 'CompositionArrow', pattern: /-<#>/, categories: SkipBody });
export const AggregationArrow = createToken({ name: 'AggregationArrow', pattern: /-<>/, categories: SkipBody });
export const DashDash = createToken({ name: 'DashDash', pattern: /--/, categories: SkipBody });
export const Star = createToken({ name: 'Star', pattern: /\*/, categories: SkipBody });
export const Plus = createToken({ name: 'Plus', pattern: /\+/, categories: SkipBody });
export const Minus = createToken({ name: 'Minus', pattern: /-/, categories: SkipBody });
export const Slash = createToken({ name: 'Slash', pattern: /\//, categories: SkipBody });
export const LessEqual = createToken({ name: 'LessEqual', pattern: /<=/, categories: SkipBody });
export const GreaterEqual = createToken({ name: 'GreaterEqual', pattern: />=/, categories: SkipBody });
export const NotEqual = createToken({ name: 'NotEqual', pattern: /!=/, categories: SkipBody });
export const EqualEqual = createToken({ name: 'EqualEqual', pattern: /==/, categories: SkipBody });
export const Less = createToken({ name: 'Less', pattern: /</, categories: SkipBody });
export const Greater = createToken({ name: 'Greater', pattern: />/, categories: SkipBody });
export const At2 = createToken({ name: 'At2', pattern: /@/, categories: SkipBody });
export const Tilde = createToken({ name: 'Tilde', pattern: /~/, categories: SkipBody });

export const allTokens: TokenType[] = [
  Whitespace,
  LineComment,
  BlockComment,
  SkipBody,

  Interlis, Version, Model, Topic, Class, Structure, Association, Enumeration,
  Domain, Unit, Function, View, Graphic, Refsystem, Coordsystem, Imports,
  End, Extends, Extended, Abstract, Final, Mandatory, All, Of, Bag, List,
  Reference, Based, Base, Constraints, Constraint, Existence, Unique, Set, Where, Required,
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
