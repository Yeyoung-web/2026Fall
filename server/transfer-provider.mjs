/** Adapter boundary for future official remittance providers. This mock never moves money. */
export class MockTransferProvider {
  name = 'mock'
  connected = false
  async reportSent({ idempotencyKey }) { return { reference: `manual:${idempotencyKey}`, state: 'reported' } }
}
