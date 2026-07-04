// Gedeelde retourvorm van server actions (voor useActionState in de formulieren).
export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};
