import { getStore } from "../db/index.js";
import type {
  CategoryRow,
  ProviderRow,
  UserRuleRow,
} from "../db/types.js";
import type { ClassificationContext } from "./classification.js";

export async function loadClassificationContext(
  userId: string,
): Promise<ClassificationContext> {
  const store = await getStore();
  const [providers, categories, rules] = await Promise.all([
    store.listProviders(userId),
    store.listCategories(userId),
    store.listRules(userId),
  ]);
  return { providers, categories, rules };
}

export function buildTrackedPayees(rules: UserRuleRow[]): string[] {
  return [
    ...new Set(
      rules
        .map((rule) => rule.setPayeeName)
        .filter((name): name is string => Boolean(name)),
    ),
  ];
}

export type AnalyticsContext = {
  providers: ProviderRow[];
  categories: CategoryRow[];
  rules: UserRuleRow[];
};
