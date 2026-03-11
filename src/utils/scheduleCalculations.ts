import { ScheduleHoliday } from '../types/schedule';

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(date: Date, holidays: ScheduleHoliday[]): boolean {
  const dateStr = formatDate(date);
  return holidays.some(h => h.holiday_date === dateStr);
}

export function isWorkingDay(
  date: Date,
  considerWeekends: boolean,
  holidays: ScheduleHoliday[]
): boolean {
  if (isHoliday(date, holidays)) return false;
  if (!considerWeekends && isWeekend(date)) return false;
  return true;
}

export function addWorkingDays(
  startDate: Date,
  days: number,
  considerWeekends: boolean,
  holidays: ScheduleHoliday[]
): Date {
  const result = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);
    if (isWorkingDay(result, considerWeekends, holidays)) {
      daysAdded++;
    }
  }

  return result;
}

export function calculateDuration(
  startDate: Date,
  endDate: Date,
  considerWeekends: boolean,
  holidays: ScheduleHoliday[]
): number {
  if (startDate > endDate) return 0;

  let duration = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    if (isWorkingDay(current, considerWeekends, holidays)) {
      duration++;
    }
    current.setDate(current.getDate() + 1);
  }

  return duration;
}

export function calculateEndDate(
  startDate: Date,
  duration: number,
  considerWeekends: boolean,
  holidays: ScheduleHoliday[]
): Date {
  if (duration === 0) return startDate;
  return addWorkingDays(startDate, duration - 1, considerWeekends, holidays);
}

export function calculateStartDate(
  endDate: Date,
  duration: number,
  considerWeekends: boolean,
  holidays: ScheduleHoliday[]
): Date {
  if (duration === 0) return endDate;

  const result = new Date(endDate);
  let daysSubtracted = 0;

  while (daysSubtracted < duration - 1) {
    result.setDate(result.getDate() - 1);
    if (isWorkingDay(result, considerWeekends, holidays)) {
      daysSubtracted++;
    }
  }

  return result;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateString: string | null): Date | null {
  if (!dateString) return null;
  return new Date(dateString + 'T00:00:00');
}

export interface PredecessorRelation {
  taskNumber: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
}

export function parsePredecessors(predecessorsStr: string): PredecessorRelation[] {
  if (!predecessorsStr || !predecessorsStr.trim()) return [];

  const parts = predecessorsStr.split(',').map(p => p.trim()).filter(p => p);
  const relations: PredecessorRelation[] = [];

  for (const part of parts) {
    const relation = parseSinglePredecessor(part);
    if (relation) {
      relations.push(relation);
    }
  }

  return relations;
}

export function parseSinglePredecessor(predecessorStr: string): PredecessorRelation | null {
  if (!predecessorStr) return null;

  const regex = /^(\d+(?:\.\d+)?)(FS|SS|FF|SF)?([+-]\d+d?)?$/i;
  const match = predecessorStr.trim().match(regex);

  if (match) {
    const taskNumber = match[1];
    const type = (match[2]?.toUpperCase() || 'FS') as 'FS' | 'SS' | 'FF' | 'SF';
    const lagStr = match[3];

    let lagDays = 0;
    if (lagStr) {
      const lagMatch = lagStr.match(/([+-])(\d+)/);
      if (lagMatch) {
        const sign = lagMatch[1] === '+' ? 1 : -1;
        lagDays = sign * parseInt(lagMatch[2]);
      }
    }

    return { taskNumber, type, lagDays };
  }

  const simpleMatch = predecessorStr.trim().match(/^(\d+(?:\.\d+)?)$/);
  if (simpleMatch) {
    return { taskNumber: simpleMatch[1], type: 'FS', lagDays: 0 };
  }

  return null;
}

export function calculateDateFromPredecessor(
  predecessorStartDate: Date | null,
  predecessorEndDate: Date | null,
  relation: PredecessorRelation,
  taskDuration: number,
  considerWeekends: boolean,
  holidays: ScheduleHoliday[]
): { startDate: Date; endDate: Date } | null {
  if (!predecessorStartDate || !predecessorEndDate) return null;

  let calculatedStart: Date;

  switch (relation.type) {
    case 'FS':
      calculatedStart = new Date(predecessorEndDate);
      calculatedStart.setDate(calculatedStart.getDate() + 1);

      if (relation.lagDays !== 0) {
        if (relation.lagDays > 0) {
          calculatedStart = addWorkingDays(calculatedStart, relation.lagDays, considerWeekends, holidays);
        } else {
          calculatedStart = subtractWorkingDays(calculatedStart, Math.abs(relation.lagDays), considerWeekends, holidays);
        }
      }
      break;

    case 'SS':
      calculatedStart = new Date(predecessorStartDate);

      if (relation.lagDays !== 0) {
        if (relation.lagDays > 0) {
          calculatedStart = addWorkingDays(calculatedStart, relation.lagDays, considerWeekends, holidays);
        } else {
          calculatedStart = subtractWorkingDays(calculatedStart, Math.abs(relation.lagDays), considerWeekends, holidays);
        }
      }
      break;

    case 'FF':
      const calculatedEnd = new Date(predecessorEndDate);

      let adjustedEnd = calculatedEnd;
      if (relation.lagDays !== 0) {
        if (relation.lagDays > 0) {
          adjustedEnd = addWorkingDays(calculatedEnd, relation.lagDays, considerWeekends, holidays);
        } else {
          adjustedEnd = subtractWorkingDays(calculatedEnd, Math.abs(relation.lagDays), considerWeekends, holidays);
        }
      }

      calculatedStart = calculateStartDate(adjustedEnd, taskDuration, considerWeekends, holidays);
      break;

    case 'SF':
      calculatedStart = new Date(predecessorStartDate);
      calculatedStart.setDate(calculatedStart.getDate() - taskDuration + 1);

      if (relation.lagDays !== 0) {
        if (relation.lagDays > 0) {
          calculatedStart = addWorkingDays(calculatedStart, relation.lagDays, considerWeekends, holidays);
        } else {
          calculatedStart = subtractWorkingDays(calculatedStart, Math.abs(relation.lagDays), considerWeekends, holidays);
        }
      }
      break;
  }

  const calculatedEndDate = calculateEndDate(calculatedStart, taskDuration, considerWeekends, holidays);

  return {
    startDate: calculatedStart,
    endDate: calculatedEndDate
  };
}

function subtractWorkingDays(
  startDate: Date,
  days: number,
  considerWeekends: boolean,
  holidays: ScheduleHoliday[]
): Date {
  const result = new Date(startDate);
  let daysSubtracted = 0;

  while (daysSubtracted < days) {
    result.setDate(result.getDate() - 1);
    if (isWorkingDay(result, considerWeekends, holidays)) {
      daysSubtracted++;
    }
  }

  return result;
}

export function detectCircularDependency(
  taskNumber: string,
  allTasks: Array<{ itemNumber: string; predecessors: string }>,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(taskNumber)) return true;

  visited.add(taskNumber);

  const task = allTasks.find(t => t.itemNumber === taskNumber);
  if (!task) return false;

  const predecessors = parsePredecessors(task.predecessors);

  for (const pred of predecessors) {
    if (detectCircularDependency(pred.taskNumber, allTasks, new Set(visited))) {
      return true;
    }
  }

  return false;
}
