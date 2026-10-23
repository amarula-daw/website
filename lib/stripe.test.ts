import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { it } from "node:test"

import { verifyWebhook } from "./stripe"

const secret = "whsec_test"
const body = JSON.stringify({ type: "checkout.session.completed" })
const now = 1_800_000_000_000
const sign = (payload: string, time: number, key = secret) =>
  `t=${time},v1=${createHmac("sha256", key).update(`${time}.${payload}`).digest("hex")}`

it("accepts a webhook signed with the endpoint's secret", () => {
  const header = sign(body, now / 1000)
  assert.deepEqual(verifyWebhook(body, header, secret, now), {
    type: "checkout.session.completed",
  })
})

it("refuses forged, altered, stale or unsigned webhooks", () => {
  const time = now / 1000
  assert.equal(
    verifyWebhook(body, sign(body, time, "whsec_other"), secret, now),
    null
  )
  assert.equal(verifyWebhook(`${body} `, sign(body, time), secret, now), null)
  assert.equal(verifyWebhook(body, sign(body, time - 301), secret, now), null)
  assert.equal(verifyWebhook(body, null, secret, now), null)
  assert.equal(verifyWebhook(body, `t=${time}`, secret, now), null)
  assert.equal(verifyWebhook(body, sign(body, time), undefined, now), null)
})
