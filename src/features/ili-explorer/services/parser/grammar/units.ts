import type { IliCstParserBuilder } from '../cstParser';
import {
  Unit, Identifier, Semicolon, Equals, Extends,
  LParen, RParen, LBracket, RBracket, Abstract, Function,
  Topic, Class, Structure, Association, Enumeration, Domain,
  Imports, End, View, Graphic, Refsystem, Parameter,
} from '../tokens';

export function registerUnitsRules(p: IliCstParserBuilder): void {
  p.unitSection = p.RULE('unitSection', () => {
    p.CONSUME(Unit);
    p.MANY({
      GATE: () => {
        const t = p.LA(1).tokenType;
        return t === Identifier;
      },
      DEF: () => p.SUBRULE(p.unitDef),
    });
  });

  p.unitDef = p.RULE('unitDef', () => {
    p.CONSUME(Identifier, { LABEL: 'unitName' });
    p.OPTION(() => p.OR([
      {
        ALT: () => {
          p.CONSUME(LParen);
          p.CONSUME(Abstract);
          p.CONSUME(RParen);
        },
      },
      {
        ALT: () => {
          p.CONSUME(LBracket);
          p.CONSUME2(Identifier, { LABEL: 'shortName' });
          p.CONSUME(RBracket);
        },
      },
    ]));
    p.OPTION2(() => {
      p.CONSUME(Extends);
      p.SUBRULE(p.qualifiedName, { LABEL: 'extendsRef' });
    });
    p.OPTION3(() => {
      p.CONSUME(Equals);
      p.MANY({
        GATE: () => p.LA(1).tokenType !== Semicolon,
        DEF: () => p.OR2([
          {
            ALT: () => {
              p.CONSUME2(LParen);
              p.SUBRULE(p.parenContents);
              p.CONSUME2(RParen);
            },
          },
          { ALT: () => p.CONSUME(Function) },
          { ALT: () => p.SUBRULE(p.skipBodyToken) },
        ]),
      });
    });
    p.CONSUME(Semicolon);
  });

  p.skipStatement = p.RULE('skipStatement', () => {
    p.AT_LEAST_ONE({
      GATE: () => {
        const t = p.LA(1).tokenType;
        return t !== Semicolon
          && t !== Topic && t !== Class && t !== Structure
          && t !== Association && t !== Enumeration && t !== Domain
          && t !== Imports && t !== Unit && t !== End
          && t !== Function && t !== View && t !== Graphic
          && t !== Refsystem && t !== Parameter;
      },
      DEF: () => p.OR([
        {
          ALT: () => {
            p.CONSUME(LParen);
            p.SUBRULE(p.parenContents);
            p.CONSUME(RParen);
          },
        },
        { ALT: () => p.CONSUME2(Function) },
        { ALT: () => p.SUBRULE(p.skipBodyToken) },
      ]),
    });
    p.CONSUME(Semicolon);
  });
}
