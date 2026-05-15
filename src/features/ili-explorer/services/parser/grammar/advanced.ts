import type { IliCstParserBuilder } from '../cstParser';
import {
  Function, View, Graphic, Refsystem, Sign, Parameter,
  Projection, Join, Union, Aggregation, Inspection, Equal,
  End, Semicolon, Colon, Comma, LParen, RParen,
  Identifier, Tilde,
  All, Area, Of, Extends,
  SkipBody,
} from '../tokens';

export function registerAdvancedRules(p: IliCstParserBuilder): void {
  p.skipBodyToken = p.RULE('skipBodyToken', () => {
    p.CONSUME(SkipBody);
  });

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
