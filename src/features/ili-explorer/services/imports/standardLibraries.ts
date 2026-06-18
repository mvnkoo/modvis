import unitsContent from './stdlib/Units.ili?raw';
import timeContent from './stdlib/Time.ili?raw';
import coordSysContent from './stdlib/CoordSys.ili?raw';

export const STD_LIB_NAMES = ['INTERLIS', 'Units', 'Time', 'CoordSys'] as const;
export type StdLibName = (typeof STD_LIB_NAMES)[number];

export const STD_LIB_CONTENT: Record<StdLibName, string> = {
  // INTERLIS ist die in der Sprache vordefinierte Basisbibliothek
  // (rad, m, kg, s, A, K, MOLE, CANDELA, MONEY, ANYSTRUCTURE, …).
  // Sie wird vom Compiler implizit bereitgestellt und braucht keine .ili-Datei.
  // Wir behandeln IMPORTS INTERLIS daher als "stdlib resolved" ohne Content.
  INTERLIS: '',
  Units: unitsContent,
  Time: timeContent,
  CoordSys: coordSysContent,
};

export function isStdLib(name: string): name is StdLibName {
  return (STD_LIB_NAMES as readonly string[]).includes(name);
}

export function getStdLibContent(name: string): string | undefined {
  if (!isStdLib(name)) return undefined;
  return STD_LIB_CONTENT[name];
}

export const STDLIB_VERSION = '2020-02-19';
