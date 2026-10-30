// tracks which item a gachapon token produced
(() => {
  "use strict";
  const Tracker = globalThis.DogTracker;
  const Helpers = Tracker.helpers;

  const NAME = "gachapon";
  const SCHEMA_VERSION = 1;

  // takes gachapon message which has encoded image tag like <img src=\"img/clothes_green_cowl.png\"/>
  // pulls out the file path => img/clothes_green_cowl.png
  // works even when gacha returns a token as well because it targets the first image
  function extractFilePathFromMessage(message) {
    const startMarker = 'src="';
    const startIndex = message.indexOf(startMarker);

    if (startIndex === -1) {
      Tracker.log(
        NAME,
        "gachapon message did not contain an <img/> with a source",
        message,
      );
      return null;
    }

    const pathStart = startIndex + startMarker.length;
    const pathEnd = message.indexOf('"', pathStart);

    if (pathEnd === -1) {
      Tracker.log(
        NAME,
        "could not find encosing quote on <img/> tag source",
        message,
      );
      return null;
    }

    return message.slice(pathStart, pathEnd);
  }

  function getRefundedToken(call) {
    const message = call?.result?.message;

    const startMarker = "item_token";
    const startIndex = message.indexOf(startMarker);

    if (startIndex === -1) {
      // no extra token awarded
      return null;
    }

    const pathStart = startIndex + 5; // ignore the item_ part since token ids are technically "token_tools"
    const pathEnd = message.indexOf(".png", pathStart);

    if (pathEnd === -1) {
      Tracker.log(
        NAME,
        "could not complete search for item token file name",
        message,
      );
      return null;
    }

    return message.slice(pathStart, pathEnd);
  }

  function getDroppedItem(call) {
    const message = call?.result?.message;

    if (message === null) {
      Tracker.log(NAME, "No message found in gachapon.open", call);
      return null;
    }

    const filePath = extractFilePathFromMessage(message);
    if (filePath === null) {
      Tracker.log(NAME, "No item filepath found in message", message);
      return null;
    }

    return Helpers.extractFilename(filePath);
  }

  function buildRecord(call, tokenId, itemId) {
    const extraTokenId = getRefundedToken(call);

    return {
      schema_version: SCHEMA_VERSION,
      ext_version: Tracker.EXT_VERSION,
      build_id: call.buildId,
      happened_at_utc: call.ts,
      kind: "gachapon",
      token_id: tokenId,
      item_id: itemId,
      extra_token_id: extraTokenId ?? null,
    };
  }

  function interpretOpen(call) {
    if (!call.ok || !call.result || typeof call.result !== "object") return [];

    const results = [];
    const tokenId = call.input?.tokenItemId ?? null;
    const itemId = getDroppedItem(call);

    if (tokenId !== null && itemId !== null) {
      results.push(buildRecord(call, tokenId, itemId));
    }

    return results;
  }

  Tracker.register({
    procedures: ["gachapon.open"],
    handle(call) {
      const records = interpretOpen(call);
      for (const record of records) {
        Tracker.record(record);
      }
    },
  });
})();
