module.exports = function generateTimeSlots(startTime, endTime, interval) {
  const slots = [];
  const toMinutes = (time) => {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  };

  const to24Hour = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  let current = toMinutes(startTime);
  const end = toMinutes(endTime);

  while (current + interval <= end) {
    slots.push(to24Hour(current));
    current += interval;
  }

  return slots;
};
