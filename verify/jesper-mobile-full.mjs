import assert from 'node:assert/strict';
import { projects, featured } from '../src/jesper/data/projects.js';

assert.deepEqual(projects.map((item) => item.title), [
  'The Lookback', 'DoThings', '53 West 53', 'Ross Mason®', 'Vucko™', 'Ingrao',
  '111 West 57th Street', 'Better Off®', 'Techspeed', 'Nathan Riley', 'Dogelon Mars',
  'Discoveryland', 'Griflan', 'Book of Happiness', 'Chris Wilcock', 'David Lubofsky',
  'Casa Di Solare', 'Gil Huybrecht', 'Fivepathways', 'Energy Park', 'Outpost', 'Mew', 'Primland',
]);
assert.equal(projects.filter((item) => item.featured).length, 8);
assert.deepEqual(new Set(projects.filter((item) => item.featured).map((item) => item.slug)), new Set(featured.map((item) => item.slug)));
assert.ok(projects.every((item) => item.featured || /^https:\/\//.test(item.link)), 'other projects link to their clients');
console.log('Mobile Full index order and destinations: OK');
