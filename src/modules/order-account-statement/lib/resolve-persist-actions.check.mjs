// Çalıştır: node src/modules/order-account-statement/lib/resolve-persist-actions.check.mjs
import assert from "node:assert/strict";
import { resolveOasPersistActions } from "./resolve-persist-actions.ts";

// Bilgi amaçlı mod: her kombinasyonda hiçbir kalıcı işlem yok.
for (const saveAsInvoice of [true, false]) {
  for (const saveToSystem of [true, false]) {
    assert.deepEqual(
      resolveOasPersistActions({ informationalOnly: true, saveAsInvoice, saveToSystem }),
      { createInvoice: false, saveToSystem: false }
    );
    // Normal mod: checkbox değerleri aynen geçer (mevcut fatura akışı değişmedi).
    assert.deepEqual(
      resolveOasPersistActions({ informationalOnly: false, saveAsInvoice, saveToSystem }),
      { createInvoice: saveAsInvoice, saveToSystem }
    );
  }
}
console.log("resolve-persist-actions: ok");
