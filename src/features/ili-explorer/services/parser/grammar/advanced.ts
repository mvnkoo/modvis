import type { IliCstParserBuilder } from '../cstParser';
import {
  Function, View, Graphic, Refsystem, Sign, Parameter,
  Projection, Join, Union, Aggregation, Inspection, Equal, By,
  End, Semicolon, Colon, LParen, RParen,
  Identifier, NumberLiteral, StringLiteral, HashIdentifier,
  Interlis, Mandatory, Constraint, Unique, Existence, Set,
  Tid, Oid, Type, All, Reference, Bag, List,
  Not, And, Or, True, False, Null,
  NotEqual, EqualEqual, ColonEquals, At2, Tilde,
  With, Without, Of, To, From, As, Required, In,
  Comma, Dot, DotDot, Minus, Plus, Star, Slash,
  LBracket, RBracket, LBrace, RBrace,
  ArrowLeft, ArrowRight, ArrowBoth, DashDash,
  CompositionArrow, AggregationArrow,
  Less, Greater, LessEqual, GreaterEqual,
  Equals,
  Text, MText, Numeric, Boolean, Date, DateTime,
  Coord, MultiCoord, Polyline, MultiPolyline,
  Surface, MultiSurface, Area, MultiArea,
  AnyClass, AnyStructure, Translation, Attribute, At,
  Extends, Extended, Abstract, Final,
  Imports, Unqualified, Version, Where, Depends, On, No, Format,
  Constraints, Basket, Restriction, Inherit, Base,
} from '../tokens';

export function registerAdvancedRules(p: IliCstParserBuilder): void {
  p.skipBodyToken = p.RULE('skipBodyToken', () => {
    p.OR([
      { ALT: () => p.CONSUME(NumberLiteral) },
      { ALT: () => p.CONSUME(Identifier) },
      { ALT: () => p.CONSUME(HashIdentifier) },
      { ALT: () => p.CONSUME(StringLiteral) },
      { ALT: () => p.CONSUME(Interlis) },
      { ALT: () => p.CONSUME(Not) },
      { ALT: () => p.CONSUME(And) },
      { ALT: () => p.CONSUME(Or) },
      { ALT: () => p.CONSUME(True) },
      { ALT: () => p.CONSUME(False) },
      { ALT: () => p.CONSUME(Null) },
      { ALT: () => p.CONSUME(NotEqual) },
      { ALT: () => p.CONSUME(EqualEqual) },
      { ALT: () => p.CONSUME(ColonEquals) },
      { ALT: () => p.CONSUME(At2) },
      { ALT: () => p.CONSUME(Tilde) },
      { ALT: () => p.CONSUME(Constraint) },
      { ALT: () => p.CONSUME(Unique) },
      { ALT: () => p.CONSUME(Existence) },
      { ALT: () => p.CONSUME(Set) },
      { ALT: () => p.CONSUME(Tid) },
      { ALT: () => p.CONSUME(Oid) },
      { ALT: () => p.CONSUME(Type) },
      { ALT: () => p.CONSUME(All) },
      { ALT: () => p.CONSUME(Reference) },
      { ALT: () => p.CONSUME(Bag) },
      { ALT: () => p.CONSUME(List) },
      { ALT: () => p.CONSUME(Comma) },
      { ALT: () => p.CONSUME(Dot) },
      { ALT: () => p.CONSUME(DotDot) },
      { ALT: () => p.CONSUME(Minus) },
      { ALT: () => p.CONSUME(Plus) },
      { ALT: () => p.CONSUME(Star) },
      { ALT: () => p.CONSUME(Slash) },
      { ALT: () => p.CONSUME(LBracket) },
      { ALT: () => p.CONSUME(RBracket) },
      { ALT: () => p.CONSUME(LBrace) },
      { ALT: () => p.CONSUME(RBrace) },
      { ALT: () => p.CONSUME(ArrowLeft) },
      { ALT: () => p.CONSUME(ArrowRight) },
      { ALT: () => p.CONSUME(ArrowBoth) },
      { ALT: () => p.CONSUME(DashDash) },
      { ALT: () => p.CONSUME(CompositionArrow) },
      { ALT: () => p.CONSUME(AggregationArrow) },
      { ALT: () => p.CONSUME(Less) },
      { ALT: () => p.CONSUME(Greater) },
      { ALT: () => p.CONSUME(LessEqual) },
      { ALT: () => p.CONSUME(GreaterEqual) },
      { ALT: () => p.CONSUME(With) },
      { ALT: () => p.CONSUME(Without) },
      { ALT: () => p.CONSUME(Of) },
      { ALT: () => p.CONSUME(To) },
      { ALT: () => p.CONSUME(From) },
      { ALT: () => p.CONSUME(As) },
      { ALT: () => p.CONSUME(Mandatory) },
      { ALT: () => p.CONSUME(Equals) },
      { ALT: () => p.CONSUME(Colon) },
      { ALT: () => p.CONSUME(Required) },
      { ALT: () => p.CONSUME(In) },
      { ALT: () => p.CONSUME(Text) },
      { ALT: () => p.CONSUME(MText) },
      { ALT: () => p.CONSUME(Numeric) },
      { ALT: () => p.CONSUME(Boolean) },
      { ALT: () => p.CONSUME(Date) },
      { ALT: () => p.CONSUME(DateTime) },
      { ALT: () => p.CONSUME(Coord) },
      { ALT: () => p.CONSUME(MultiCoord) },
      { ALT: () => p.CONSUME(Polyline) },
      { ALT: () => p.CONSUME(MultiPolyline) },
      { ALT: () => p.CONSUME(Surface) },
      { ALT: () => p.CONSUME(MultiSurface) },
      { ALT: () => p.CONSUME(Area) },
      { ALT: () => p.CONSUME(MultiArea) },
      { ALT: () => p.CONSUME(AnyClass) },
      { ALT: () => p.CONSUME(AnyStructure) },
      { ALT: () => p.CONSUME(Translation) },
      { ALT: () => p.CONSUME(Attribute) },
      { ALT: () => p.CONSUME(At) },
      { ALT: () => p.CONSUME(Extends) },
      { ALT: () => p.CONSUME(Extended) },
      { ALT: () => p.CONSUME(Abstract) },
      { ALT: () => p.CONSUME(Final) },
      { ALT: () => p.CONSUME(Imports) },
      { ALT: () => p.CONSUME(Unqualified) },
      { ALT: () => p.CONSUME(Version) },
      { ALT: () => p.CONSUME(Where) },
      { ALT: () => p.CONSUME(Depends) },
      { ALT: () => p.CONSUME(On) },
      { ALT: () => p.CONSUME(No) },
      { ALT: () => p.CONSUME(Format) },
      { ALT: () => p.CONSUME(Constraints) },
      { ALT: () => p.CONSUME(Basket) },
      { ALT: () => p.CONSUME(Restriction) },
      { ALT: () => p.CONSUME(Inherit) },
      { ALT: () => p.CONSUME(Base) },
    ]);
  });

  // Paren-balanced skip — for consuming arbitrary contents inside ( ... ).
  // Accepts Semicolon (FUNCTION argument lists, COORD specs) since the outer
  // skip rule's terminator-Semicolon is at depth 0.
  p.parenContents = p.RULE('parenContents', () => {
    p.MANY({
      GATE: () => p.LA(1).tokenType !== RParen,
      DEF: () => p.OR([
        {
          ALT: () => {
            p.CONSUME(LParen);
            p.SUBRULE(p.parenContents);
            p.CONSUME(RParen);
          },
        },
        { ALT: () => p.CONSUME(Semicolon) },
        { ALT: () => p.SUBRULE(p.skipBodyToken) },
      ]),
    });
  });

  // FUNCTION Name ( arg-list ) : ReturnType [ Explanation ] ;
  p.functionDef = p.RULE('functionDef', () => {
    p.CONSUME(Function);
    p.CONSUME(Identifier, { LABEL: 'fnName' });
    p.CONSUME(LParen);
    p.OPTION(() => {
      p.SUBRULE(p.functionArg);
      p.MANY(() => {
        p.CONSUME(Semicolon);
        p.SUBRULE2(p.functionArg);
      });
    });
    p.CONSUME(RParen);
    p.CONSUME(Colon);
    p.MANY2({
      GATE: () => p.LA(1).tokenType !== Semicolon,
      DEF: () => p.OR2([
        {
          ALT: () => {
            p.CONSUME2(LParen);
            p.SUBRULE2(p.parenContents);
            p.CONSUME2(RParen);
          },
        },
        { ALT: () => p.SUBRULE3(p.skipBodyToken) },
      ]),
    });
    p.CONSUME2(Semicolon);
  });

  p.functionArg = p.RULE('functionArg', () => {
    p.CONSUME(Identifier, { LABEL: 'argName' });
    p.CONSUME(Colon);
    p.MANY({
      GATE: () => {
        const t = p.LA(1);
        return t.tokenType !== Semicolon && t.tokenType !== RParen;
      },
      DEF: () => p.OR([
        {
          ALT: () => {
            p.CONSUME(LParen);
            p.SUBRULE(p.parenContents);
            p.CONSUME(RParen);
          },
        },
        { ALT: () => p.SUBRULE2(p.skipBodyToken) },
      ]),
    });
  });

  // VIEW Name [Properties] [FormationDef ; | EXTENDS ViewRef]
  // BaseExtensionDef* (skipped) Selection* (skipped) '=' ViewAttrs/Constraints (skipped)
  // END Name ;
  p.viewDef = p.RULE('viewDef', () => {
    p.CONSUME(View);
    p.CONSUME(Identifier, { LABEL: 'viewName' });
    p.OPTION(() => p.SUBRULE(p.attributeProperties));
    p.OPTION2(() => p.OR([
      {
        ALT: () => {
          p.SUBRULE(p.formationDef);
          p.CONSUME(Semicolon);
        },
      },
      {
        ALT: () => {
          p.CONSUME(Extends);
          p.SUBRULE(p.qualifiedName, { LABEL: 'viewExtendsRef' });
        },
      },
    ]));
    // Body-Salat bis END Name ;
    p.MANY({
      GATE: () => {
        const t1 = p.LA(1);
        const t2 = p.LA(2);
        const t3 = p.LA(3);
        return !(t1.tokenType === End
          && t2.tokenType === Identifier
          && t3.tokenType === Semicolon);
      },
      DEF: () => p.OR2([
        {
          ALT: () => {
            p.CONSUME(LParen);
            p.SUBRULE(p.parenContents);
            p.CONSUME(RParen);
          },
        },
        { ALT: () => p.SUBRULE(p.skipBodyToken) },
        { ALT: () => p.CONSUME2(Semicolon) },
      ]),
    });
    p.CONSUME(End);
    p.CONSUME2(Identifier, { LABEL: 'viewEndName' });
    p.CONSUME3(Semicolon);
  });

  p.formationDef = p.RULE('formationDef', () => {
    p.OR([
      {
        ALT: () => {
          p.CONSUME(Projection);
          p.CONSUME(Of);
          p.SUBRULE(p.renamedViewableRef);
        },
      },
      {
        ALT: () => {
          p.CONSUME(Join);
          p.CONSUME2(Of);
          p.SUBRULE2(p.renamedViewableRef);
          p.MANY(() => {
            p.CONSUME(Comma);
            p.SUBRULE3(p.renamedViewableRef);
            p.OPTION(() => {
              p.CONSUME(LParen);
              p.SUBRULE(p.parenContents);
              p.CONSUME(RParen);
            });
          });
        },
      },
      {
        ALT: () => {
          p.CONSUME(Union);
          p.CONSUME3(Of);
          p.SUBRULE4(p.renamedViewableRef);
          p.MANY2(() => {
            p.CONSUME2(Comma);
            p.SUBRULE5(p.renamedViewableRef);
          });
        },
      },
      {
        ALT: () => {
          p.CONSUME(Aggregation);
          p.CONSUME4(Of);
          p.SUBRULE6(p.renamedViewableRef);
          p.OR2([
            { ALT: () => p.CONSUME(All) },
            {
              ALT: () => {
                p.CONSUME(Equal);
                p.CONSUME2(LParen);
                p.SUBRULE2(p.parenContents);
                p.CONSUME2(RParen);
              },
            },
          ]);
        },
      },
      {
        ALT: () => {
          p.OPTION2(() => p.CONSUME(Area));
          p.CONSUME(Inspection);
          p.CONSUME5(Of);
          p.SUBRULE7(p.renamedViewableRef);
          // -> attr -> attr ... bis ; (Salat)
          p.MANY3({
            GATE: () => p.LA(1).tokenType !== Semicolon,
            DEF: () => p.SUBRULE2(p.skipBodyToken),
          });
        },
      },
    ]);
  });

  p.renamedViewableRef = p.RULE('renamedViewableRef', () => {
    p.OPTION({
      GATE: () => {
        const t1 = p.LA(1);
        const t2 = p.LA(2);
        return t1?.tokenType === Identifier && t2?.tokenType === Tilde;
      },
      DEF: () => {
        p.CONSUME(Identifier, { LABEL: 'baseName' });
        p.CONSUME(Tilde);
      },
    });
    p.SUBRULE(p.qualifiedName);
  });

  // GRAPHIC Name ... = ... END Name ;
  p.graphicSkipDef = p.RULE('graphicSkipDef', () => {
    p.CONSUME(Graphic);
    p.MANY({
      GATE: () => {
        const t1 = p.LA(1);
        const t2 = p.LA(2);
        const t3 = p.LA(3);
        return !(t1.tokenType === End
          && t2.tokenType === Identifier
          && t3.tokenType === Semicolon);
      },
      DEF: () => p.OR([
        {
          ALT: () => {
            p.CONSUME(LParen);
            p.SUBRULE(p.parenContents);
            p.CONSUME(RParen);
          },
        },
        { ALT: () => p.SUBRULE(p.skipBodyToken) },
        { ALT: () => p.CONSUME(Semicolon) },
      ]),
    });
    p.CONSUME(End);
    p.CONSUME(Identifier);
    p.CONSUME2(Semicolon);
  });

  // REFSYSTEM BASKET Name ... ;
  p.refsystemBasketSkipDef = p.RULE('refsystemBasketSkipDef', () => {
    p.CONSUME(Refsystem);
    p.MANY({
      GATE: () => p.LA(1).tokenType !== Semicolon,
      DEF: () => p.OR([
        {
          ALT: () => {
            p.CONSUME(LParen);
            p.SUBRULE(p.parenContents);
            p.CONSUME(RParen);
          },
        },
        { ALT: () => p.SUBRULE(p.skipBodyToken) },
      ]),
    });
    p.CONSUME(Semicolon);
  });

  // SIGN BASKET Name ... ;
  p.signBasketSkipDef = p.RULE('signBasketSkipDef', () => {
    p.CONSUME(Sign);
    p.MANY({
      GATE: () => p.LA(1).tokenType !== Semicolon,
      DEF: () => p.OR([
        {
          ALT: () => {
            p.CONSUME(LParen);
            p.SUBRULE(p.parenContents);
            p.CONSUME(RParen);
          },
        },
        { ALT: () => p.SUBRULE(p.skipBodyToken) },
      ]),
    });
    p.CONSUME(Semicolon);
  });

  // PARAMETER { Name : AttrTypeDef ; }
  p.parameterSkipDef = p.RULE('parameterSkipDef', () => {
    p.CONSUME(Parameter);
    p.MANY(() => {
      p.CONSUME(Identifier);
      p.CONSUME(Colon);
      p.MANY2({
        GATE: () => p.LA(1).tokenType !== Semicolon,
        DEF: () => p.OR([
          {
            ALT: () => {
              p.CONSUME(LParen);
              p.SUBRULE(p.parenContents);
              p.CONSUME(RParen);
            },
          },
          { ALT: () => p.SUBRULE(p.skipBodyToken) },
        ]),
      });
      p.CONSUME(Semicolon);
    });
  });
}
