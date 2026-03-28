import { z } from "zod";

const DECIMAL = z
    .union([
        z.number(),
        z.string().regex(/^-?\d+(\.\d+)?$/)
    ])
    .transform(Number);
export default DECIMAL;