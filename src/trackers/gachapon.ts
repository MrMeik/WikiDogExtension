import { asRecord, extractFilename } from "../core/helpers";
import {
  BaseTrackerRecord,
  TrackedCall,
  TrackerApi,
  TrackerDefinition,
  TrackerHandler,
} from "../core/types";

const NAME = "gachapon";
const SCHEMA_VERSION = 1;

type GachaponResult = {
  message?: string;
};

type GachaponInput = {
  tokenItemId?: string;
};

type GachaponRecord = BaseTrackerRecord<"gachapon"> & {
  token_id: string;
  item_id: string;
  extra_token_id: string | null;
};

function buildTracker(api: TrackerApi): TrackerHandler<GachaponRecord> {
  // takes gachapon message which has encoded image tag like <img src=\"img/clothes_green_cowl.png\"/>
  // pulls out the file path => img/clothes_green_cowl.png
  // works even when gacha returns a token as well because it targets the first image
  function extractFilePathFromMessage(message: string, api: TrackerApi) {
    const startMarker = 'src="';
    const startIndex = message.indexOf(startMarker);

    if (startIndex === -1) {
      api.log(
        NAME,
        "gachapon message did not contain an <img/> with a source",
        message,
      );
      return null;
    }

    const pathStart = startIndex + startMarker.length;
    const pathEnd = message.indexOf('"', pathStart);

    if (pathEnd === -1) {
      api.log(
        NAME,
        "could not find encosing quote on <img/> tag source",
        message,
      );
      return null;
    }

    return message.slice(pathStart, pathEnd);
  }

  function extractRefundedToken(
    result: GachaponResult,
    api: TrackerApi,
  ): string | null {
    const message = result?.message ?? "";

    const startMarker = "item_token";
    const startIndex = message.indexOf(startMarker);

    if (startIndex === -1) {
      // no extra token awarded
      return null;
    }

    const pathStart = startIndex + 5; // ignore the item_ part since token ids are technically "token_tools"
    const pathEnd = message.indexOf(".png", pathStart);

    if (pathEnd === -1) {
      api.log(
        NAME,
        "could not complete search for item token file name",
        message,
      );
      return null;
    }

    return message.slice(pathStart, pathEnd);
  }

  function extractDroppedItem(result: GachaponResult, api: TrackerApi) {
    const message = result?.message ?? null;

    if (message === null) {
      api.log(NAME, "No message found in gachapon.open", result);
      return null;
    }

    const filePath = extractFilePathFromMessage(message, api);
    if (filePath === null) {
      api.log(NAME, "No item filepath found in message", message);
      return null;
    }

    return extractFilename(filePath);
  }

  function buildRecord(
    result: GachaponResult,
    tokenId: string,
    itemId: string,
  ): GachaponRecord {
    const extraTokenId = extractRefundedToken(result, api);

    return {
      schema_version: SCHEMA_VERSION,
      kind: "gachapon",
      token_id: tokenId,
      item_id: itemId,
      extra_token_id: extraTokenId ?? null,
    };
  }

  function interpretOpen(call: TrackedCall): GachaponRecord[] {
    const result = asRecord(call.result) as GachaponResult | null;
    if (!call.ok || !result) return [];

    const input = asRecord(call.input) as GachaponInput | null;

    const tokenId = input?.tokenItemId ?? null;
    const itemId = extractDroppedItem(result, api);

    if (tokenId !== null && itemId !== null) {
      return [buildRecord(result, tokenId, itemId)];
    }

    return [];
  }

  return (call) => {
    return interpretOpen(call);
  };
}

export const tracker: TrackerDefinition<GachaponRecord> = {
  procedures: ["gachapon.open"],
  setup: buildTracker,
};
