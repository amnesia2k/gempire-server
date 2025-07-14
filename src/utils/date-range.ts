export function generateDateLabels(period: "month" | "week" | "day"): string[] {
  const labels: string[] = [];
  const now = new Date();

  if (period === "month") {
    const formatter = new Intl.DateTimeFormat("en-US", { month: "long" });
    for (let m = 0; m < 12; m++) {
      const date = new Date(now.getFullYear(), m);
      labels.push(formatter.format(date)); // "January", "February", etc.
    }
  } else if (period === "week") {
    const seen = new Set<string>();
    const date = new Date(now.getFullYear(), now.getMonth(), 1);
    while (date.getMonth() === now.getMonth()) {
      const weekLabel = getISOWeekLabel(date); // "Week 27", etc.
      if (!seen.has(weekLabel)) {
        seen.add(weekLabel);
        labels.push(weekLabel);
      }
      date.setDate(date.getDate() + 1);
    }
  } else {
    const formatter = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short", // "07 Jul"
    });

    const date = new Date(now.getFullYear(), now.getMonth(), 1);
    while (date.getMonth() === now.getMonth()) {
      labels.push(formatter.format(date)); // "03 Jul"
      date.setDate(date.getDate() + 1);
    }
  }

  return labels;
}

function getISOWeekLabel(date: Date): string {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);

  // Set to nearest Thursday: current date + 4 - current day number
  const day = tempDate.getDay();
  tempDate.setDate(tempDate.getDate() + 4 - (day === 0 ? 7 : day));

  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );

  return `Week ${weekNo}`;
}
