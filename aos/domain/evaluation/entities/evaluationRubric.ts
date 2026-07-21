/** Frozen rubric reference stub — full rubric asset lives in catalog (E3+). */
export interface EvaluationRubricRef {
  rubricVersionId: string;
  name: string;
}

export const DEFAULT_DELIVERY_RUBRIC: EvaluationRubricRef = {
  rubricVersionId: "rubric-delivery-quality-v1",
  name: "Delivery Quality Rubric",
};
