import type { IliCstParserBuilder } from '../parser';
import {
  Unit, Semicolon, LParen, RParen,
  Topic, Class, Structure, Association, Enumeration, Domain,
  Imports, End, Function, View, Graphic, Refsystem, Parameter,
} from '../tokens';

export function registerUnitsRules(p: IliCstParserBuilder): void {
  p.unitSection = p.RULE('unitSection', () => {
    p.CONSUME(Unit);
    // Stop bei den Tokens, die einen neuen Top-Level-Konstrukt einleiten:
    // andernfalls würde skipStatement gierig in TOPIC/CLASS/... reinfressen.
    p.MANY({
      GATE: () => {
        const t = p.LA(1).tokenType;
        return t !== Topic && t !== Class && t !== Structure
          && t !== Association && t !== Enumeration && t !== Domain
          && t !== Imports && t !== Unit && t !== End
          && t !== Function && t !== View && t !== Graphic
          && t !== Refsystem && t !== Parameter;
      },
      DEF: () => p.SUBRULE(p.skipStatement),
    });
  });

  // Unit-Eintrag: bis zum nächsten ';' alle Tokens schlucken (paren-balanced).
  // FUNCTION ist erlaubt (DerivedUnit-Form `= FUNCTION // ... // [unit]`).
  p.skipStatement = p.RULE('skipStatement', () => {
    p.AT_LEAST_ONE({
      GATE: () => p.LA(1).tokenType !== Semicolon,
      DEF: () => p.OR([
        {
          ALT: () => {
            p.CONSUME(LParen);
            p.SUBRULE(p.parenContents);
            p.CONSUME(RParen);
          },
        },
        { ALT: () => p.CONSUME(Function) },
        { ALT: () => p.SUBRULE(p.skipBodyToken) },
      ]),
    });
    p.CONSUME(Semicolon);
  });
}
