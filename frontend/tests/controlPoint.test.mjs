import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canUseControlPoint } from '../src/utils/controlPoint.ts';

test('only an assigned room explicitly authorized by the API can be opened', () => {
  const room = { room_id: '2', room_name: '691B', assistant_id: 25, can_interact: true };
  assert.equal(canUseControlPoint(room, 25), true);
  assert.equal(canUseControlPoint(room, 8), false);
  assert.equal(canUseControlPoint({ ...room, can_interact: false }, 25), false);
  assert.equal(canUseControlPoint({ ...room, assistant_id: null }, 25), false);
});
