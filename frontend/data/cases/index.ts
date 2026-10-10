import type { CaseDefinition } from "@/types/case";
import { caso01 } from "./caso-01-astrolabio";
import { caso02 } from "./caso-02-selos";
import { caso03 } from "./caso-03-colibri";
import { caso04 } from "./caso-04-viuva-azul";
import { caso05 } from "./caso-05-tres-versoes";

/** Para adicionar um caso: crie o arquivo nesta pasta e inclua-o nesta lista. */
export const ALL_CASES: CaseDefinition[] = [caso01, caso02, caso03, caso04, caso05];
