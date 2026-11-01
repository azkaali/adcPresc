import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Medicine } from '../shared/types.ts';
import { buildIndex, searchMedicines, type SearchMode } from '../src/lib/search.ts';

const medicine = (id: number, brand: string, generic: string, strength: string, usage = 0): Medicine => ({
  id,
  brand_name: brand,
  generic_name: generic,
  strength,
  form: 'Tablet',
  manufacturer: '',
  usage_count: usage,
  last_use: null,
});

const index = buildIndex([
  medicine(1, 'Plaquenil', 'Hydroxychloroquine', '200 mg'),
  medicine(2, 'Arcoxia', 'Etoricoxib', '60 mg'),
  medicine(3, 'Arcoxia', 'Etoricoxib', '90 mg', 5),
  medicine(4, 'Panadol', 'Paracetamol', '500 mg', 2),
  medicine(5, 'Panadol Extra', 'Paracetamol + Caffeine', '500 mg'),
  medicine(6, 'Co-Amoxiclav', 'Amoxicillin + Clavulanic acid', '625 mg'),
]);

const find = (query: string, mode: SearchMode = 'brand') =>
  searchMedicines(index, query, mode).map((m) => `${m.brand_name} ${m.strength}`);

test('brand search puts the more-prescribed strength first', () => {
  assert.deepEqual(find('arc'), ['Arcoxia 90 mg', 'Arcoxia 60 mg']);
});

test('extra words narrow the results by strength', () => {
  assert.deepEqual(find('arcoxia 60'), ['Arcoxia 60 mg']);
});

test('generic search matches generic names only', () => {
  assert.deepEqual(find('paracet', 'generic'), ['Panadol 500 mg', 'Panadol Extra 500 mg']);
  assert.deepEqual(find('paracet', 'brand'), []);
  assert.deepEqual(find('clavulanic', 'generic'), ['Co-Amoxiclav 625 mg']);
});

test('punctuation is ignored and missing letters are tolerated', () => {
  assert.deepEqual(find('coamox'), ['Co-Amoxiclav 625 mg']);
  assert.deepEqual(find('plaqunil'), ['Plaquenil 200 mg']);
  assert.deepEqual(find('hydroxychlorquine', 'generic'), ['Plaquenil 200 mg']);
});

test('an empty query lists the most prescribed medicines first', () => {
  assert.deepEqual(
    searchMedicines(index, '', 'brand').slice(0, 2).map((m) => m.id),
    [3, 4],
  );
});
