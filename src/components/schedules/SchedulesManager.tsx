import { useState } from 'react';
import SchedulesList from './SchedulesList';
import ScheduleEditor from './ScheduleEditor';

interface SchedulesManagerProps {
  onNavigateHome: () => void;
}

export default function SchedulesManager({ onNavigateHome }: SchedulesManagerProps) {
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  const handleEditSchedule = (scheduleId: string) => {
    setSelectedScheduleId(scheduleId);
  };

  const handleBackToList = () => {
    setSelectedScheduleId(null);
  };

  if (selectedScheduleId) {
    return <ScheduleEditor scheduleId={selectedScheduleId} onBack={handleBackToList} />;
  }

  return <SchedulesList onNavigateHome={onNavigateHome} onEditSchedule={handleEditSchedule} />;
}
