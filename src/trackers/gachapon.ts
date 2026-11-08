import { extractFilename, getTextBetween } from "../core/helpers";
import * as v from "valibot";
import {
  BaseTrackerRecord,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";

const SCHEMA_VERSION = 1;

const GachaponResultSchema = v.object({
  message: v.string(),
});

const GachaponInputSchema = v.object({
  tokenItemId: v.string(),
});

type GachaponResult = v.InferOutput<typeof GachaponResultSchema>;
type GachaponInput = v.InferOutput<typeof GachaponInputSchema>;

function isGachaponResult(data: unknown): data is GachaponResult {
  return v.safeParse(GachaponResultSchema, data).success;
}
function isGachaponInput(data: unknown): data is GachaponInput {
  return v.safeParse(GachaponInputSchema, data).success;
}

type GachaponRecord = BaseTrackerRecord<"gachapon"> & {
  token_id: string;
  item_id: string;
  extra_token_id: string | null;
};

function buildTracker(api: TrackerApi): TrackerHandler<GachaponRecord> {
  function extractRefundedToken(result: GachaponResult): string | null {
    const message = result.message;

    const tokenType = getTextBetween(message, "item_token", ".png");
    if (tokenType === null) {
      return null;
    }

    // Token will be in the form "_reading", prepend on the token part again
    return "token" + tokenType;
  }

  // takes gachapon message which has encoded image tag like <img src=\"img/clothes_green_cowl.png\"/>
  function extractDroppedItem(result: GachaponResult): string {
    const filePath = getTextBetween(result.message, 'src="', '"');
    if (filePath === null) {
      throw new Error(
        `Gachapon result did not contain and item in message: ${result.message}`,
      );
    }

    return extractFilename(filePath);
  }

  function buildRecord(
    usedTokenId: string,
    itemId: string,
    extraTokenId: string | null,
  ): GachaponRecord {
    return {
      schema_version: SCHEMA_VERSION,
      kind: "gachapon",
      token_id: usedTokenId,
      item_id: itemId,
      extra_token_id: extraTokenId,
    };
  }

  return (call) => {
    if (
      !call.ok ||
      !isGachaponInput(call.input) ||
      !isGachaponResult(call.result)
    ) {
      return [];
    }

    const result = call.result as GachaponResult;

    const usedTokenId = call.input.tokenItemId;
    const resultItemId = extractDroppedItem(result);
    const extraTokenId = extractRefundedToken(result);

    return [buildRecord(usedTokenId, resultItemId, extraTokenId)];
  };
}

export const tracker: TrackerDefinition<GachaponRecord> = {
  procedures: ["gachapon.open"],
  setup: buildTracker,
};
