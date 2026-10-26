import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canRecordControlPointObservation, canUseControlPoint, filterControlPointExams, filterControlPointStudents, getControlPointStatus } from '../src/utils/controlPoint.ts';

test('only an assigned room explicitly authorized by the API can be opened', () => {
  const room = { room_id: '2', room_name: '691B', assistant_id: 25, can_interact: true };
  assert.equal(canUseControlPoint(room, 25), true);
  assert.equal(canUseControlPoint(room, 8), false);
  assert.equal(canUseControlPoint({ ...room, can_interact: false }, 25), false);
  assert.equal(canUseControlPoint({ ...room, assistant_id: null }, 25), false);
});

const exam = {
  exam_id: '15', course_group_id: '3', subject_name: 'Teoría de Autómatas', group: '1',
  exam_type: 'PRIMER PARCIAL', date: '2026-11-10', start_time: '08:00:00', end_time: '09:30:00',
  rooms: [{ room_id: '2', room_name: 'Aula 691B', assistant_id: 25, can_interact: true }], general_rules: [],
};

test('searches enrolled students by name, SIS, and CI without treating eligibility as exam attendance', () => {
  const student = { userId: 25, fullName: 'Álvarez Claros Pedro', studentKey: '202001234', ci: '7891234', status: 'HABILITADO', ineligibilityReason: null };
  assert.deepEqual(filterControlPointStudents([student], 'pedro alvarez'), [student]);
  assert.deepEqual(filterControlPointStudents([student], '202001'), [student]);
  assert.deepEqual(filterControlPointStudents([student], '7891234'), [student]);
  assert.deepEqual(filterControlPointStudents([student], ''), [student]);
  assert.deepEqual(filterControlPointStudents([student], '   '), [student]);
  assert.deepEqual(filterControlPointStudents([student], 'otro'), []);
});

test('exam status respects Bolivia time, exact boundaries, and exams ending the next day', () => {
  assert.equal(getControlPointStatus(exam, Date.parse('2026-11-10T11:59:59Z')), 'Próximamente');
  assert.equal(getControlPointStatus(exam, Date.parse('2026-11-10T12:00:00Z')), 'En curso');
  assert.equal(getControlPointStatus(exam, Date.parse('2026-11-10T13:30:00Z')), 'Finalizado');
  assert.equal(getControlPointStatus({ ...exam, end_time: '' }), 'Sin horario');
  assert.equal(getControlPointStatus({ ...exam, start_time: '23:00:00', end_time: '01:00:00' }, Date.parse('2026-11-11T04:30:00Z')), 'En curso');
});

test('combines search without accents, exam type, status, and the actual course academic term', () => {
  const terms = new Map([['3', '2/2026']]);
  const filters = { search: 'automatas 691b', type: 'PRIMER PARCIAL', status: 'Próximamente', term: '2/2026' };
  assert.deepEqual(filterControlPointExams([exam], filters, terms, Date.parse('2026-11-01T00:00:00Z')), [exam]);
  assert.equal(filterControlPointExams([exam], { ...filters, term: '1/2026' }, terms).length, 0);
  assert.equal(filterControlPointExams([exam], { ...filters, type: 'EXAMEN FINAL' }, terms).length, 0);
  assert.deepEqual(filterControlPointExams([exam], { search: '', type: '', status: '', term: '' }, terms), [exam]);
});

test('observations require eligibility, a resolved student and the currently selected room', () => {
  const response = { success: true, data: { student: { user_id: 101 }, access: { result: 'HABILITADO', assigned_room_id: 2 } } };
  assert.equal(canRecordControlPointObservation(response, [], '2'), true);
  assert.equal(canRecordControlPointObservation(response, [], '1'), false);
  const repeated = { ...response, data: { ...response.data, access: { ...response.data.access, result: 'YA REGISTRÓ INGRESO' } } };
  assert.equal(canRecordControlPointObservation(repeated, [{ userId: 101, status: 'HABILITADO' }], '2'), true);
  assert.equal(canRecordControlPointObservation(repeated, [{ userId: 101, status: 'INHABILITADO' }], '2'), false);
  assert.equal(canRecordControlPointObservation(repeated, [], '2'), false);
  assert.equal(canRecordControlPointObservation({ ...response, data: { ...response.data, access: { result: 'INHABILITADO', assigned_room_id: 2 } } }, [], '2'), false);
});
