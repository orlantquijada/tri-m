import z from "zod";

export const sampleEnumSchema = z.enum(["foo", "bar"]);
export type SampleEnum = z.infer<typeof sampleEnumSchema>;

export const sampleSchema = z.object({
  bar: z.number(),
  foo: z.string(),
});
export type Sample = z.infer<typeof sampleSchema>;
