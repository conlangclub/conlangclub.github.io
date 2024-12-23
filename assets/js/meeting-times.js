(function () {
  const DateTime = luxon.DateTime;
  const Duration = luxon.Duration;

  const meetingInterval = Duration.fromObject({weeks:2});
  const meetingEpoch = DateTime.fromISO('2024-10-27T17:00:00', {zone: 'America/Los_Angeles'});
  const now = DateTime.now();

  let nextMeetingDate = meetingEpoch;
  while (now > nextMeetingDate) {
    nextMeetingDate = nextMeetingDate.plus(meetingInterval);
  }

  document.getElementById('meeting-date').textContent = nextMeetingDate.toLocaleString({ weekday: 'long', month: 'long', day: 'numeric' });
})();