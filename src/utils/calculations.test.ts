import { describe, it, expect } from 'vitest'
import * as calc from './calculations'
import type { VacationRequest } from '@/domain/types'
import { DEPARTMENTS } from '@/data/employees'

const TEST_EMPLOYEES = [
  { id: 'e1', deptId: 'tech', startDate: '2025-01-01' },
  { id: 'e2', deptId: 'tech', startDate: '2025-01-01' },
]

const baseRequests: VacationRequest[] = [
  {
    id: 'r1',
    employeeId: 'e1',
    year: 2025,
    status: 'approved',
    days: 5,
    startDate: '2025-01-10',
    endDate: '2025-01-14',
    requestDate: '2025-01-01',
    reason: '',
    type: 'vacation',
    backup: null,
  },
  {
    id: 'r2',
    employeeId: 'e1',
    year: 2025,
    status: 'pending',
    days: 3,
    startDate: '2025-03-10',
    endDate: '2025-03-12',
    requestDate: '2025-03-01',
    reason: '',
    type: 'vacation',
    backup: null,
  },
]

describe('calculations', () => {
  it('calculates balance correctly', () => {
    const balance = calc.calculateBalance('e1', 2025, baseRequests, '2025-01-01')
    expect(balance.used).toBe(5)
    expect(balance.pending).toBe(3)
    expect(balance.total).toBeGreaterThan(0)
    expect(balance.available).toBe(balance.total - 5 - 3)
  })

  it('analyzes requests and returns structure', () => {
    const request = baseRequests[0]
    const analysis = calc.analyzeRequest(request, baseRequests, TEST_EMPLOYEES)
    expect(analysis).toHaveProperty('alerts')
    expect(analysis).toHaveProperty('warnings')
    expect(analysis).toHaveProperty('info')
  })

  it('gets department stats', () => {
    const techDept = DEPARTMENTS.find((d) => d.id === 'tech')!
    const stats = calc.getDepartmentStats(techDept, 2025, baseRequests, TEST_EMPLOYEES)
    expect(stats.employeeCount).toBeGreaterThan(0)
    expect(stats.totalDays).toBeGreaterThan(0)
    expect(stats.usagePercent).toBeGreaterThanOrEqual(0)
  })

  it('non-deducting absence types (remote/sick/medical) do NOT reduce vacation balance', () => {
    const remoteRequest: VacationRequest = {
      id: 'remote-1',
      employeeId: 'e1',
      year: 2025,
      status: 'pending',
      days: 1,
      startDate: '2025-04-30',
      endDate: '2025-04-30',
      requestDate: '2025-04-15',
      reason: 'Teletrabajo',
      type: 'remote',
      backup: null,
    }
    const balance = calc.calculateBalance('e1', 2025, [remoteRequest], '2025-01-01')
    expect(balance.pending).toBe(0)
    expect(balance.used).toBe(0)
    expect(balance.available).toBe(balance.total)
  })

  it('mixes deducting and non-deducting requests correctly', () => {
    const requests: VacationRequest[] = [
      {
        id: 'vac-1',
        employeeId: 'e1',
        year: 2025,
        status: 'approved',
        days: 5,
        startDate: '2025-08-01',
        endDate: '2025-08-05',
        requestDate: '2025-07-01',
        reason: '',
        type: 'vacation',
        backup: null,
      },
      {
        id: 'remote-1',
        employeeId: 'e1',
        year: 2025,
        status: 'pending',
        days: 3,
        startDate: '2025-09-01',
        endDate: '2025-09-03',
        requestDate: '2025-08-15',
        reason: '',
        type: 'remote',
        backup: null,
      },
      {
        id: 'sick-1',
        employeeId: 'e1',
        year: 2025,
        status: 'approved',
        days: 2,
        startDate: '2025-03-10',
        endDate: '2025-03-11',
        requestDate: '2025-03-10',
        reason: '',
        type: 'sick',
        backup: null,
      },
    ]
    const balance = calc.calculateBalance('e1', 2025, requests, '2025-01-01')
    expect(balance.used).toBe(5)
    expect(balance.pending).toBe(0)
    expect(balance.available).toBe(balance.total - 5)
  })

  it('applies carry-over from previous year', () => {
    const requests: VacationRequest[] = [
      {
        id: 'r-prev',
        employeeId: 'e1',
        year: 2025,
        status: 'approved',
        days: 10,
        startDate: '2025-06-01',
        endDate: '2025-06-10',
        requestDate: '2025-05-15',
        reason: '',
        type: 'vacation',
        backup: null,
      },
    ]
    const balance = calc.calculateBalance('e1', 2026, requests, '2024-01-01')
    expect(balance.carryOver).toBe(13)
    expect(balance.total).toBe(23 + 13)
  })
})


