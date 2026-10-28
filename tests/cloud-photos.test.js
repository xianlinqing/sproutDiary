const { test } = require('node:test');
const assert = require('node:assert/strict');
const { photoReferences, mapStatePhotos } = require('../src/domain/cloud-photos.ts');
test('同步照片去重并保持共享引用，本地数据不被替换', () => {
  const state = {
    version: 1,
    plants: [{ id: 'p', cover: '/local/a.jpg' }],
    entries: [{ id: 'e', photos: ['/local/a.jpg', 'plant:mint'] }],
    tasks: [],
  };
  assert.deepEqual(photoReferences(state), ['/local/a.jpg', 'plant:mint']);
  const cloud = mapStatePhotos(state, new Map([['/local/a.jpg', 'media:photo-id']]));
  assert.equal(cloud.plants[0].cover, 'media:photo-id');
  assert.equal(cloud.entries[0].photos[0], 'media:photo-id');
  assert.equal(state.plants[0].cover, '/local/a.jpg');
  cloud.entries[0].photos.push('extra');
  assert.equal(state.entries[0].photos.length, 2);
});
