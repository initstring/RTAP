import { createTRPCRouter } from "@/server/api/trpc";
import { threatActorsRouter } from "./threat-actors";
import { targetsRouter } from "./targets";
import { tagsRouter } from "./tags";
import { toolCategoriesRouter } from "./tool-categories";
import { toolsRouter } from "./tools";
import { logSourcesRouter } from "./log-sources";
import { mitreRouter } from "./mitre";

export const taxonomyRouter = createTRPCRouter({
  threatActors: threatActorsRouter,
  targets: targetsRouter,
  tags: tagsRouter,
  toolCategories: toolCategoriesRouter,
  tools: toolsRouter,
  logSources: logSourcesRouter,
  mitre: mitreRouter,
});

