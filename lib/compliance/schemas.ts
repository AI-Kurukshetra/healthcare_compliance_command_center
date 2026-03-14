import { z } from "zod";

const answerValueSchema = z.enum(["yes", "partial", "no"]);

export const submitComplianceAssessmentSchema = z.object({
  templateSlug: z.string().min(1, "A template is required."),
  answers: z.record(z.string(), answerValueSchema)
});

export type SubmitComplianceAssessmentValues = z.infer<typeof submitComplianceAssessmentSchema>;
